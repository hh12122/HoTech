# UC-A01 — Créer un cours

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-A01 |
| **Titre** | Créer un cours |
| **Acteur principal** | Administrateur |
| **Pré-conditions** | L'administrateur est authentifié et possède le rôle `admin` |
| **Déclencheur** | L'administrateur clique sur "Nouveau cours" dans le Course Builder |

## Scénario principal (Happy Path)

1. L'administrateur accède à la page de création de cours via le Course Builder.
2. Le système affiche le formulaire vide avec les champs : titre, description, pôle, langues.
3. L'administrateur remplit le titre du cours.
4. L'administrateur rédige la description du cours.
5. L'administrateur sélectionne le pôle (Assurance, Téléphonie ou Énergie).
6. L'administrateur choisit les langues disponibles parmi FR, DE, EN.
7. L'administrateur soumet le formulaire.
8. Le système valide les données et crée le cours avec le statut « brouillon » (draft).
9. Le système redirige l'administrateur vers la page d'édition du cours créé.

## Extensions (Cas alternatifs / Erreurs)

- **1a** — Titre manquant ou trop court :
  1. Le système affiche une erreur de validation sur le champ titre.
  2. L'administrateur corrige et resoumet.

- **1b** — Pôle non sélectionné :
  1. Le système affiche une erreur de validation sur le champ pôle.
  2. L'administrateur sélectionne un pôle et resoumet.

- **1c** — Aucune langue sélectionnée :
  1. Le système affiche une erreur de validation sur le champ langues.
  2. L'administrateur sélectionne au moins une langue et resoumet.

- **1d** — Titre déjà existant (slug en double) :
  1. Le système détecte un conflit de slug unique.
  2. Le système affiche une erreur indiquant qu'un cours avec ce titre existe déjà.

## Post-conditions

- Un nouveau cours existe en base de données avec le statut `draft`.
- Un slug unique est généré à partir du titre.
- Le cours est associé au pôle et aux langues sélectionnés.

## Règles métier

- Un cours est toujours créé en statut `draft` ; la publication est une action séparée.
- Le slug est généré automatiquement à partir du titre et doit être unique.
- Au moins une langue doit être sélectionnée.
- Le pôle est obligatoire et détermine les règles de certification (voir UC-A10).

## Implémentation technique

### Modèles Eloquent
- `Course` — `app/Models/Course.php` — champs : `id`, `title`, `description`, `pole` (enum: assurance, telephonie, energie), `languages` (json: ['fr','de','en']), `status` (enum: draft, published), `slug` (unique). Relations : `hasMany(Module::class)`, `hasMany(Enrollment::class)`. Scopes : `scopePublished()`, `scopeDraft()`.

### Migrations
- `create_courses_table` — colonnes : `id` (bigIncrements), `title` (string), `description` (text), `pole` (string, enum), `languages` (json), `status` (string, default 'draft'), `slug` (string, unique), `timestamps`. Index : `index('pole')`, `index('status')`, `unique('slug')`.
- `add_role_to_users_table` — colonne : `role` (string, enum: admin/learner, default 'learner'). Index : `index('role')`.

### DTO / Response
- `CourseFormData` — `app/DTOs/Admin/CourseFormData.php` — readonly class, propriétés typées, `empty()` et `fromModel()` static factories.
- Convention : contrôleurs retournent UNIQUEMENT des DTOs comme props Inertia, jamais des modèles Eloquent.
- Pattern :
  ```php
  readonly class CourseFormData {
      /**
       * @param string[] $languages
       */
      public function __construct(
          public ?int $id,
          public string $title,
          public string $description,
          public string $pole,
          public array $languages,
          public string $status,
      ) {}

      public static function empty(): self
      {
          return new self(
              id: null,
              title: '',
              description: '',
              pole: '',
              languages: [],
              status: 'draft',
          );
      }

      public static function fromModel(Course $course): self
      {
          return new self(
              id: $course->id,
              title: $course->title,
              description: $course->description,
              pole: $course->pole,
              languages: $course->languages,
              status: $course->status,
          );
      }
  }
  ```

### Form Request(s)
- `StoreCourseRequest` et `UpdateCourseRequest` — `app/Http/Requests/Admin/`
  - `prepareForValidation()` : nettoie les données (ex. : `trim` du titre).
  - `rules()` : validation stricte des champs (`title`, `description`, `pole`, `languages`).
  - `passedValidation()` : génère le slug automatiquement à partir du titre nettoyé en le fusionnant aux données validées (`$this->merge(['slug' => Str::slug($this->title)])`).

### Contrôleur(s)
- `Admin\CourseController` — `app/Http/Controllers/Admin/CourseController.php` — méthodes :
  - `create()` : retourne `Inertia::render('admin/courses/create', ['form' => CourseFormData::empty()])`.
  - `store(StoreCourseRequest $request)` : utilise `$request->validated()`, crée le `Course` (la logique de slug est gérée dans la Form Request) et redirige vers `admin.courses.edit`. Ce contrôleur ne doit effectuer aucune transformation manuelle ni utiliser `$request->all()` ou `Validator::make()`.

### Routes
- `GET /admin/courses/create` — nom : `admin.courses.create`, middleware : `auth, admin`
- `POST /admin/courses` — nom : `admin.courses.store`, middleware : `auth, admin`

### Page(s) React (Inertia)
- `resources/js/pages/admin/courses/create.tsx` — TypeScript interface miroir du DTO :
  ```typescript
  interface CourseFormData {
      id: number | null;
      title: string;
      description: string;
      pole: string;
      languages: string[];
      status: string;
  }

  interface CreateCoursePageProps {
      form: CourseFormData;
  }
  ```
  **Bonnes pratiques React Expert & Inertia** (voir `docs/CONVENTIONS.md`) :
  - Utilisation du hook fortement typé `const { data, setData, post, processing, errors } = useForm<CourseFormData>(form);`.
  - Accessibilité (a11y) : les champs en erreur utilisent `aria-invalid` et `aria-describedby` liés aux `errors` retournées par Inertia.
  - Le bouton de soumission utilise `disabled={processing}` pour éviter les doubles soumissions.
  - Composants clés : `<CourseForm>` sémantique (fieldset, legend) découpé pour éviter les re-rendus.

### Service(s) / Action(s)
- `EnsureAdmin` — `app/Http/Middleware/EnsureAdmin.php` — middleware vérifiant `$user->role === 'admin'`, retourne `403` si non-admin. Enregistré dans `bootstrap/app.php`.

### Dépendances externes
- Aucune
