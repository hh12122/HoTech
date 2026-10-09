# UC-L05 — Visionner une leçon vidéo (lecteur adaptatif)

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-L05 |
| **Titre** | Visionner une leçon vidéo (lecteur adaptatif) |
| **Acteur principal** | Apprenant |
| **Pré-conditions** | Apprenant authentifié (UC-L01), module déverrouillé (UC-L07) |
| **Déclencheur** | L'apprenant sélectionne une leçon vidéo dans un module déverrouillé |

## Scénario principal (Happy Path)

1. L'apprenant sélectionne une leçon dans un module déverrouillé.
2. Le système vérifie que le module est déverrouillé pour l'apprenant.
3. Le système génère une URL signée temporaire via `VideoStreamService`.
4. Le système charge la page de la leçon avec le lecteur vidéo adaptatif (HLS).
5. Le lecteur charge le flux vidéo HLS et adapte automatiquement la qualité à la bande passante.
6. Pendant la lecture, le frontend sauvegarde périodiquement la position via l'API de progression (UC-L03).
7. À la fin de la vidéo, le système marque la leçon comme complétée.

## Extensions (Cas alternatifs / Erreurs)

- **UC-L05a** — Bande passante faible :
  1. Le lecteur HLS détecte une bande passante insuffisante.
  2. `hls.js` réduit automatiquement la qualité vidéo (ABR — Adaptive Bitrate).
  3. La lecture continue sans interruption à une résolution inférieure.

- **UC-L05b** — Module verrouillé :
  1. L'apprenant tente d'accéder à une leçon d'un module verrouillé.
  2. Le middleware `EnsureModuleUnlocked` retourne une erreur 403.
  3. L'apprenant est redirigé vers la page du cours avec un message d'erreur.

- **UC-L05c** — Vidéo non disponible :
  1. Le `video_id` de la leçon est null ou le provider retourne une erreur.
  2. Le système affiche un message « Vidéo indisponible temporairement ».

## Post-conditions

- La leçon vidéo a été visionnée via le lecteur adaptatif.
- La position de lecture est sauvegardée périodiquement.
- Si la vidéo est terminée, la leçon est marquée comme complétée dans `LessonProgress`.

## Règles métier

- Les URL signées sont temporaires et ne permettent pas le téléchargement direct.
- Le streaming utilise le protocole HLS pour le débit adaptatif.
- Chaque leçon peut utiliser un provider vidéo différent (Bunny.net ou Cloudflare Stream), déterminé par le champ `video_provider`.
- La complétion d'une leçon est enregistrée lorsque l'apprenant atteint au moins 90% de la durée totale.

## Implémentation technique

### Modèles Eloquent
- `Lesson` — `app/Models/Lesson.php` — champs : `id`, `module_id`, `title`, `sort_order`, `video_provider` (enum: bunny, cloudflare), `video_id` (string, nullable), `duration_seconds` (integer), `created_at`, `updated_at`. Relations : `module()` → `belongsTo(Module::class)`, `progresses()` → `hasMany(LessonProgress::class)`.
- `LessonProgress` — `app/Models/LessonProgress.php` — voir UC-L02.

### Migrations
- `create_lessons_table` — voir UC-L03.

### DTO / Response
- Réutilise `LessonShowData` — `app/DTOs/Learner/LessonShowData.php` (défini dans UC-L03). Le champ `signedVideoUrl` contient l'URL signée HLS générée par `VideoStreamService`.
- Convention : contrôleurs retournent UNIQUEMENT des DTOs comme props Inertia, jamais des modèles Eloquent.
- Pattern (rappel de UC-L03) :
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
### Form Request(s)
- `UpdateLessonProgressRequest` — `app/Http/Requests/Learner/UpdateLessonProgressRequest.php` (partagé avec UC-L03)
  - `rules()` : valide `last_position_seconds` (`required, integer, min:0`) et `completed` (`boolean`).


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

- `Api\LessonProgressController` — `app/Http/Controllers/Api/LessonProgressController.php` — méthode `update(Lesson $lesson, UpdateLessonProgressRequest $request)`. Reçoit la progression périodique ou finale et utilise `$request->validated()` pour mettre à jour la base de données.

### Routes
- `GET /lessons/{lesson}` — nom `lessons.show`, middleware `auth, ensure-module-unlocked`

### Page(s) React (Inertia)
- `resources/js/pages/learner/lesson-show.tsx` — TypeScript interfaces miroir des DTOs, composant `<VideoPlayer />` utilisant `hls.js` pour le streaming adaptatif.
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
  Composants clés :
  - `<VideoPlayer src={lesson.signedVideoUrl} startAt={lesson.startAtSeconds} />` — utilise `hls.js` pour charger le flux HLS, gère ABR automatiquement.
  - Sauvegarde automatique de la position via `PUT /api/lessons/{lesson}/progress` toutes les 10 secondes.
  - Détection de fin de vidéo (≥90% durée) → appel `PUT /api/lessons/{lesson}/progress` avec `completed: true`.

### Service(s) / Action(s)
- `VideoStreamService` — `app/Services/VideoStreamService.php` — responsabilité : génération d'URL signées temporaires selon le provider vidéo.
  ```php
  class VideoStreamService {
      public function getSignedUrl(Lesson $lesson): string
      {
          return match ($lesson->video_provider) {
              VideoProvider::Bunny => $this->getBunnySignedUrl($lesson),
              VideoProvider::Cloudflare => $this->getCloudflareSignedUrl($lesson),
          };
      }

      private function getBunnySignedUrl(Lesson $lesson): string
      {
          // Génère un token signé Bunny.net avec expiration
          // Utilise config('services.bunny.token_key') et config('services.bunny.hostname')
      }

      private function getCloudflareSignedUrl(Lesson $lesson): string
      {
          // Génère un signed token Cloudflare Stream
          // Utilise config('services.cloudflare.stream_signing_key')
      }
  }
  ```

### Dépendances externes
- `hls.js` (npm) — lecteur HLS côté client pour le streaming adaptatif
- API Bunny.net (Token Authentication) — génération d'URL signées pour les vidéos hébergées sur Bunny CDN
- API Cloudflare Stream (Signed URLs) — génération de tokens signés pour Cloudflare Stream
