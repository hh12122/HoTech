# UC-L06 — Passer un quiz de module

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-L06 |
| **Titre** | Passer un quiz de module |
| **Acteur principal** | Apprenant |
| **Pré-conditions** | L'apprenant est authentifié ; toutes les leçons du module ont été visionnées (complétées) |
| **Déclencheur** | Action utilisateur — clic sur « Lancer le quiz » depuis la page du cours ou du module |

## Scénario principal (Happy Path)

1. L'apprenant accède à la page du quiz depuis la page du cours (`GET /quizzes/{quiz}`).
2. Le système vérifie que toutes les leçons du module sont complétées.
3. Le système affiche les questions QCM du quiz sans les indicateurs de réponse correcte.
4. L'apprenant répond à chaque question en sélectionnant une ou plusieurs réponses.
5. L'apprenant soumet ses réponses (`POST /quizzes/{quiz}/submit`).
6. Le système calcule le score (pourcentage de réponses correctes).
7. Le système crée un enregistrement `QuizAttempt` avec le score.
8. Le système compare le score au seuil de réussite (`pass_threshold`) du quiz.
9. Le système affiche la page de résultat : score, seuil, statut réussi/échoué, nombre de réponses correctes.

## Extensions (Cas alternatifs / Erreurs)

- **UC-L06a** — Leçons du module non toutes complétées :
  1. Le système refuse l'accès au quiz (validation `QuizSubmitRequest` échoue, 403).
  2. L'apprenant est redirigé vers la page du cours avec un message indiquant les leçons restantes.
- **UC-L06b** — Score inférieur au seuil de réussite :
  1. Le système enregistre la tentative avec `passed_at = null`.
  2. La page de résultat affiche l'échec et propose de repasser le quiz.
  3. Le module suivant reste verrouillé (voir UC-L07).
- **UC-L06c** — Soumission incomplète (questions sans réponse) :
  1. La validation retourne une erreur 422.
  2. Le formulaire affiche les questions manquantes.

## Post-conditions

- Un `QuizAttempt` est persisté avec le score calculé.
- Si le score ≥ seuil : `passed_at` est renseigné et le déblocage du module suivant est déclenché (UC-L07).
- Si le score < seuil : l'apprenant peut repasser le quiz.

## Règles métier

- Le seuil de réussite est configurable par quiz (`pass_threshold`, défaut 70 %) — voir UC-A09.
- Les réponses correctes (`is_correct`) ne sont JAMAIS envoyées au frontend avant soumission.
- Le nombre de tentatives est illimité par défaut ; une notification est envoyée après X échecs (voir UC-M03).

## Implémentation technique

### Modèles Eloquent
- `Quiz` — `app/Models/Quiz.php` — champs : `id`, `module_id` (foreignId), `pass_threshold` (integer, default 70). Relations : `module()` → `belongsTo(Module::class)`, `questions()` → `hasMany(Question::class)`, `attempts()` → `hasMany(QuizAttempt::class)`.
- `Question` — `app/Models/Question.php` — champs : `id`, `quiz_id` (foreignId), `body` (text), `type` (enum: mcq). Relations : `quiz()` → `belongsTo(Quiz::class)`, `answers()` → `hasMany(Answer::class)`.
- `Answer` — `app/Models/Answer.php` — champs : `id`, `question_id` (foreignId), `body` (string), `is_correct` (boolean). Relations : `question()` → `belongsTo(Question::class)`.
- `QuizAttempt` — `app/Models/QuizAttempt.php` — champs : `id`, `user_id` (foreignId), `quiz_id` (foreignId), `score` (integer), `passed_at` (timestamp, nullable), `created_at`. Relations : `user()` → `belongsTo(User::class)`, `quiz()` → `belongsTo(Quiz::class)`.
- `LessonProgress` — `app/Models/LessonProgress.php` — utilisé pour vérifier que toutes les leçons du module sont complétées.

### Migrations
- `create_quizzes_table` — `id`, `foreignId('module_id')->constrained()->cascadeOnDelete()`, `integer('pass_threshold')->default(70)`, timestamps. Index unique sur `module_id` (un seul quiz par module).
- `create_questions_table` — `id`, `foreignId('quiz_id')->constrained()->cascadeOnDelete()`, `text('body')`, `string('type')->default('mcq')`, timestamps.
- `create_answers_table` — `id`, `foreignId('question_id')->constrained()->cascadeOnDelete()`, `string('body')`, `boolean('is_correct')->default(false)`, timestamps.
- `create_quiz_attempts_table` — `id`, `foreignId('user_id')->constrained()->cascadeOnDelete()`, `foreignId('quiz_id')->constrained()->cascadeOnDelete()`, `integer('score')`, `timestamp('passed_at')->nullable()`, timestamps. Index composite `(user_id, quiz_id)`.

### DTO / Response
- Convention : contrôleurs retournent UNIQUEMENT des DTOs comme props Inertia, jamais des modèles Eloquent.
- `QuizShowData` — `app/DTOs/Learner/QuizShowData.php` :
  ```php
  readonly class QuizShowData {
      /** @param QuestionData[] $questions */
      public function __construct(
          public int $id,
          public string $moduleTitle,
          public int $passThreshold,
          public array $questions,
          public int $attemptsCount,
      ) {}

      public static function fromQuiz(Quiz $quiz, User $user): self {
          return new self(
              id: $quiz->id,
              moduleTitle: $quiz->module->title,
              passThreshold: $quiz->pass_threshold,
              questions: $quiz->questions
                  ->map(fn (Question $q) => QuestionData::fromModel($q))
                  ->all(),
              attemptsCount: $quiz->attempts()->where('user_id', $user->id)->count(),
          );
      }
  }
  ```
- `QuestionData` — `app/DTOs/Learner/QuestionData.php` :
  ```php
  readonly class QuestionData {
      /** @param AnswerOptionData[] $answers */
      public function __construct(
          public int $id,
          public string $body,
          public array $answers,
      ) {}

      public static function fromModel(Question $question): self {
          return new self(
              id: $question->id,
              body: $question->body,
              answers: $question->answers
                  ->map(fn (Answer $a) => AnswerOptionData::fromModel($a))
                  ->all(),
          );
      }
  }
  ```
- `AnswerOptionData` — `app/DTOs/Learner/AnswerOptionData.php` :
  ```php
  readonly class AnswerOptionData {
      public function __construct(
          public int $id,
          public string $body,
          // is_correct n'est JAMAIS envoyé au frontend
      ) {}

      public static function fromModel(Answer $answer): self {
          return new self(id: $answer->id, body: $answer->body);
      }
  }
  ```
- `QuizResultData` — `app/DTOs/Learner/QuizResultData.php` :
  ```php
  readonly class QuizResultData {
      public function __construct(
          public int $score,
          public int $passThreshold,
          public bool $passed,
          public int $correctCount,
          public int $totalQuestions,
      ) {}
  }
  ```

### Form Request(s)
- `QuizSubmitRequest` — `app/Http/Requests/Learner/QuizSubmitRequest.php`
  - `authorize()` : vérifie de manière stricte que toutes les leçons du module sont complétées par l'apprenant.
  - `rules()` : valide que le tableau de réponses est fourni (`answers` requis, array) et que chaque réponse correspond à une option valide pour la question (`answers.*` requis, existe dans la table correspondante).

### Contrôleur(s)
- `Learner\QuizController` — `app/Http/Controllers/Learner/QuizController.php` :
  - `show(Quiz $quiz)` — vérifie l'accès, retourne `Inertia::render('learner/quiz-show', ['quiz' => QuizShowData::fromQuiz($quiz, $request->user())])`.
  - `submit(Quiz $quiz, QuizSubmitRequest $request)` — utilise `$request->validated()`, calcule le score en comparant les réponses soumises aux `Answer.is_correct` en base, crée `QuizAttempt`, déclenche UC-L07 si réussi, retourne `Inertia::render('learner/quiz-result', ['result' => new QuizResultData(...)])`. Aucune validation manuelle n'est effectuée dans le contrôleur.

### Routes
- `GET /quizzes/{quiz}` — name `quizzes.show`, middleware `auth`
- `POST /quizzes/{quiz}/submit` — name `quizzes.submit`, middleware `auth`

### Page(s) React (Inertia)
- `resources/js/pages/learner/quiz-show.tsx` — interfaces TypeScript :
  ```ts
  interface QuizShowData {
      id: number;
      moduleTitle: string;
      passThreshold: number;
      questions: QuestionData[];
      attemptsCount: number;
  }
  interface QuestionData { id: number; body: string; answers: AnswerOptionData[] }
  interface AnswerOptionData { id: number; body: string }
  ```
  Composants clés : `<QuizForm />` (gère les sélections par question), soumission via `router.post`.
- `resources/js/pages/learner/quiz-result.tsx` — interface :
  ```ts
  interface QuizResultData {
      score: number;
      passThreshold: number;
      passed: boolean;
      correctCount: number;
      totalQuestions: number;
  }
  ```
  Composants clés : `<ScoreGauge percent={score} />`, bouton « Repasser le quiz » si échec, bouton « Continuer » vers le module suivant si réussi.

### Service(s) / Action(s)
- Aucun service dédié — la logique de calcul de score tient dans `QuizController@submit` (comparaison des IDs de réponses soumises avec `Answer::where('is_correct', true)`). Si la logique grossit (pondération, questions multi-réponses), extraire `app/Actions/GradeQuizAttempt.php`.

### Dépendances externes
- Aucune
