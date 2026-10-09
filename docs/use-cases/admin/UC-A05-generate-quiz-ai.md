# UC-A05 — Générer un quiz assisté par IA

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-A05 |
| **Titre** | Générer un quiz assisté par IA |
| **Acteur principal** | Administrateur |
| **Pré-conditions** | L'administrateur est authentifié avec le rôle `admin` ; le module existe et contient des leçons avec du contenu |
| **Déclencheur** | L'administrateur clique sur « Générer quiz IA » depuis la page d'un module |

## Scénario principal (Happy Path)

1. L'administrateur accède à la page de génération de quiz IA pour un module.
2. L'administrateur clique sur « Générer quiz IA ».
3. Le système envoie le contenu du module (titres des leçons, descriptions) à l'API OpenAI.
4. L'API OpenAI retourne une liste de questions QCM avec réponses.
5. Le système affiche les questions proposées avec des checkboxes de sélection.
6. L'administrateur revoit chaque question : il peut sélectionner/désélectionner, modifier le texte, ajuster les réponses.
7. L'administrateur confirme les questions sélectionnées.
8. Le système crée le quiz avec les questions validées (Quiz, Question, Answer).
9. Le système redirige vers la page d'édition du cours avec confirmation.

## Extensions (Cas alternatifs / Erreurs)

- **3a** — API OpenAI indisponible ou timeout :
  1. Le système affiche un message d'erreur indiquant l'indisponibilité du service IA.
  2. L'administrateur peut réessayer ou créer le quiz manuellement (UC-A04).

- **3b** — Clé API OpenAI non configurée :
  1. Le système affiche un message d'erreur invitant à configurer la clé dans les paramètres.

- **5a** — Les questions générées sont de mauvaise qualité :
  1. L'administrateur modifie les textes directement dans l'interface.
  2. L'administrateur désélectionne les questions non pertinentes.
  3. L'administrateur peut relancer la génération pour obtenir de nouvelles propositions.

- **7a** — Aucune question sélectionnée :
  1. Le système affiche un avertissement demandant de sélectionner au moins une question.
  2. L'administrateur sélectionne des questions ou annule.

## Post-conditions

- Un quiz est créé pour le module avec les questions validées par l'administrateur.
- Les questions et réponses sont persistées en base de données.
- L'administrateur a eu l'opportunité de revoir et modifier chaque question avant sauvegarde.

## Règles métier

- Les questions générées par l'IA sont des propositions : l'administrateur doit les valider.
- L'IA ne crée jamais un quiz directement sans validation humaine.
- Le contenu du module (titres, descriptions des leçons) sert de contexte pour la génération.
- Chaque question générée est sélectionnée par défaut (`selected: true`), l'admin peut désélectionner.

## Implémentation technique

### Modèles Eloquent
- `Quiz` — `app/Models/Quiz.php` — voir UC-A04 pour la définition complète.
- `Question` — `app/Models/Question.php` — voir UC-A04.
- `Answer` — `app/Models/Answer.php` — voir UC-A04.

### Migrations
- Voir UC-A04 — les tables `quizzes`, `questions`, `answers` sont déjà définies.

### DTO / Response
- `AiGeneratedQuestionData` — `app/DTOs/Admin/AiGeneratedQuestionData.php` — readonly class, propriétés typées.
- `AiGeneratedAnswerData` — `app/DTOs/Admin/AiGeneratedAnswerData.php` — readonly class.
- Convention : contrôleurs retournent UNIQUEMENT des DTOs comme props Inertia, jamais des modèles Eloquent.
- Pattern :
  ```php
  readonly class AiGeneratedQuestionData {
      /**
       * @param AiGeneratedAnswerData[] $answers
       */
      public function __construct(
          public string $body,
          public array $answers,
          public bool $selected,  // default true, admin unchecks to exclude
      ) {}
  }
  ```

  ```php
  readonly class AiGeneratedAnswerData {
      public function __construct(
          public string $body,
          public bool $isCorrect,
      ) {}
  }
  ```

### Form Request(s)
- `ConfirmAiQuizRequest` — `app/Http/Requests/Admin/ConfirmAiQuizRequest.php`
  - `rules()` : valide le tableau de questions retenues et modifiées par l'administrateur (`questions` requis, array, min:1), le texte de chaque question (`questions.*.body` requis), et leurs réponses (`questions.*.answers` requis, array, min:2). Valide également qu'au moins une réponse par question est marquée `is_correct` à `true`.

### Contrôleur(s)
- `Admin\AiQuizController` — `app/Http/Controllers/Admin/AiQuizController.php` — méthodes :
  - `generate(Module $module)` : appelle `AiQuizGeneratorService::generate($module)`, retourne `response()->json(array<AiGeneratedQuestionData>)`. Réponse JSON car appelé en AJAX.
  - `confirm(Module $module, ConfirmAiQuizRequest $request)` : utilise `$request->validated()` pour recevoir les questions validées/modifiées par l'admin, crée `Quiz`, `Question` et `Answer` dans une transaction, retourne `redirect()->route('admin.courses.edit', $module->course_id)`.

### Routes
- `POST /admin/modules/{module}/quiz/generate-ai` — nom : `admin.quizzes.generate-ai`, middleware : `auth, admin`
- `POST /admin/modules/{module}/quiz/confirm-ai` — nom : `admin.quizzes.confirm-ai`, middleware : `auth, admin`

### Page(s) React (Inertia)
- `resources/js/pages/admin/quizzes/ai-generate.tsx` — TypeScript interfaces miroir des DTOs :
  ```typescript
  interface AiGeneratedQuestionData {
      body: string;
      answers: AiGeneratedAnswerData[];
      selected: boolean;
  }

  interface AiGeneratedAnswerData {
      body: string;
      isCorrect: boolean;
  }

  interface AiGeneratePageProps {
      moduleId: number;
      moduleTitle: string;
  }
  ```
  Composants clés : bouton « Générer » déclenchant l'appel AJAX, `<AiQuestionReview>` affichant chaque question avec checkbox de sélection, édition inline du texte et des réponses, bouton « Confirmer et créer le quiz ».

### Service(s) / Action(s)
- `AiQuizGeneratorService` — `app/Services/AiQuizGeneratorService.php` — responsabilité : générer des questions QCM à partir du contenu d'un module via l'API OpenAI.
  - `generate(Module $module): array<AiGeneratedQuestionData>` — construit le prompt avec les titres et descriptions des leçons du module, appelle l'API OpenAI (modèle configurable via `config('services.openai.model')`), parse la réponse JSON structurée, retourne un tableau de `AiGeneratedQuestionData`.
  - Configuration : `config/services.php` → `openai.key` (clé API), `openai.model` (ex : 'gpt-4').

### Dépendances externes
- `openai-php/laravel` (composer) — client PHP officiel pour l'API OpenAI
- API OpenAI — génération de contenu IA (GPT-4 ou modèle configuré)
