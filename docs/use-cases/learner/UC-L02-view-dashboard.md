# UC-L02 — Consulter le tableau de bord apprenant

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-L02 |
| **Titre** | Consulter le tableau de bord apprenant |
| **Acteur principal** | Apprenant |
| **Pré-conditions** | Apprenant authentifié (UC-L01) |
| **Déclencheur** | L'apprenant accède au tableau de bord après connexion ou via navigation |

## Scénario principal (Happy Path)

1. L'apprenant accède au tableau de bord (`/dashboard`).
2. Le système charge les inscriptions de l'apprenant avec la progression de chaque cours.
3. Le système affiche la liste des cours inscrits avec : titre, pôle, nombre de modules, progression (%), et la dernière leçon consultée.
4. L'apprenant peut cliquer sur « Reprendre » pour accéder directement à sa dernière leçon en cours.

## Extensions (Cas alternatifs / Erreurs)

- **UC-L02a** — Aucun cours inscrit :
  1. Le système détecte qu'aucune inscription n'existe pour l'apprenant.
  2. Le système affiche un message « Vous n'êtes inscrit à aucun cours pour le moment ».
  3. Le système propose un lien vers le catalogue de cours (UC-L10).

## Post-conditions

- L'apprenant visualise l'état de ses inscriptions et progressions.

## Règles métier

- La progression est calculée comme le ratio de leçons complétées sur le total de leçons du cours.
- La « dernière leçon » correspond à la leçon la plus récemment consultée (basé sur `LessonProgress.updated_at`).

## Implémentation technique

### Modèles Eloquent
- `User` — `app/Models/User.php` — relations : `enrollments()` → `hasMany(Enrollment::class)`.
- `Enrollment` — `app/Models/Enrollment.php` — champs : `id`, `user_id`, `course_id`, `enrolled_at`, `created_at`, `updated_at`. Relations : `user()` → `belongsTo(User::class)`, `course()` → `belongsTo(Course::class)`.
- `Course` — `app/Models/Course.php` — champs : `id`, `title`, `slug`, `description`, `pole` (enum: assurance, telephonie, energie), `languages` (json), `status` (enum: draft, published), `created_at`, `updated_at`. Relations : `modules()` → `hasMany(Module::class)`, `enrollments()` → `hasMany(Enrollment::class)`. Scopes : `scopePublished()`.
- `LessonProgress` — `app/Models/LessonProgress.php` — champs : `id`, `user_id`, `lesson_id`, `completed` (boolean), `last_position_seconds` (integer, default 0), `created_at`, `updated_at`. Relations : `user()` → `belongsTo(User::class)`, `lesson()` → `belongsTo(Lesson::class)`.

### Migrations
- `create_enrollments_table` — colonnes : `id`, `user_id` (foreignId, index), `course_id` (foreignId, index), `enrolled_at` (timestamp), `timestamps`. Index unique : `[user_id, course_id]`.
- `create_lesson_progress_table` — colonnes : `id`, `user_id` (foreignId, index), `lesson_id` (foreignId, index), `completed` (boolean, default false), `last_position_seconds` (integer, default 0), `timestamps`. Index unique : `[user_id, lesson_id]`.

### DTO / Response
- `DashboardData` — `app/DTOs/Learner/DashboardData.php` — readonly class, propriétés typées, `fromUser()` static factory
- Convention : contrôleurs retournent UNIQUEMENT des DTOs comme props Inertia, jamais des modèles Eloquent.
- Pattern :
  ```php
  readonly class DashboardData {
      /**
       * @param EnrollmentData[] $enrollments
       */
      public function __construct(
          public array $enrollments,
      ) {}

      public static function fromUser(User $user): self
      {
          $enrollments = $user->enrollments()
              ->with(['course.modules.lessons'])
              ->get()
              ->map(fn (Enrollment $e) => EnrollmentData::fromModel($e, $user))
              ->all();

          return new self(enrollments: $enrollments);
      }
  }
  ```

- `EnrollmentData` — `app/DTOs/Learner/EnrollmentData.php` — readonly class, propriétés typées, `fromModel()` static factory
  ```php
  readonly class EnrollmentData {
      public function __construct(
          public int $id,
          public CourseData $course,
          public int $progressPercent,
          public ?LastLessonData $lastLesson,
          public string $enrolledAt,
      ) {}

      public static function fromModel(Enrollment $enrollment, User $user): self
      {
          $course = $enrollment->course;
          $totalLessons = $course->modules->flatMap->lessons->count();
          $completedLessons = LessonProgress::where('user_id', $user->id)
              ->whereIn('lesson_id', $course->modules->flatMap->lessons->pluck('id'))
              ->where('completed', true)
              ->count();

          $lastProgress = LessonProgress::where('user_id', $user->id)
              ->whereIn('lesson_id', $course->modules->flatMap->lessons->pluck('id'))
              ->latest('updated_at')
              ->with('lesson')
              ->first();

          return new self(
              id: $enrollment->id,
              course: CourseData::fromModel($course),
              progressPercent: $totalLessons > 0 ? (int) round($completedLessons / $totalLessons * 100) : 0,
              lastLesson: $lastProgress ? new LastLessonData(
                  id: $lastProgress->lesson->id,
                  title: $lastProgress->lesson->title,
                  lastPositionSeconds: $lastProgress->last_position_seconds,
              ) : null,
              enrolledAt: $enrollment->enrolled_at->toISOString(),
          );
      }
  }
  ```

- `CourseData` — `app/DTOs/Shared/CourseData.php` — readonly class, propriétés typées, `fromModel()` static factory
  ```php
  readonly class CourseData {
      public function __construct(
          public int $id,
          public string $title,
          public string $slug,
          public string $pole,
          public int $modulesCount,
          public int $totalDurationSeconds,
      ) {}

      public static function fromModel(Course $course): self
      {
          return new self(
              id: $course->id,
              title: $course->title,
              slug: $course->slug,
              pole: $course->pole->value,
              modulesCount: $course->modules->count(),
              totalDurationSeconds: $course->modules
                  ->flatMap->lessons
                  ->sum('duration_seconds'),
          );
      }
  }
  ```

- `LastLessonData` — `app/DTOs/Learner/LastLessonData.php` — readonly class, propriétés typées
  ```php
  readonly class LastLessonData {
      public function __construct(
          public int $id,
          public string $title,
          public int $lastPositionSeconds,
      ) {}
  }
  ```

### Contrôleur(s)
- `Learner\DashboardController` — `app/Http/Controllers/Learner/DashboardController.php` — méthode `index()`. Remplace l'actuel `Route::inertia('dashboard')` dans `routes/web.php`. Retourne DTOs via `Inertia::render()`.
  ```php
  public function index(Request $request): Response
  {
      return Inertia::render('learner/dashboard', [
          'data' => DashboardData::fromUser($request->user()),
      ]);
  }
  ```

### Routes
- `GET /dashboard` — nom `dashboard`, middleware `auth, verified`

### Page(s) React (Inertia)
- `resources/js/pages/learner/dashboard.tsx` — TypeScript interfaces miroir des DTOs, composants clés : liste des cours inscrits, barre de progression, bouton « Reprendre ».
  ```typescript
  interface DashboardProps {
      data: {
          enrollments: EnrollmentData[];
      };
  }

  interface EnrollmentData {
      id: number;
      course: CourseData;
      progressPercent: number;
      lastLesson: LastLessonData | null;
      enrolledAt: string;
  }

  interface CourseData {
      id: number;
      title: string;
      slug: string;
      pole: string;
      modulesCount: number;
      totalDurationSeconds: number;
  }

  interface LastLessonData {
      id: number;
      title: string;
      lastPositionSeconds: number;
  }
  ```

### Service(s) / Action(s)
- Aucun service dédié — la logique de calcul de progression est encapsulée dans les DTOs (`EnrollmentData::fromModel()`).

### Dépendances externes
- Aucune
