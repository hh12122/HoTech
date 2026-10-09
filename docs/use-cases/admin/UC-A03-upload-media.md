# UC-A03 — Uploader un média vidéo

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-A03 |
| **Titre** | Uploader un média vidéo |
| **Acteur principal** | Administrateur |
| **Pré-conditions** | L'administrateur est authentifié avec le rôle `admin` ; une leçon existe et est en cours d'édition |
| **Déclencheur** | L'administrateur clique sur « Uploader une vidéo » dans le formulaire d'édition d'une leçon |

## Scénario principal (Happy Path)

1. L'administrateur ouvre le formulaire d'édition d'une leçon.
2. L'administrateur clique sur « Uploader une vidéo » et sélectionne un fichier vidéo depuis son ordinateur.
3. Le système démarre l'upload vers le fournisseur vidéo (Bunny.net ou Cloudflare Stream) avec une barre de progression.
4. L'upload se termine avec succès.
5. Le système reçoit l'identifiant vidéo et l'URL de prévisualisation du fournisseur.
6. Le système associe la vidéo à la leçon (met à jour `video_id` et `video_provider`).
7. Le système affiche un aperçu de la vidéo uploadée.

## Extensions (Cas alternatifs / Erreurs)

- **2a** — Fichier trop volumineux (dépasse la limite configurée) :
  1. Le système affiche une erreur indiquant la taille maximale autorisée (ex : « Taille maximale : 2 Go »).
  2. L'administrateur sélectionne un fichier plus petit.

- **2b** — Format de fichier non supporté :
  1. Le système affiche une erreur indiquant les formats acceptés (mp4, mov, webm, etc.).
  2. L'administrateur sélectionne un fichier au bon format.

- **3a** — Interruption réseau pendant l'upload :
  1. Le client tus reprend l'upload à partir du dernier chunk envoyé (upload résumable).
  2. L'administrateur attend la reprise automatique.

- **5a** — Erreur du fournisseur vidéo (API indisponible) :
  1. Le système affiche un message d'erreur avec suggestion de réessayer.
  2. L'administrateur retente l'upload.

## Post-conditions

- Le fichier vidéo est stocké chez le fournisseur (Bunny.net ou Cloudflare Stream).
- La leçon est associée à la vidéo via `video_id` et `video_provider`.
- L'URL de prévisualisation est disponible pour vérification.

## Règles métier

- L'upload se fait nativement depuis l'interface admin, sans redirection vers un service tiers.
- L'upload est résumable : en cas d'interruption, la reprise se fait automatiquement.
- La taille maximale du fichier est configurable via `config/media.php`.
- Les formats acceptés sont les types MIME `video/*` (mp4, mov, webm, avi, mkv).

## Implémentation technique

### Modèles Eloquent
- `Lesson` — `app/Models/Lesson.php` — champs utilisés : `video_provider` (enum: bunny, cloudflare, nullable), `video_id` (string, nullable), `duration_seconds` (integer). Voir UC-A02 pour la définition complète.

### Migrations
- Voir UC-A02 (`create_lessons_table`) — les colonnes `video_provider`, `video_id`, `duration_seconds` sont déjà définies.

### DTO / Response
- `MediaUploadResultData` — `app/DTOs/Admin/MediaUploadResultData.php` — readonly class, propriétés typées.
- Convention : contrôleurs retournent UNIQUEMENT des DTOs comme props Inertia, jamais des modèles Eloquent.
- Pattern :
  ```php
  readonly class MediaUploadResultData {
      public function __construct(
          public string $provider,
          public string $videoId,
          public string $previewUrl,
      ) {}
  }
  ```
  Note : cette route retourne du JSON (pas une page Inertia) car elle est appelée en AJAX pendant l'édition. Le DTO sert de structure de réponse JSON.

### Form Request(s)
- `MediaUploadRequest` — `app/Http/Requests/Admin/MediaUploadRequest.php`
  - `rules()` : valide le fichier vidéo fourni (`mimetypes:video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska`, `max` configuré via `config('media.max_upload_size')`).

### Contrôleur(s)
- `Admin\MediaController` — `app/Http/Controllers/Admin/MediaController.php` — méthodes :
  - `store(MediaUploadRequest $request)` : utilise `$request->validated()`, appelle `MediaUploadService::upload()` avec le fichier validé, met à jour `Lesson.video_id` et `Lesson.video_provider`, retourne `response()->json(new MediaUploadResultData(...))`.

### Routes
- `POST /admin/media/upload` — nom : `admin.media.store`, middleware : `auth, admin`. Retour JSON (pas Inertia) car appelé en AJAX.

### Page(s) React (Inertia)
- Composant `<VideoUploader />` intégré dans `resources/js/pages/admin/courses/edit.tsx` — TypeScript interface :
  ```typescript
  interface MediaUploadResultData {
      provider: string;
      videoId: string;
      previewUrl: string;
  }
  ```
  Composants clés : `<VideoUploader>` avec barre de progression, utilisant `tus-js-client` pour l'upload résumable. Affiche un aperçu vidéo après upload réussi via `previewUrl`.

### Service(s) / Action(s)
- `MediaUploadService` — `app/Services/MediaUploadService.php` — responsabilité : gérer l'upload vers le fournisseur vidéo configuré (Bunny.net ou Cloudflare Stream).
  - `upload(UploadedFile $file): MediaUploadResultData` — envoie le fichier au fournisseur via son API, retourne le résultat structuré.
  - Sélectionne le fournisseur selon la configuration `config/media.php` → `default_provider`.

### Dépendances externes
- `tus-js-client` (npm) — client d'upload résumable côté frontend
- API Bunny.net Stream — hébergement et streaming vidéo (alternative : Cloudflare Stream)
- `config/media.php` — configuration personnalisée : `max_upload_size` (en bytes), `default_provider` (bunny/cloudflare), `accepted_mimes`
