# UC-A10 — Gérer les modèles de certificats

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-A10 |
| **Titre** | Gérer les modèles de certificats |
| **Acteur principal** | Administrateur |
| **Pré-conditions** | L'administrateur est authentifié avec le rôle `admin` |
| **Déclencheur** | L'administrateur accède à la section « Certificats » du back-office |

## Scénario principal (Happy Path)

1. L'administrateur accède à la liste des modèles de certificats.
2. Le système affiche les templates existants par pôle (Téléphonie, Énergie).
3. L'administrateur sélectionne un template à éditer.
4. Le système affiche le formulaire d'édition avec : logo, texte du corps, champs dynamiques disponibles.
5. L'administrateur modifie le logo (upload d'image).
6. L'administrateur édite le texte du corps en utilisant les placeholders dynamiques (`{student_name}`, `{course_title}`, `{date}`, `{score}`).
7. L'administrateur clique sur « Prévisualiser » pour voir le rendu PDF.
8. Le système génère un PDF de prévisualisation avec des données fictives et l'affiche.
9. L'administrateur sauvegarde les modifications.
10. Le système met à jour le template en base de données.

## Extensions (Cas alternatifs / Erreurs)

- **2a** — Aucun template configuré pour un pôle :
  1. L'administrateur clique sur « Créer un template ».
  2. Le système affiche un formulaire vide pour le pôle sélectionné.

- **5a** — Format d'image non supporté pour le logo :
  1. Le système affiche une erreur indiquant les formats acceptés (PNG, JPG, SVG).
  2. L'administrateur sélectionne une image au bon format.

- **5b** — Image trop volumineuse :
  1. Le système affiche une erreur avec la taille maximale autorisée.
  2. L'administrateur redimensionne ou compresse l'image.

- **7a** — Erreur lors de la génération de la prévisualisation :
  1. Le système affiche un message d'erreur.
  2. L'administrateur vérifie la syntaxe du template et réessaye.

- **9a** — Texte du corps vide :
  1. Le système affiche une erreur de validation.
  2. L'administrateur renseigne le texte du corps.

## Post-conditions

- Le template de certificat est mis à jour en base de données.
- Le logo uploadé est stocké sur le disque (storage).
- Les futures générations de certificats pour ce pôle utiliseront le template modifié.

## Règles métier

- Les certificats sont disponibles uniquement pour les pôles Téléphonie et Énergie ; le pôle Assurance (AFA) n'a pas de certificat.
- Un template par pôle est actif à la fois (`is_active`).
- Les placeholders dynamiques disponibles sont : `{student_name}`, `{course_title}`, `{date}`, `{score}`.
- La prévisualisation utilise des données fictives pour le rendu.

## Implémentation technique

### Modèles Eloquent
- `CertificateTemplate` — `app/Models/CertificateTemplate.php` — champs : `id`, `pole` (enum: telephonie, energie), `logo_path` (string, nullable), `body_text` (text), `is_active` (boolean, default true). Relations : aucune relation directe ; la liaison avec `Course` se fait via le champ `pole` partagé. Scopes : `scopeActive()` → `where('is_active', true)`, `scopeForPole(string $pole)` → `where('pole', $pole)`.

### Migrations
- `create_certificate_templates_table` — colonnes : `id` (bigIncrements), `pole` (string, enum: telephonie, energie), `logo_path` (string, nullable), `body_text` (text), `is_active` (boolean, default true), `timestamps`. Index : `index('pole')`, `index('is_active')`.

### DTO / Response
- `CertificateTemplateData` — `app/DTOs/Admin/CertificateTemplateData.php` — readonly class, propriétés typées, `fromModel()` static factory.
- Convention : contrôleurs retournent UNIQUEMENT des DTOs comme props Inertia, jamais des modèles Eloquent.
- Pattern :
  ```php
  readonly class CertificateTemplateData {
      /**
       * @param string[] $availablePlaceholders Champs dynamiques disponibles
       */
      public function __construct(
          public int $id,
          public string $pole,
          public ?string $logoUrl,
          public string $bodyText,
          public bool $isActive,
          public array $availablePlaceholders,
      ) {}

      public static function fromModel(CertificateTemplate $template): self
      {
          return new self(
              id: $template->id,
              pole: $template->pole,
              logoUrl: $template->logo_path ? Storage::url($template->logo_path) : null,
              bodyText: $template->body_text,
              isActive: $template->is_active,
              availablePlaceholders: ['student_name', 'course_title', 'date', 'score'],
          );
      }
  }
  ```

### Form Request(s)
- `UpdateCertificateTemplateRequest` — `app/Http/Requests/Admin/UpdateCertificateTemplateRequest.php`
  - `rules()` : valide le logo s'il est fourni (`nullable, image, mimes:jpeg,png,svg, max:2048`) et le texte du corps du certificat (`required, string`).

### Contrôleur(s)
- `Admin\CertificateTemplateController` — `app/Http/Controllers/Admin/CertificateTemplateController.php` — méthodes :
  - `index()` : retourne `Inertia::render('admin/certificate-templates/index', ['templates' => CertificateTemplateData::fromCollection($templates)])`. Liste les templates par pôle.
  - `edit(CertificateTemplate $template)` : retourne `Inertia::render('admin/certificate-templates/edit', ['template' => CertificateTemplateData::fromModel($template)])`.
  - `update(CertificateTemplate $template, UpdateCertificateTemplateRequest $request)` : utilise `$request->validated()`, gère l'upload du logo vers le disque (storage) s'il est fourni, met à jour le template, retourne `redirect()->back()`. Ce contrôleur ne doit effectuer aucune validation manuelle.
  - `preview(CertificateTemplate $template)` : génère un PDF de prévisualisation avec des données fictives via `CertificateService`, retourne `response()->streamDownload()` (réponse binaire PDF, pas de DTO).

### Routes
- `GET /admin/certificate-templates` — nom : `admin.certificate-templates.index`, middleware : `auth, admin`
- `GET /admin/certificate-templates/{template}/edit` — nom : `admin.certificate-templates.edit`, middleware : `auth, admin`
- `PUT /admin/certificate-templates/{template}` — nom : `admin.certificate-templates.update`, middleware : `auth, admin`
- `GET /admin/certificate-templates/{template}/preview` — nom : `admin.certificate-templates.preview`, middleware : `auth, admin`

### Page(s) React (Inertia)
- `resources/js/pages/admin/certificate-templates/index.tsx` — TypeScript interface :
  ```typescript
  interface CertificateTemplateData {
      id: number;
      pole: string;
      logoUrl: string | null;
      bodyText: string;
      isActive: boolean;
      availablePlaceholders: string[];
  }

  interface CertificateTemplatesIndexPageProps {
      templates: CertificateTemplateData[];
  }
  ```
  Composants clés : `<TemplateCard>` par pôle affichant le statut et un aperçu, bouton « Éditer ».

- `resources/js/pages/admin/certificate-templates/edit.tsx` — TypeScript interface :
  ```typescript
  interface CertificateTemplateData {
      id: number;
      pole: string;
      logoUrl: string | null;
      bodyText: string;
      isActive: boolean;
      availablePlaceholders: string[];
  }

  interface EditCertificateTemplatePageProps {
      template: CertificateTemplateData;
  }
  ```
  Composants clés : `<LogoUploader>` pour le logo, `<BodyTextEditor>` (textarea avec aide pour les placeholders), `<PlaceholderList>` affichant les champs dynamiques disponibles (clic pour insérer), bouton « Prévisualiser » ouvrant le PDF dans un nouvel onglet, bouton « Sauvegarder ».

### Service(s) / Action(s)
- `CertificateService` — `app/Services/CertificateService.php` — utilisé pour la prévisualisation (et la génération finale dans UC-L08).
  - `generatePreview(CertificateTemplate $template): string` — génère un PDF avec des données fictives, retourne le contenu binaire.
  - `generate(User $user, Course $course): string` — génère le certificat final avec les données réelles de l'apprenant.
  - Utilise `barryvdh/laravel-dompdf` pour le rendu HTML → PDF.

### Dépendances externes
- `barryvdh/laravel-dompdf` (composer) — génération de PDF à partir de templates HTML/Blade
