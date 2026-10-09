# UC-A04 — Créer un quiz pour un module

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-A04 |
| **Titre** | Créer un quiz pour un module |
| **Acteur principal** | Administrateur |
| **Pré-conditions** | L'administrateur est authentifié avec le rôle `admin` ; le module existe et n'a pas encore de quiz |
| **Déclencheur** | L'administrateur clique sur « Créer un quiz » depuis la page d'édition d'un module |

## Scénario principal (Happy Path)

1. L'administrateur accède au formulaire de création de quiz pour un module donné.
2. Le système affiche un formulaire vide avec le titre du module et le seuil de réussite par défaut (70 %).
3. L'administrateur définit le seuil de réussite souhaité.
4. L'administrateur ajoute une première question (texte de la question).
5. L'administrateur ajoute les réponses possibles pour cette question (minimum 2).
6. L'administrateur coche la ou les réponses correctes.
7. L'administrateur répète les étapes 4-6 pour chaque question supplémentaire.
8. L'administrateur soumet le formulaire.
9. Le système valide les données : chaque question a au moins une réponse correcte.
10. Le système crée le quiz, les questions et les réponses en base de données.
11. Le système redirige vers la page d'édition du cours avec confirmation.

## Extensions (Cas alternatifs / Erreurs)

- **5a** — Moins de 2 réponses pour une question :
  1. Le système affiche une erreur de validation demandant au moins 2 réponses par question.
  2. L'administrateur ajoute les réponses manquantes.

- **6a** — Aucune réponse marquée comme correcte :
  1. Le système affiche une erreur de validation.
  2. L'administrateur coche au moins une réponse correcte.

- **8a** — Aucune question ajoutée :
  1. Le système affiche une erreur indiquant qu'un quiz doit contenir au moins une question.
  2. L'administrateur ajoute au moins une question.

- **9a** — Module possède déjà un quiz :
  1. Le système redirige vers l'édition du quiz existant au lieu de la création.

## Post-conditions

- Un quiz est créé et associé au module.
- Toutes les questions et leurs réponses sont persistées en base.
- Le seuil de réussite est enregistré.

## Règles métier

- Un module ne peut avoir qu'un seul quiz.
- Chaque question doit avoir au moins 2 réponses et au moins 1 réponse correcte.
- Le seuil de réussite est un entier entre 0 et 100 (pourcentage).
- Le seuil par défaut est de 70 %.

## Implémentation technique

### Modèles Eloquent
- `Quiz` — `app/Models/Quiz.php` — champs : `id`, `module_id` (foreignId, unique), `pass_threshold` (integer, default 70). Relations : `belongsTo(Module::class)`, `hasMany(Question::class)`, `hasMany(QuizAttempt::class)`.
- `Question` — `app/Models/Question.php` — champs : `id`, `quiz_id` (foreignId), `body` (text), `type` (string, default 'mcq'). Relations : `belongsTo(Quiz::class)`, `hasMany(Answer::class)`.
- `Answer` — `app/Models/Answer.php` — champs : `id`, `question_id` (foreignId), `body` (text), `is_correct` (boolean, default false). Relations : `belongsTo(Question::class)`.

### Migrations
- `create_quizzes_table` — colonnes : `id` (bigIncrements), `module_id` (foreignId, constrained, cascadeOnDelete, unique), `pass_threshold` (integer, default 70), `timestamps`. Index : `unique('module_id')`.
- `create_questions_table` — colonnes : `id` (bigIncrements), `quiz_id` (foreignId, constrained, cascadeOnDelete), `body` (text), `type` (string, default 'mcq'), `timestamps`. Index : `index('quiz_id')`.
- `create_answers_table` — colonnes : `id` (bigIncrements), `question_id` (foreignId, constrained, cascadeOnDelete), `body` (text), `is_correct` (boolean, default false), `timestamps`. Index : `index('question_id')`.

### DTO / Response
- `QuizFormData` — `app/DTOs/Admin/QuizFormData.php` — readonly class, propriétés typées, `empty()` et `fromModel()` static factories.
- `QuestionFormData` — `app/DTOs/Admin/QuestionFormData.php` — readonly class.
- `AnswerFormData` — `app/DTOs/Admin/AnswerFormData.php` — readonly class.
- Convention : contrôleurs retournent UNIQUEMENT des DTOs comme props Inertia, jamais des modèles Eloquent.
- Pattern :
  ```php
  readonly class QuizFormData {
      /**
       * @param QuestionFormData[] $questions
       */
      public function __construct(
          public ?int $id,
          public int $moduleId,
          public string $moduleTitle,
          public int $passThreshold,
          public array $questions,
      ) {}

      public static function empty(Module $module): self
      {
          return new self(
              id: null,
              moduleId: $module->id,
              moduleTitle: $module->title,
              passThreshold: 70,
              questions: [],
          );
      }

      public static function fromModel(Quiz $quiz): self
      {
          return new self(
              id: $quiz->id,
              moduleId: $quiz->module_id,
              moduleTitle: $quiz->module->title,
              passThreshold: $quiz->pass_threshold,
              questions: $quiz->questions->map(fn (Question $q) => new QuestionFormData(
                  id: $q->id,
                  body: $q->body,
                  answers: $q->answers->map(fn (Answer $a) => new AnswerFormData(
                      id: $a->id,
                      body: $a->body,
                      isCorrect: $a->is_correct,
                  ))->all(),
              ))->all(),
          );
      }
  }
  ```

  ```php
  readonly class QuestionFormData {
      /**
       * @param AnswerFormData[] $answers
       */
      public function __construct(
          public ?int $id,
          public string $body,
          public array $answers,
      ) {}
  }
  ```

  ```php
  readonly class AnswerFormData {
      public function __construct(
          public ?int $id,
          public string $body,
          public bool $isCorrect,
      ) {}
  }
  ```

### Form Request(s)
- `StoreQuizRequest` et `UpdateQuizRequest` — `app/Http/Requests/Admin/`
  - `rules()` : valide le seuil (`pass_threshold` entier entre 0 et 100, requis), le tableau de questions (`questions` requis, tableau, min:1), et les réponses imbriquées (`questions.*.answers` requis, tableau, min:2). Une règle de validation personnalisée ou une fermeture doit vérifier qu'au moins une réponse par question possède la clé `is_correct` à `true`.

### Contrôleur(s)
- `Admin\QuizController` — `app/Http/Controllers/Admin/QuizController.php` — méthodes :
  - `create(Module $module)` : retourne `Inertia::render('admin/quizzes/create', ['form' => QuizFormData::empty($module)])`.
  - `store(Module $module, StoreQuizRequest $request)` : utilise `$request->validated()`, crée le `Quiz`, les `Question` et les `Answer` dans une transaction, redirige vers `admin.courses.edit`.
  - `edit(Quiz $quiz)` : retourne `Inertia::render('admin/quizzes/edit', ['form' => QuizFormData::fromModel($quiz)])`.
  - `update(Quiz $quiz, UpdateQuizRequest $request)` : utilise `$request->validated()`, met à jour le quiz et ses questions/réponses dans une transaction, redirige vers `redirect()->back()`. Ce contrôleur ne fait aucune validation manuelle.

### Routes
- `GET /admin/modules/{module}/quiz/create` — nom : `admin.quizzes.create`, middleware : `auth, admin`
- `POST /admin/modules/{module}/quiz` — nom : `admin.quizzes.store`, middleware : `auth, admin`
- `GET /admin/quizzes/{quiz}/edit` — nom : `admin.quizzes.edit`, middleware : `auth, admin`
- `PUT /admin/quizzes/{quiz}` — nom : `admin.quizzes.update`, middleware : `auth, admin`

### Page(s) React (Inertia)
- `resources/js/pages/admin/quizzes/create.tsx` — TypeScript interfaces miroir des DTOs :
  ```typescript
  interface QuizFormData {
      id: number | null;
      moduleId: number;
      moduleTitle: string;
      passThreshold: number;
      questions: QuestionFormData[];
  }

  interface QuestionFormData {
      id: number | null;
      body: string;
      answers: AnswerFormData[];
  }

  interface AnswerFormData {
      id: number | null;
      body: string;
      isCorrect: boolean;
  }

  interface CreateQuizPageProps {
      form: QuizFormData;
  }
  ```
  Composants clés : `<QuizForm>` avec formulaire dynamique, `<QuestionEditor>` pour chaque question, boutons « Ajouter question » et « Ajouter réponse », checkbox pour marquer les réponses correctes.

### Service(s) / Action(s)
- Aucun service dédié — la logique de création est dans le contrôleur avec une transaction DB.

### Dépendances externes
- Aucune
