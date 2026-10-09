# UC-A09 — Configurer le seuil de réussite d'un quiz

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-A09 |
| **Titre** | Configurer le seuil de réussite d'un quiz |
| **Acteur principal** | Administrateur |
| **Pré-conditions** | L'administrateur est authentifié avec le rôle `admin` ; le quiz existe |
| **Déclencheur** | L'administrateur accède aux paramètres d'un quiz existant |

## Scénario principal (Happy Path)

1. L'administrateur accède à la page d'édition du quiz.
2. Le système affiche le formulaire du quiz avec le seuil de réussite actuel.
3. L'administrateur modifie la valeur du seuil de réussite (pourcentage).
4. L'administrateur soumet le formulaire.
5. Le système valide que le seuil est un entier entre 0 et 100.
6. Le système met à jour le champ `pass_threshold` du quiz.
7. Le système redirige vers la page d'édition avec un message de confirmation.

## Extensions (Cas alternatifs / Erreurs)

- **3a** — Valeur hors limites (inférieure à 0 ou supérieure à 100) :
  1. Le système affiche une erreur de validation : « Le seuil doit être compris entre 0 et 100 ».
  2. L'administrateur corrige la valeur et resoumet.

- **3b** — Valeur non numérique :
  1. Le système affiche une erreur de validation : « Le seuil doit être un nombre entier ».
  2. L'administrateur saisit une valeur numérique.

- **5a** — Quiz ayant déjà des tentatives enregistrées :
  1. Le système affiche un avertissement indiquant que des apprenants ont déjà passé le quiz.
  2. Le nouveau seuil ne s'applique qu'aux futures tentatives (pas de recalcul rétroactif).
  3. L'administrateur confirme la modification.

## Post-conditions

- Le seuil de réussite du quiz est mis à jour en base de données.
- Les futures tentatives de quiz seront évaluées avec le nouveau seuil.
- Les tentatives passées ne sont pas recalculées.

## Règles métier

- Le seuil de réussite est un entier compris entre 0 et 100 (pourcentage).
- La valeur par défaut est 70 %.
- La modification du seuil n'a pas d'effet rétroactif sur les tentatives déjà enregistrées.
- Le seuil détermine si un apprenant réussit le quiz (score ≥ seuil) et peut débloquer le module suivant (UC-L07).

## Implémentation technique

### Modèles Eloquent
- `Quiz` — `app/Models/Quiz.php` — champ `pass_threshold` (integer, default 70). Voir UC-A04 pour la définition complète.

### Migrations
- Voir UC-A04 (`create_quizzes_table`) — la colonne `pass_threshold` est déjà définie.

### DTO / Response
- Pas de DTO dédié — le seuil est déjà exposé dans `QuizFormData` (défini dans UC-A04) via le champ `passThreshold`.
- Convention : contrôleurs retournent UNIQUEMENT des DTOs comme props Inertia, jamais des modèles Eloquent.
- Rappel de la structure `QuizFormData` (voir UC-A04 pour le code complet) :
  ```php
  readonly class QuizFormData {
      /**
       * @param QuestionFormData[] $questions
       */
      public function __construct(
          public ?int $id,
          public int $moduleId,
          public string $moduleTitle,
          public int $passThreshold,  // ← seuil configuré ici
          public array $questions,
      ) {}

      public static function fromModel(Quiz $quiz): self;
  }
  ```

### Form Request(s)
- `UpdateQuizRequest` — `app/Http/Requests/Admin/UpdateQuizRequest.php` (partagé avec UC-A04)
  - `rules()` : valide le champ `pass_threshold` pour garantir qu'il s'agit d'un entier compris entre 0 et 100 (`integer, min:0, max:100`).

### Contrôleur(s)
- `Admin\QuizController` — `app/Http/Controllers/Admin/QuizController.php` — méthode :
  - `update(Quiz $quiz, UpdateQuizRequest $request)` : utilise `$request->validated()` pour mettre à jour `pass_threshold`, enregistre le quiz, retourne `redirect()->back()`. Ne fait aucune validation manuelle. Voir UC-A04 pour les autres méthodes du contrôleur.

### Routes
- `PUT /admin/quizzes/{quiz}` — nom : `admin.quizzes.update`, middleware : `auth, admin`. Route déjà définie dans UC-A04.

### Page(s) React (Inertia)
- `resources/js/pages/admin/quizzes/edit.tsx` — Le champ seuil est intégré dans le formulaire d'édition du quiz. TypeScript interface (voir UC-A04) :
  ```typescript
  interface QuizFormData {
      id: number | null;
      moduleId: number;
      moduleTitle: string;
      passThreshold: number;  // ← champ éditable
      questions: QuestionFormData[];
  }
  ```
  Composant clé : `<input type="number" min={0} max={100}>` pour le seuil, avec label « Seuil de réussite (%) » et indication de la valeur par défaut (70 %).

### Service(s) / Action(s)
- Aucun service dédié — la mise à jour est directement dans le contrôleur.

### Dépendances externes
- Aucune
