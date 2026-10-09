# UC-A06 — Importer un quiz par scraping

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-A06 |
| **Titre** | Importer un quiz par scraping |
| **Acteur principal** | Administrateur |
| **Pré-conditions** | L'administrateur est authentifié avec le rôle `admin` ; le module existe |
| **Déclencheur** | L'administrateur clique sur « Importer un quiz » depuis la page d'un module |

## Scénario principal (Happy Path)

1. L'administrateur accède à la page d'import de quiz pour un module.
2. L'administrateur fournit une URL source contenant des questions ou uploade un fichier (HTML, PDF, texte).
3. Le système analyse le contenu et extrait les questions QCM avec leurs réponses.
4. Le système affiche les questions extraites avec un score de confiance pour chaque question.
5. L'administrateur revoit les questions : il peut modifier le texte, ajuster les réponses, exclure les questions à faible confiance.
6. L'administrateur confirme l'import des questions sélectionnées.
7. Le système crée le quiz avec les questions validées (Quiz, Question, Answer).
8. Le système redirige vers la page d'édition du cours avec confirmation.

## Extensions (Cas alternatifs / Erreurs)

- **2a** — URL inaccessible (timeout, 404, etc.) :
  1. Le système affiche un message d'erreur indiquant que l'URL est inaccessible.
  2. L'administrateur vérifie l'URL et réessaye.

- **2b** — Fichier au format non supporté :
  1. Le système affiche une erreur indiquant les formats acceptés (HTML, PDF, TXT).
  2. L'administrateur fournit un fichier dans un format accepté.

- **3a** — Aucune question détectée dans le contenu :
  1. Le système affiche un message indiquant qu'aucune question n'a été trouvée.
  2. L'administrateur essaye avec une autre source ou crée le quiz manuellement (UC-A04).

- **4a** — Questions extraites avec un faible score de confiance :
  1. Le système met en évidence les questions dont la confiance est inférieure à 0.5.
  2. L'administrateur revoit attentivement ces questions et les corrige ou les exclut.

- **6a** — Aucune question sélectionnée :
  1. Le système affiche un avertissement demandant de sélectionner au moins une question.

## Post-conditions

- Un quiz est créé pour le module avec les questions importées et validées par l'administrateur.
- Les questions et réponses sont persistées en base de données.
- L'administrateur a eu l'opportunité de revoir et modifier chaque question avant sauvegarde.

## Règles métier

- Les questions extraites par scraping sont des propositions : l'administrateur doit les valider avant import.
- Le score de confiance (0.0 à 1.0) indique la fiabilité de l'extraction.
- L'import ne crée jamais un quiz directement sans validation humaine.
- Le scraping supporte les sources URL et fichiers uploadés.

## Implémentation technique

### Modèles Eloquent
- `Quiz` — `app/Models/Quiz.php` — voir UC-A04 pour la définition complète.
- `Question` — `app/Models/Question.php` — voir UC-A04.
- `Answer` — `app/Models/Answer.php` — voir UC-A04.

### Migrations
- Voir UC-A04 — les tables `quizzes`, `questions`, `answers` sont déjà définies.

### DTO / Response
- `ScrapedQuestionData` — `app/DTOs/Admin/ScrapedQuestionData.php` — readonly class, propriétés typées.
- `ScrapedAnswerData` — `app/DTOs/Admin/ScrapedAnswerData.php` — readonly class.
- Convention : contrôleurs retournent UNIQUEMENT des DTOs comme props Inertia, jamais des modèles Eloquent.
- Pattern :
  ```php
  readonly class ScrapedQuestionData {
      /**
       * @param ScrapedAnswerData[] $answers
       */
      public function __construct(
          public string $body,
          public array $answers,
          public float $confidence,  // 0.0-1.0, extraction confidence score
      ) {}
  }
  ```

  ```php
  readonly class ScrapedAnswerData {
      public function __construct(
          public string $body,
          public bool $isCorrect,
      ) {}
  }
  ```

### Form Request(s)
- `QuizScrapeRequest` — `app/Http/Requests/Admin/QuizScrapeRequest.php`
  - `rules()` : valide que la source est fournie, soit une URL valide (`url` string), soit un fichier supporté (`file` mimes:html,pdf,txt).
- `ImportQuizRequest` — `app/Http/Requests/Admin/ImportQuizRequest.php`
  - `rules()` : valide le tableau de questions importées/modifiées (`questions` requis, array, min:1), le texte de la question (`questions.*.body` requis), et les réponses (`questions.*.answers` requis, array, min:2). Valide également qu'au moins une réponse par question est marquée `is_correct` à `true`.

### Contrôleur(s)
- `Admin\QuizImportController` — `app/Http/Controllers/Admin/QuizImportController.php` — méthodes :
  - `preview(Module $module, QuizScrapeRequest $request)` : utilise `$request->validated()` pour recevoir l'URL ou le fichier, appelle `QuizScraperService`, retourne `response()->json(array<ScrapedQuestionData>)`. Réponse JSON car appelé en AJAX.
  - `import(Module $module, ImportQuizRequest $request)` : utilise `$request->validated()` pour recevoir les questions validées/modifiées par l'admin, crée `Quiz`, `Question` et `Answer` dans une transaction, retourne `redirect()->route('admin.courses.edit', $module->course_id)`.

### Routes
- `POST /admin/modules/{module}/quiz/scrape` — nom : `admin.quizzes.scrape`, middleware : `auth, admin`
- `POST /admin/modules/{module}/quiz/import` — nom : `admin.quizzes.import`, middleware : `auth, admin`

### Page(s) React (Inertia)
- `resources/js/pages/admin/quizzes/import.tsx` — TypeScript interfaces miroir des DTOs :
  ```typescript
  interface ScrapedQuestionData {
      body: string;
      answers: ScrapedAnswerData[];
      confidence: number;
  }

  interface ScrapedAnswerData {
      body: string;
      isCorrect: boolean;
  }

  interface ImportQuizPageProps {
      moduleId: number;
      moduleTitle: string;
  }
  ```
  Composants clés : formulaire avec champ URL et input fichier, bouton « Analyser », `<ScrapedQuestionReview>` affichant chaque question avec badge de confiance (couleur selon le score), édition inline, bouton « Importer les questions sélectionnées ».

### Service(s) / Action(s)
- `QuizScraperService` — `app/Services/QuizScraperService.php` — responsabilité : extraire des questions QCM depuis une URL ou un fichier uploadé.
  - `scrapeFromUrl(string $url): array<ScrapedQuestionData>` — télécharge le contenu de l'URL, analyse le DOM avec `DomCrawler`, identifie les patterns de QCM, retourne les questions avec un score de confiance.
  - `scrapeFromFile(UploadedFile $file): array<ScrapedQuestionData>` — lit le fichier (HTML, PDF, TXT), applique la même logique d'extraction.
  - Utilise des heuristiques pour détecter les structures de questions (listes numérotées, patterns Q/A, tableaux).

### Dépendances externes
- `symfony/dom-crawler` (composer) — déjà inclus dans Laravel, utilisé pour l'analyse HTML
- `smalot/pdfparser` (composer) — extraction de texte depuis les fichiers PDF (optionnel, si support PDF requis)
