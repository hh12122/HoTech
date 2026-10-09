# UC-L04 — Consulter sa progression

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-L04 |
| **Titre** | Consulter sa progression |
| **Acteur principal** | Apprenant |
| **Pré-conditions** | Apprenant authentifié (UC-L01), inscrit à au moins un cours |
| **Déclencheur** | L'apprenant accède à la page détail d'un cours |

## Scénario principal (Happy Path)

1. L'apprenant accède à la page détail d'un cours (`/courses/{course}`).
2. Le système charge la progression globale du cours et la progression détaillée par module.
3. Le système affiche la progression globale (pourcentage de complétion).
4. Le système affiche chaque module avec : titre, ordre, nombre de leçons complétées / total, pourcentage, et statut de déverrouillage.
5. L'apprenant peut cliquer sur un module déverrouillé pour accéder à ses leçons.

## Extensions (Cas alternatifs / Erreurs)

- **UC-L04a** — Module verrouillé :
  1. Le module n'est pas encore déverrouillé (module précédent non complété).
  2. Le système affiche le module avec un indicateur visuel « verrouillé » et désactive le lien d'accès.

- **UC-L04b** — Cours complété à 100% :
  1. Le système affiche un message de félicitations.
  2. Si le pôle est Téléphonie ou Énergie, le bouton « Télécharger certificat » est affiché (UC-L08).

## Post-conditions

- L'apprenant visualise sa progression granulaire (par leçon, module et cours).

## Règles métier

- La progression par module est calculée comme le ratio de leçons complétées dans ce module.
- La progression globale est calculée comme le ratio de toutes les leçons complétées dans le cours.
- Un module est déverrouillé si c'est le premier module OU si le module précédent (par `sort_order`) a été complété (quiz réussi, voir UC-L07).
- La progression linéaire est imposée : l'apprenant ne peut pas sauter de modules.

## Implémentation technique

### Modèles Eloquent
- `Course` — `app/Models/Course.php` — relations : `modules()` → `hasMany(Module::class)->orderBy('sort_order')`.
- `Module` — `app/Models/Module.php` — relations : `lessons()` → `hasMany(Lesson::class)->orderBy('sort_order')`, `course()` → `belongsTo(Course::class)`. Scope : `scopeUnlockedFor(Builder $query, User $user)`.
- `Lesson` — `app/Models/Lesson.php` — relations : `module()` → `belongsTo(Module::class)`.
- `LessonProgress` — `app/Models/LessonProgress.php` — champs et relations : voir UC-L02.
- `ModuleProgress` — `app/Models/ModuleProgress.php` — champs : `id`, `user_id`, `module_id`, `completed_at` (timestamp, nullable), `created_at`, `updated_at`. Relations : `user()` → `belongsTo(User::class)`, `module()` → `belongsTo(Module::class)`.

### Migrations
- `create_courses_table` — colonnes : `id`, `title` (string), `slug` (string, unique), `description` (text), `pole` (string), `languages` (json), `status` (string, default `'draft'`), `timestamps`.
- `create_module_progress_table` — colonnes : `id`, `user_id` (foreignId, index), `module_id` (foreignId, index), `completed_at` (timestamp, nullable), `timestamps`. Index unique : `[user_id, module_id]`.

### DTO / Response
- `CourseProgressData` — `app/DTOs/Learner/CourseProgressData.php` — readonly class, propriétés typées, `fromCourse()` static factory
- Convention : contrôleurs retournent UNIQUEMENT des DTOs comme props Inertia, jamais des modèles Eloquent.
- Pattern :
  ```php
  readonly class CourseProgressData {
      /**
       * @param ModuleProgressData[] $modules
       */
      public function __construct(
          public int $id,
          public string $title,
          public int $overallPercent,
          public array $modules,
          public bool $canDownloadCertificate,
      ) {}

      public static function fromCourse(Course $course, User $user): self
      {
          $modules = $course->modules()
              ->orderBy('sort_order')
              ->with('lessons')
              ->get();

          $allLessonIds = $modules->flatMap->lessons->pluck('id');
          $completedCount = LessonProgress::where('user_id', $user->id)
              ->whereIn('lesson_id', $allLessonIds)
              ->where('completed', true)
              ->count();
          $totalCount = $allLessonIds->count();

          $completedModuleIds = ModuleProgress::where('user_id', $user->id)
              ->whereNotNull('completed_at')
              ->pluck('module_id')
              ->toArray();

          $moduleDataList = [];
          foreach ($modules as $index => $module) {
              $isFirstModule = $index === 0;
              $previousModuleCompleted = $index > 0
                  && in_array($modules[$index - 1]->id, $completedModuleIds);
              $isUnlocked = $isFirstModule || $previousModuleCompleted;

              $moduleLessonIds = $module->lessons->pluck('id');
              $moduleCompleted = LessonProgress::where('user_id', $user->id)
                  ->whereIn('lesson_id', $moduleLessonIds)
                  ->where('completed', true)
                  ->count();

              $moduleDataList[] = new ModuleProgressData(
                  id: $module->id,
                  title: $module->title,
                  sortOrder: $module->sort_order,
                  completedLessons: $moduleCompleted,
                  totalLessons: $module->lessons->count(),
                  percent: $module->lessons->count() > 0
                      ? (int) round($moduleCompleted / $module->lessons->count() * 100)
                      : 0,
                  isUnlocked: $isUnlocked,
              );
          }

          $overallPercent = $totalCount > 0
              ? (int) round($completedCount / $totalCount * 100)
              : 0;

          $canDownloadCertificate = $overallPercent === 100
              && in_array($course->pole->value, ['telephonie', 'energie']);

          return new self(
              id: $course->id,
              title: $course->title,
              overallPercent: $overallPercent,
              modules: $moduleDataList,
              canDownloadCertificate: $canDownloadCertificate,
          );
      }
  }
  ```

- `ModuleProgressData` — `app/DTOs/Learner/ModuleProgressData.php` — readonly class, propriétés typées
  ```php
  readonly class ModuleProgressData {
      public function __construct(
          public int $id,
          public string $title,
          public int $sortOrder,
          public int $completedLessons,
          public int $totalLessons,
          public int $percent,
          public bool $isUnlocked,
      ) {}
  }
  ```

### Contrôleur(s)
- `Learner\CourseController` — `app/Http/Controllers/Learner/CourseController.php` — méthode `show(Course $course)`. Retourne DTOs via `Inertia::render()`.
  ```php
  public function show(Course $course): Response
  {
      return Inertia::render('learner/course-show', [
          'course' => CourseProgressData::fromCourse($course, auth()->user()),
      ]);
  }
  ```

### Routes
- `GET /courses/{course}` — nom `courses.show`, middleware `auth`

### Page(s) React (Inertia)
- `resources/js/pages/learner/course-show.tsx` — TypeScript interfaces miroir des DTOs, composants clés : barre de progression globale, liste des modules avec progression individuelle.
  ```typescript
  interface CourseShowProps {
      course: CourseProgressData;
  }

  interface CourseProgressData {
      id: number;
      title: string;
      overallPercent: number;
      modules: ModuleProgressData[];
      canDownloadCertificate: boolean;
  }

  interface ModuleProgressData {
      id: number;
      title: string;
      sortOrder: number;
      completedLessons: number;
      totalLessons: number;
      percent: number;
      isUnlocked: boolean;
  }
  ```
  Composants clés : `<ProgressBar percent={course.overallPercent} />`, `<ModuleCard />` par module avec indicateur verrouillé/déverrouillé, bouton « Télécharger certificat » conditionnel via `canDownloadCertificate`.

### Service(s) / Action(s)
- Aucun service dédié — la logique de calcul de progression est encapsulée dans `CourseProgressData::fromCourse()`.

### Dépendances externes
- Aucune
