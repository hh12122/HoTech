# UC-A08 — Gérer les comptes apprenants

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-A08 |
| **Titre** | Gérer les comptes apprenants |
| **Acteur principal** | Administrateur |
| **Pré-conditions** | L'administrateur est authentifié avec le rôle `admin` |
| **Déclencheur** | L'administrateur accède à la section « Apprenants » du back-office |

## Scénario principal (Happy Path)

1. L'administrateur accède à la liste des apprenants.
2. Le système affiche une liste paginée des apprenants avec : nom, email, statut (actif/inactif), nombre de cours inscrits, date de création.
3. L'administrateur recherche un apprenant par nom ou email.
4. L'administrateur clique sur un apprenant pour voir son détail.
5. Le système affiche le profil complet : informations personnelles, cours inscrits, progression par cours, résultats des quiz, dernière connexion.
6. L'administrateur peut activer ou désactiver le compte de l'apprenant.

## Extensions (Cas alternatifs / Erreurs)

- **2a** — Aucun apprenant enregistré :
  1. Le système affiche un message « Aucun apprenant enregistré ».

- **3a** — Recherche sans résultat :
  1. Le système affiche un message « Aucun apprenant trouvé pour cette recherche ».
  2. L'administrateur ajuste les termes de recherche.

- **6a** — Désactivation d'un compte actif :
  1. Le système marque le compte comme inactif (`is_active = false`).
  2. L'apprenant ne peut plus se connecter.
  3. Le système redirige vers la page de détail avec confirmation.

- **6b** — Réactivation d'un compte inactif :
  1. Le système marque le compte comme actif (`is_active = true`).
  2. L'apprenant peut à nouveau se connecter.

- **7a** — Création manuelle d'un apprenant (hors flux CRM) :
  1. L'administrateur clique sur « Ajouter un apprenant ».
  2. L'administrateur remplit le formulaire : nom, email, mot de passe temporaire, langue.
  3. Le système crée le compte et envoie un email d'invitation.

## Post-conditions

- La liste des apprenants est affichée avec les informations à jour.
- Si un compte a été activé/désactivé, le statut est mis à jour en base.
- Si un apprenant a été créé manuellement, le compte existe en base avec un mot de passe temporaire.

## Règles métier

- Un compte désactivé empêche la connexion mais ne supprime pas les données (progression, quiz).
- La recherche porte sur les champs `name` et `email`.
- La liste est triée par date de création décroissante par défaut.
- La création manuelle est une alternative au flux automatique par webhook CRM (UC-M01).

## Implémentation technique

### Modèles Eloquent
- `User` — `app/Models/User.php` — champs ajoutés : `is_active` (boolean, default true), `role` (enum: admin, learner), `locale` (enum: fr, de, en). Relations : `hasMany(Enrollment::class)`, `hasMany(LessonProgress::class)`, `hasMany(QuizAttempt::class)`. Scopes : `scopeActive()` → `where('is_active', true)`, `scopeLearners()` → `where('role', 'learner')`, `scopeSearch(string $term)` → `where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%")`.

### Migrations
- `add_is_active_to_users_table` — colonne : `is_active` (boolean, default true). Index : `index('is_active')`.
- `add_locale_to_users_table` — colonne : `locale` (string, default 'fr'). Voir aussi UC-L09.
- `add_role_to_users_table` — colonne : `role` (string, default 'learner'). Voir aussi UC-A01.

### DTO / Response
- `StudentListData` — `app/DTOs/Admin/StudentListData.php` — readonly class, propriétés typées, `fromModel()` static factory.
- `StudentDetailData` — `app/DTOs/Admin/StudentDetailData.php` — readonly class, propriétés typées, `fromModel()` static factory.
- `StudentEnrollmentData` — `app/DTOs/Admin/StudentEnrollmentData.php` — readonly class (détail d'inscription par apprenant).
- Convention : contrôleurs retournent UNIQUEMENT des DTOs comme props Inertia, jamais des modèles Eloquent.
- Pattern :
  ```php
  readonly class StudentListData {
      public function __construct(
          public int $id,
          public string $name,
          public string $email,
          public bool $isActive,
          public int $enrolledCoursesCount,
          public string $createdAt,
      ) {}

      public static function fromModel(User $user): self
      {
          return new self(
              id: $user->id,
              name: $user->name,
              email: $user->email,
              isActive: $user->is_active,
              enrolledCoursesCount: $user->enrollments_count ?? $user->enrollments()->count(),
              createdAt: $user->created_at->toIso8601String(),
          );
      }

      /**
       * @param \Illuminate\Support\Collection<User> $users
       * @return self[]
       */
      public static function fromCollection(\Illuminate\Support\Collection $users): array
      {
          return $users->map(fn (User $user) => self::fromModel($user))->all();
      }
  }
  ```

  ```php
  readonly class StudentDetailData {
      /**
       * @param StudentEnrollmentData[] $enrollments
       */
      public function __construct(
          public int $id,
          public string $name,
          public string $email,
          public bool $isActive,
          public string $locale,
          public array $enrollments,
          public string $createdAt,
          public ?string $lastLoginAt,
      ) {}

      public static function fromModel(User $user): self
      {
          return new self(
              id: $user->id,
              name: $user->name,
              email: $user->email,
              isActive: $user->is_active,
              locale: $user->locale,
              enrollments: $user->enrollments->map(
                  fn (Enrollment $e) => new StudentEnrollmentData(
                      courseId: $e->course_id,
                      courseTitle: $e->course->title,
                      pole: $e->course->pole,
                      progressPercent: $e->progressPercent($user),
                      enrolledAt: $e->enrolled_at->toIso8601String(),
                  )
              )->all(),
              createdAt: $user->created_at->toIso8601String(),
              lastLoginAt: $user->last_login_at?->toIso8601String(),
          );
      }
  }
  ```

  ```php
  readonly class StudentEnrollmentData {
      public function __construct(
          public int $courseId,
          public string $courseTitle,
          public string $pole,
          public int $progressPercent,
          public string $enrolledAt,
      ) {}
  }
  ```

### Form Request(s)
- `StoreStudentRequest` (et `UpdateStudentRequest`) — `app/Http/Requests/Admin/`
  - `prepareForValidation()` : normalise l'email (ex. : `strtolower($this->email)`).
  - `rules()` : valide le nom (`required, string`), l'email (`required, email, unique:users`), et la langue (`required, in:fr,de,en`).
  - `passedValidation()` : génère un mot de passe temporaire si absent en le fusionnant aux données validées (`$this->merge(['password' => Hash::make(Str::random(12))])`).

### Contrôleur(s)
- `Admin\StudentController` — `app/Http/Controllers/Admin/StudentController.php` — méthodes :
  - `index(Request $request)` : filtre par `search` et `status` (active/inactive), pagine, retourne `Inertia::render('admin/students/index', ['students' => StudentListData::fromCollection($users), 'filters' => $filters, 'pagination' => $paginationMeta])`.
  - `show(User $user)` : retourne `Inertia::render('admin/students/show', ['student' => StudentDetailData::fromModel($user)])`.
  - `toggleActive(User $user)` : bascule `is_active`, retourne `redirect()->back()`.
  - `store(StoreStudentRequest $request)` : utilise `$request->validated()` pour créer un apprenant manuellement (les transformations comme la génération du mot de passe sont gérées par la Form Request), retourne `redirect()->route('admin.students.index')`. Le contrôleur ne fait aucune validation ni manipulation manuelle.

### Routes
- `GET /admin/students` — nom : `admin.students.index`, middleware : `auth, admin`
- `GET /admin/students/{user}` — nom : `admin.students.show`, middleware : `auth, admin`
- `PUT /admin/students/{user}/toggle-active` — nom : `admin.students.toggle-active`, middleware : `auth, admin`
- `POST /admin/students` — nom : `admin.students.store`, middleware : `auth, admin`

### Page(s) React (Inertia)
- `resources/js/pages/admin/students/index.tsx` — TypeScript interfaces :
  ```typescript
  interface StudentListData {
      id: number;
      name: string;
      email: string;
      isActive: boolean;
      enrolledCoursesCount: number;
      createdAt: string;
  }

  interface StudentIndexPageProps {
      students: StudentListData[];
      filters: { search?: string; status?: string };
      pagination: { currentPage: number; lastPage: number; total: number };
  }
  ```
  Composants clés : `<StudentTable>` avec colonnes triables, `<SearchBar>`, `<StatusFilter>`, pagination, bouton « Ajouter un apprenant ».

- `resources/js/pages/admin/students/show.tsx` — TypeScript interfaces :
  ```typescript
  interface StudentDetailData {
      id: number;
      name: string;
      email: string;
      isActive: boolean;
      locale: string;
      enrollments: StudentEnrollmentData[];
      createdAt: string;
      lastLoginAt: string | null;
  }

  interface StudentEnrollmentData {
      courseId: number;
      courseTitle: string;
      pole: string;
      progressPercent: number;
      enrolledAt: string;
  }

  interface StudentShowPageProps {
      student: StudentDetailData;
  }
  ```
  Composants clés : `<StudentProfile>` avec informations personnelles, bouton activer/désactiver, `<EnrollmentList>` avec progression par cours.

### Service(s) / Action(s)
- Aucun service dédié — la logique est dans le contrôleur.

### Dépendances externes
- Aucune
