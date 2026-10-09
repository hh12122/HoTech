# UC-L08 — Télécharger un certificat PDF

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-L08 |
| **Titre** | Télécharger un certificat PDF |
| **Acteur principal** | Apprenant |
| **Pré-conditions** | L'apprenant est authentifié ; le cours est complété à 100 % ; le pôle du cours est Téléphonie OU Énergie |
| **Déclencheur** | Action utilisateur — clic sur « Télécharger le certificat » depuis la page du cours |

## Scénario principal (Happy Path)

1. L'apprenant accède à la page du cours complété (`GET /courses/{course}`, voir UC-L04).
2. Le système affiche le bouton « Télécharger le certificat » via la prop `canDownloadCertificate` de `CourseProgressData`.
3. L'apprenant clique sur le bouton (`GET /courses/{course}/certificate`).
4. Le système vérifie : cours complété à 100 % ET pôle ∈ {telephonie, energie}.
5. Le système génère le PDF via `CertificateService` (ou le récupère depuis le cache `Certificate` si déjà généré).
6. Le système retourne le PDF en téléchargement (`response()->streamDownload()`).
7. Le navigateur de l'apprenant télécharge le fichier `certificat-{course_slug}.pdf`.

## Extensions (Cas alternatifs / Erreurs)

- **UC-L08a** — Cours non complété à 100 % :
  1. Le système refuse la requête (403).
  2. Le bouton n'est pas affiché côté frontend (`canDownloadCertificate = false`).
- **UC-L08b** — Pôle Assurance (AFA) :
  1. Le système refuse la requête (403) — pas de certificat pour ce pôle.
  2. Le bouton n'est jamais affiché pour les cours du pôle Assurance.

## Post-conditions

- Le PDF est téléchargé par l'apprenant.
- Un enregistrement `Certificate` (cache) existe avec `generated_at` et `file_path`.
- À la première génération, une notification `CertificateAvailableNotification` est envoyée (voir UC-M03).

## Règles métier

- Pas de certificat pour le pôle Assurance (AFA).
- Le certificat mentionne : nom de l'apprenant, titre du cours, date de complétion (champs dynamiques du template, voir UC-A10).
- Le PDF généré est mis en cache : les téléchargements suivants réutilisent le fichier existant.

## Implémentation technique

### Modèles Eloquent
- `Course` — `app/Models/Course.php` — champ `pole` (enum: assurance, telephonie, energie). Helper : `hasCertificate(): bool` → `in_array($this->pole, ['telephonie', 'energie'])`.
- `Certificate` (optionnel, cache) — `app/Models/Certificate.php` — champs : `id`, `user_id` (foreignId), `course_id` (foreignId), `generated_at` (timestamp), `file_path` (string), timestamps. Index unique `(user_id, course_id)`.
- `CertificateTemplate` — `app/Models/CertificateTemplate.php` — template actif pour le pôle du cours (voir UC-A10).

### Migrations
- `create_certificates_table` (optionnel, cache) — `id`, `foreignId('user_id')->constrained()->cascadeOnDelete()`, `foreignId('course_id')->constrained()->cascadeOnDelete()`, `timestamp('generated_at')`, `string('file_path')`, timestamps. Index unique `(user_id, course_id)`.
- `create_certificate_templates_table` — voir UC-A10.

### DTO / Response
- Aucun DTO de réponse — la réponse est un téléchargement binaire PDF (`streamDownload`), pas une page Inertia.
- La visibilité du bouton est portée par la prop `canDownloadCertificate: boolean` ajoutée à `CourseProgressData` (défini dans UC-L04) :
  ```php
  // app/DTOs/Learner/CourseProgressData.php — champ supplémentaire
  readonly class CourseProgressData {
      /** @param ModuleProgressData[] $modules */
      public function __construct(
          public int $id,
          public string $title,
          public int $overallPercent,
          public array $modules,
          public bool $canDownloadCertificate,  // 100% complété ET pôle éligible
      ) {}
  }
  ```

### Contrôleur(s)
- `Learner\CertificateController` — `app/Http/Controllers/Learner/CertificateController.php` :
  - `download(Course $course)` — vérifie completion (100 %) et pôle éligible (sinon `abort(403)`), appelle `CertificateService::generate()`, retourne `response()->streamDownload($generator, "certificat-{$course->slug}.pdf")`.
  - À la première génération (pas de `Certificate` en cache) : `$user->notify(new CertificateAvailableNotification($course))` (voir UC-M03).

### Routes
- `GET /courses/{course}/certificate` — name `courses.certificate`, middleware `auth`

### Page(s) React (Inertia)
- Pas de page dédiée. Bouton conditionnel dans `resources/js/pages/learner/course-show.tsx` (UC-L04) :
  ```tsx
  {course.canDownloadCertificate && (
      <a href={route('courses.certificate', course.id)} className="btn">
          Télécharger le certificat
      </a>
  )}
  ```

### Service(s) / Action(s)
- `CertificateService` — `app/Services/CertificateService.php` :
  - `generate(User $user, Course $course): string` — retourne le contenu binaire du PDF. Charge le `CertificateTemplate` actif pour le pôle du cours, remplace les placeholders (`student_name`, `course_title`, `date`, `score`), rend la vue Blade `resources/views/certificates/template.blade.php`, génère le PDF via `barryvdh/laravel-dompdf`.
  - Gère le cache : si un `Certificate` existe et que le fichier est présent en storage, retourne le fichier existant.

### Dépendances externes
- `barryvdh/laravel-dompdf` (composer) — génération de PDF depuis HTML/Blade
