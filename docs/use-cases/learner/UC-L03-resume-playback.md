# UC-L03 — Reprendre la lecture d'une vidéo

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-L03 |
| **Titre** | Reprendre la lecture d'une vidéo |
| **Acteur principal** | Apprenant |
| **Pré-conditions** | Apprenant authentifié (UC-L01), vidéo déjà commencée (`LessonProgress.last_position_seconds > 0`) |
| **Déclencheur** | L'apprenant clique sur « Reprendre » depuis le tableau de bord ou la page de cours |

## Scénario principal (Happy Path)

1. L'apprenant clique sur « Reprendre » pour une leçon déjà commencée.
2. Le système charge la leçon avec la position de reprise sauvegardée.
3. Le système génère une URL signée temporaire pour le flux vidéo.
4. Le lecteur vidéo s'ouvre et démarre automatiquement à la position sauvegardée (`last_position_seconds`).
5. Pendant la lecture, le frontend envoie périodiquement la position courante via l'API de sauvegarde.

## Extensions (Cas alternatifs / Erreurs)

- **UC-L03a** — Leçon jamais commencée :
  1. La position sauvegardée est 0.
  2. Le lecteur démarre au début de la vidéo.

- **UC-L03b** — URL signée expirée (rechargement de page) :
  1. Le contrôleur génère une nouvelle URL signée à chaque chargement de page.
  2. Le lecteur charge la nouvelle URL sans interruption.

- **UC-L03c** — Échec de sauvegarde de la progression :
  1. L'appel API `PUT /api/lessons/{lesson}/progress` échoue (réseau).
  2. Le frontend réessaye silencieusement lors du prochain intervalle de sauvegarde.

## Post-conditions

- Le lecteur vidéo est ouvert à la position sauvegardée.
- La progression est mise à jour périodiquement côté serveur.

## Règles métier

- La position de reprise est sauvegardée en secondes (entier).
- Les URL signées ont une durée de validité limitée (configurable, ex. 4 heures).
- La sauvegarde automatique de la position se fait toutes les 10 secondes environ (côté frontend).

## Implémentation technique

### Modèles Eloquent
- `Lesson` — `app/Models/Lesson.php` — champs : `id`, `module_id`, `title`, `sort_order`, `video_provider` (enum: bunny, cloudflare), `video_id` (string), `duration_seconds` (integer), `created_at`, `updated_at`. Relations : `module()` → `belongsTo(Module::class)`, `progresses()` → `hasMany(LessonProgress::class)`.
- `LessonProgress` — `app/Models/LessonProgress.php` — champs : `id`, `user_id`, `lesson_id`, `completed` (boolean), `last_position_seconds` (integer, default 0), `created_at`, `updated_at`. Relations : `user()` → `belongsTo(User::class)`, `lesson()` → `belongsTo(Lesson::class)`.
- `Module` — `app/Models/Module.php` — champs : `id`, `course_id`, `title`, `sort_order`, `created_at`, `updated_at`. Relations : `course()` → `belongsTo(Course::class)`, `lessons()` → `hasMany(Lesson::class)`.

### Migrations
- `create_modules_table` — colonnes : `id`, `course_id` (foreignId, index), `title` (string), `sort_order` (integer), `timestamps`.
- `create_lessons_table` — colonnes : `id`, `module_id` (foreignId, index), `title` (string), `sort_order` (integer), `video_provider` (string), `video_id` (string, nullable), `duration_seconds` (integer, default 0), `timestamps`.
- `create_lesson_progress_table` — voir UC-L02.

### DTO / Response
- `LessonShowData` — `app/DTOs/Learner/LessonShowData.php` — readonly class, propriétés typées, `fromLesson()` static factory
- Convention : contrôleurs retournent UNIQUEMENT des DTOs comme props Inertia, jamais des modèles Eloquent.
- Pattern :
  ```php
  readonly class LessonShowData {
      public function __construct(
          public int $id,
          public string $title,
          public string $signedVideoUrl,
          public int $durationSeconds,
          public int $startAtSeconds,
          public ModuleBreadcrumbData $module,
      ) {}

      public static function fromLesson(Lesson $lesson, User $user, string $signedUrl): self
      {
          $progress = LessonProgress::where('user_id', $user->id)
              ->where('lesson_id', $lesson->id)
              ->first();

          return new self(
              id: $lesson->id,
              title: $lesson->title,
              signedVideoUrl: $signedUrl,
              durationSeconds: $lesson->duration_seconds,
              startAtSeconds: $progress?->last_position_seconds ?? 0,
              module: new ModuleBreadcrumbData(
                  id: $lesson->module->id,
                  title: $lesson->module->title,
                  courseId: $lesson->module->course_id,
              ),
          );
      }
  }
  ```

- `ModuleBreadcrumbData` — `app/DTOs/Learner/ModuleBreadcrumbData.php` — readonly class, propriétés typées
  ```php
  readonly class ModuleBreadcrumbData {
      public function __construct(
          public int $id,
          public string $title,
          public int $courseId,
      ) {}
  }
  ```

### Form Request(s)
- `UpdateLessonProgressRequest` — `app/Http/Requests/Learner/UpdateLessonProgressRequest.php`
  - `rules()` : valide que `last_position_seconds` est présent (`required, integer, min:0`) et éventuellement le statut d'achèvement (`completed` boolean).

### Contrôleur(s)
- `Learner\LessonController` — `app/Http/Controllers/Learner/LessonController.php` — méthode `show(Lesson $lesson)`. Retourne DTOs via `Inertia::render()`.
  ```php
  public function show(Lesson $lesson, VideoStreamService $videoService): Response
  {
      $signedUrl = $videoService->getSignedUrl($lesson);

      return Inertia::render('learner/lesson-show', [
          'lesson' => LessonShowData::fromLesson($lesson, auth()->user(), $signedUrl),
      ]);
  }
  ```

- `Api\LessonProgressController` — `app/Http/Controllers/Api/LessonProgressController.php` — méthode `update(Lesson $lesson, UpdateLessonProgressRequest $request)`. Sauvegarde la progression sans retour Inertia.
  ```php
  public function update(Lesson $lesson, UpdateLessonProgressRequest $request): JsonResponse
  {
      $validated = $request->validated();

      LessonProgress::updateOrCreate(
          ['user_id' => auth()->id(), 'lesson_id' => $lesson->id],
          ['last_position_seconds' => $validated['last_position_seconds']],
      );

      return response()->json(status: 204);
  }
  ```

### Routes
- `GET /lessons/{lesson}` — nom `lessons.show`, middleware `auth`
- `PUT /api/lessons/{lesson}/progress` — nom `api.lessons.progress.update`, middleware `auth:sanctum`

### Page(s) React (Inertia)
- `resources/js/pages/learner/lesson-show.tsx` — TypeScript interfaces miroir des DTOs, composant `<VideoPlayer />` avec reprise.
  ```typescript
  interface LessonShowProps {
      lesson: LessonShowData;
  }

  interface LessonShowData {
      id: number;
      title: string;
      signedVideoUrl: string;
      durationSeconds: number;
      startAtSeconds: number;
      module: ModuleBreadcrumbData;
  }

  interface ModuleBreadcrumbData {
      id: number;
      title: string;
      courseId: number;
  }
  ```
  Composants clés : `<VideoPlayer startAt={lesson.startAtSeconds} src={lesson.signedVideoUrl} />`, fil d'Ariane module/cours.

### Service(s) / Action(s)
- `VideoStreamService` — `app/Services/VideoStreamService.php` — méthode `getSignedUrl(Lesson $lesson): string`. Génère une URL signée temporaire selon le provider (Bunny.net Token Auth ou Cloudflare Stream signed tokens). Voir UC-L05 pour les détails.

### Dépendances externes
- API Bunny.net ou Cloudflare Stream (pour la génération d'URL signées)
