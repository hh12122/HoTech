# UC-A02 — Gérer les modules et leçons (drag & drop)

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-A02 |
| **Titre** | Gérer les modules et leçons (drag & drop) |
| **Acteur principal** | Administrateur |
| **Pré-conditions** | L'administrateur est authentifié avec le rôle `admin` ; le cours existe en base |
| **Déclencheur** | L'administrateur ouvre la page d'édition d'un cours |

## Scénario principal (Happy Path)

1. L'administrateur accède à la page d'édition du cours.
2. Le système affiche la liste des modules et leurs leçons dans l'ordre actuel (`sort_order`).
3. L'administrateur ajoute un nouveau module en saisissant son titre.
4. L'administrateur ajoute des leçons à un module.
5. L'administrateur réordonne les modules par glisser-déposer (drag & drop).
6. L'administrateur réordonne les leçons au sein d'un module par glisser-déposer.
7. Le système envoie les nouveaux ordres au serveur.
8. Le serveur met à jour les champs `sort_order` de chaque module/leçon.
9. Le système confirme la sauvegarde.

## Extensions (Cas alternatifs / Erreurs)

- **3a** — Titre du module vide :
  1. Le système affiche une erreur de validation.
  2. L'administrateur corrige le titre et resoumet.

- **4a** — Titre de la leçon vide :
  1. Le système affiche une erreur de validation.
  2. L'administrateur corrige et resoumet.

- **5a** — Erreur réseau lors de la sauvegarde de l'ordre :
  1. Le système affiche un message d'erreur.
  2. L'administrateur réessaye le glisser-déposer.

- **6a** — Suppression d'un module contenant des leçons :
  1. Le système demande confirmation avant suppression.
  2. Si confirmé, le module et ses leçons sont supprimés (cascade).

## Post-conditions

- Les modules et leçons du cours sont ordonnés selon le `sort_order` défini par l'administrateur.
- Tout nouveau module/leçon est persisté en base.
- L'ordre détermine la progression linéaire des apprenants.

## Règles métier

- L'ordre des modules définit la progression linéaire imposée aux apprenants (voir UC-L07).
- Un module doit avoir un titre non vide.
- Une leçon doit avoir un titre non vide.
- La suppression d'un module supprime en cascade toutes ses leçons.

## Implémentation technique

### Modèles Eloquent
- `Module` — `app/Models/Module.php` — champs : `id`, `course_id`, `title`, `sort_order` (integer). Relations : `belongsTo(Course::class)`, `hasMany(Lesson::class)`, `hasOne(Quiz::class)`. Scopes : `scopeOrdered()` → `orderBy('sort_order')`.
- `Lesson` — `app/Models/Lesson.php` — champs : `id`, `module_id`, `title`, `sort_order` (integer), `video_provider` (enum: bunny, cloudflare, nullable), `video_id` (string, nullable), `duration_seconds` (integer, default 0). Relations : `belongsTo(Module::class)`, `hasMany(LessonProgress::class)`. Scopes : `scopeOrdered()` → `orderBy('sort_order')`.

### Migrations
- `create_modules_table` — colonnes : `id` (bigIncrements), `course_id` (foreignId, constrained, cascadeOnDelete), `title` (string), `sort_order` (integer, default 0), `timestamps`. Index : `index('course_id')`, `index('sort_order')`.
- `create_lessons_table` — colonnes : `id` (bigIncrements), `module_id` (foreignId, constrained, cascadeOnDelete), `title` (string), `sort_order` (integer, default 0), `video_provider` (string, nullable), `video_id` (string, nullable), `duration_seconds` (integer, default 0), `timestamps`. Index : `index('module_id')`, `index('sort_order')`.

### DTO / Response
- `CourseEditData` — `app/DTOs/Admin/CourseEditData.php` — readonly class, propriétés typées, `fromModel()` static factory.
- `ModuleEditData` — `app/DTOs/Admin/ModuleEditData.php` — readonly class.
- `LessonEditData` — `app/DTOs/Admin/LessonEditData.php` — readonly class.
- Convention : contrôleurs retournent UNIQUEMENT des DTOs comme props Inertia, jamais des modèles Eloquent.
- Pattern :
  ```php
  readonly class CourseEditData {
      /**
       * @param ModuleEditData[] $modules
       */
      public function __construct(
          public int $id,
          public string $title,
          public array $modules,
      ) {}

      public static function fromModel(Course $course): self
      {
          return new self(
              id: $course->id,
              title: $course->title,
              modules: $course->modules()
                  ->ordered()
                  ->with('lessons')
                  ->get()
                  ->map(fn (Module $m) => new ModuleEditData(
                      id: $m->id,
                      title: $m->title,
                      sortOrder: $m->sort_order,
                      lessons: $m->lessons()
                          ->ordered()
                          ->get()
                          ->map(fn (Lesson $l) => new LessonEditData(
                              id: $l->id,
                              title: $l->title,
                              sortOrder: $l->sort_order,
                              hasVideo: $l->video_id !== null,
                          ))->all(),
                  ))->all(),
          );
      }
  }
  ```

  ```php
  readonly class ModuleEditData {
      /**
       * @param LessonEditData[] $lessons
       */
      public function __construct(
          public int $id,
          public string $title,
          public int $sortOrder,
          public array $lessons,
      ) {}
  }
  ```

  ```php
  readonly class LessonEditData {
      public function __construct(
          public int $id,
          public string $title,
          public int $sortOrder,
          public bool $hasVideo,
      ) {}
  }
  ```

### Form Request(s)
- `StoreModuleRequest` et `UpdateModuleRequest` — valident le `title` (requis, string).
- `StoreLessonRequest` et `UpdateLessonRequest` — valident le `title` (requis, string).
- `ReorderModulesRequest` et `ReorderLessonsRequest` — valident le tableau d'identifiants (`ids` : array requis, chaque élément doit exister dans la table correspondante).

### Contrôleur(s)
- `Admin\CourseController` — `app/Http/Controllers/Admin/CourseController.php` — méthode `edit(Course $course)` : retourne `Inertia::render('admin/courses/edit', ['course' => CourseEditData::fromModel($course)])`.
- `Admin\ModuleController` — `app/Http/Controllers/Admin/ModuleController.php` — méthodes :
  - `store(Course $course, StoreModuleRequest $request)` : utilise `$request->validated()` pour créer un module, retourne `redirect()->back()`.
  - `update(Module $module, UpdateModuleRequest $request)` : utilise `$request->validated()` pour mettre à jour le titre, retourne `redirect()->back()`.
  - `destroy(Module $module)` : supprime le module et ses leçons (cascade), retourne `redirect()->back()`.
  - `reorder(ReorderModulesRequest $request)` : utilise `$request->validated()` (reçoit `{ ids: [3, 1, 2] }`), met à jour `sort_order`, retourne `redirect()->back()`.
- `Admin\LessonController` — `app/Http/Controllers/Admin/LessonController.php` — méthodes :
  - `store(Module $module, StoreLessonRequest $request)` : utilise `$request->validated()` pour créer une leçon, retourne `redirect()->back()`.
  - `update(Lesson $lesson, UpdateLessonRequest $request)` : utilise `$request->validated()` pour mettre à jour le titre, retourne `redirect()->back()`.
  - `destroy(Lesson $lesson)` : supprime la leçon, retourne `redirect()->back()`.
  - `reorder(ReorderLessonsRequest $request)` : utilise `$request->validated()` (reçoit `{ ids: [5, 2, 8] }`), met à jour `sort_order`, retourne `redirect()->back()`.

### Routes
- `GET /admin/courses/{course}/edit` — nom : `admin.courses.edit`, middleware : `auth, admin`
- `POST /admin/courses/{course}/modules` — nom : `admin.modules.store`, middleware : `auth, admin`
- `PUT /admin/modules/{module}` — nom : `admin.modules.update`, middleware : `auth, admin`
- `DELETE /admin/modules/{module}` — nom : `admin.modules.destroy`, middleware : `auth, admin`
- `PUT /admin/modules/reorder` — nom : `admin.modules.reorder`, middleware : `auth, admin`
- `POST /admin/modules/{module}/lessons` — nom : `admin.lessons.store`, middleware : `auth, admin`
- `PUT /admin/lessons/{lesson}` — nom : `admin.lessons.update`, middleware : `auth, admin`
- `DELETE /admin/lessons/{lesson}` — nom : `admin.lessons.destroy`, middleware : `auth, admin`
- `PUT /admin/lessons/reorder` — nom : `admin.lessons.reorder`, middleware : `auth, admin`

### Page(s) React (Inertia)
- `resources/js/pages/admin/courses/edit.tsx` — TypeScript interfaces miroir des DTOs :
  ```typescript
  interface CourseEditData {
      id: number;
      title: string;
      modules: ModuleEditData[];
  }

  interface ModuleEditData {
      id: number;
      title: string;
      sortOrder: number;
      lessons: LessonEditData[];
  }

  interface LessonEditData {
      id: number;
      title: string;
      sortOrder: number;
      hasVideo: boolean;
  }

  interface EditCoursePageProps {
      course: CourseEditData;
  }
  ```
  Composants clés : `<ModuleList>` avec drag & drop via `@dnd-kit/core`, `<LessonList>` imbriquée, boutons « Ajouter module », « Ajouter leçon ».

### Service(s) / Action(s)
- Aucun service dédié — la logique de réordonnancement est directement dans les contrôleurs (mise à jour batch de `sort_order`).

### Dépendances externes
- `@dnd-kit/core` (npm) — bibliothèque de drag & drop pour React
- `@dnd-kit/sortable` (npm) — extension sortable pour listes ordonnées
