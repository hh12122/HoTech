# UC-L07 — Débloquer le module suivant (système)

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-L07 |
| **Titre** | Débloquer le module suivant (système) |
| **Acteur principal** | Système (automatique) |
| **Pré-conditions** | L'apprenant vient de réussir le quiz du module courant (score ≥ seuil, voir UC-L06) |
| **Déclencheur** | Événement système — création d'un `QuizAttempt` avec `passed_at` non null |

## Scénario principal (Happy Path)

1. Le système enregistre le `QuizAttempt` réussi dans `Learner\QuizController@submit` (voir UC-L06).
2. Le système crée un enregistrement `ModuleProgress` pour le module courant avec `completed_at = now()`.
3. Le système détermine le module suivant : le module du même cours avec `sort_order` immédiatement supérieur.
4. Le module suivant devient accessible : le scope `Module::scopeUnlockedFor($user)` l'inclut désormais.
5. À la prochaine consultation de la page cours (UC-L04), le module suivant apparaît avec `isUnlocked = true`.

## Extensions (Cas alternatifs / Erreurs)

- **UC-L07a** — Module courant est le dernier du cours :
  1. Aucun module suivant à débloquer.
  2. Le cours est marqué complété à 100 % ; le certificat devient disponible si le pôle est éligible (voir UC-L08).
- **UC-L07b** — `ModuleProgress` déjà existant pour ce module (quiz repassé) :
  1. Le système ne crée pas de doublon — `firstOrCreate(['user_id', 'module_id'])`.
  2. `completed_at` conserve la date de première réussite.

## Post-conditions

- Un `ModuleProgress` existe pour le module courant avec `completed_at` renseigné.
- Le module suivant (s'il existe) est déverrouillé pour cet apprenant.

## Règles métier

- La progression est linéaire imposée : un module N n'est accessible que si le module N-1 a un `ModuleProgress.completed_at` non null (ou si N est le premier module du cours).
- Le déblocage est déclenché UNIQUEMENT par la réussite du quiz du module précédent.

## Implémentation technique

### Modèles Eloquent
- `ModuleProgress` — `app/Models/ModuleProgress.php` — champs : `id`, `user_id` (foreignId), `module_id` (foreignId), `completed_at` (timestamp, nullable), timestamps. Relations : `user()` → `belongsTo(User::class)`, `module()` → `belongsTo(Module::class)`.
- `Module` — `app/Models/Module.php` — scope :
  ```php
  public function scopeUnlockedFor(Builder $query, User $user): Builder {
      // Un module est débloqué si c'est le premier du cours (sort_order minimal)
      // OU si le module précédent a un ModuleProgress complété pour cet user.
      return $query->where(function (Builder $q) use ($user) {
          $q->where('sort_order', 1)
            ->orWhereExists(function ($sub) use ($user) {
                $sub->select(DB::raw(1))
                    ->from('module_progress')
                    ->join('modules as prev', 'prev.id', '=', 'module_progress.module_id')
                    ->whereColumn('prev.course_id', 'modules.course_id')
                    ->whereColumn('prev.sort_order', '<', 'modules.sort_order')
                    ->where('module_progress.user_id', $user->id)
                    ->whereNotNull('module_progress.completed_at')
                    // aucun module intermédiaire sans progression complétée
                    ->whereNotExists(function ($gap) use ($user) {
                        $gap->select(DB::raw(1))
                            ->from('modules as mid')
                            ->whereColumn('mid.course_id', 'modules.course_id')
                            ->whereColumn('mid.sort_order', '>', 'prev.sort_order')
                            ->whereColumn('mid.sort_order', '<', 'modules.sort_order')
                            ->whereNotExists(function ($mp) use ($user) {
                                $mp->select(DB::raw(1))
                                    ->from('module_progress as mp2')
                                    ->whereColumn('mp2.module_id', 'mid.id')
                                    ->where('mp2.user_id', $user->id)
                                    ->whereNotNull('mp2.completed_at');
                            });
                    });
            });
      });
  }
  ```

### Migrations
- `create_module_progress_table` — `id`, `foreignId('user_id')->constrained()->cascadeOnDelete()`, `foreignId('module_id')->constrained()->cascadeOnDelete()`, `timestamp('completed_at')->nullable()`, timestamps. Index unique composite `(user_id, module_id)`.

### DTO / Response
- Aucun DTO spécifique — le champ `isUnlocked` est déjà exposé dans `ModuleProgressData` (voir UC-L04) :
  ```php
  // app/DTOs/Learner/ModuleProgressData.php (défini dans UC-L04)
  readonly class ModuleProgressData {
      public function __construct(
          public int $id,
          public string $title,
          public int $sortOrder,
          public int $completedLessons,
          public int $totalLessons,
          public int $percent,
          public bool $isUnlocked,  // calculé via Module::scopeUnlockedFor
      ) {}
  }
  ```

### Contrôleur(s)
- Aucun contrôleur dédié — la création de `ModuleProgress` se fait dans `Learner\QuizController@submit` (voir UC-L06) :
  ```php
  if ($passed) {
      ModuleProgress::firstOrCreate(
          ['user_id' => $user->id, 'module_id' => $quiz->module_id],
          ['completed_at' => now()],
      );
  }
  ```
- La vérification de déverrouillage à l'accès se fait via `ModulePolicy@view` — `app/Policies/ModulePolicy.php` — ou middleware `EnsureModuleUnlocked` — `app/Http/Middleware/EnsureModuleUnlocked.php` — appliqué sur les routes leçons/quiz.

### Routes
- Aucune route propre à ce use case. Le middleware `EnsureModuleUnlocked` s'applique sur :
  - `GET /lessons/{lesson}` (UC-L03/L05)
  - `GET /quizzes/{quiz}` et `POST /quizzes/{quiz}/submit` (UC-L06)

### Page(s) React (Inertia)
- Aucune page dédiée. Effet visible dans :
  - `resources/js/pages/learner/course-show.tsx` (UC-L04) — modules verrouillés affichés avec icône cadenas, non cliquables.
  - `resources/js/pages/learner/quiz-result.tsx` (UC-L06) — bouton « Continuer » vers le module suivant si `passed = true`.

### Service(s) / Action(s)
- Aucun service dédié. Si la logique de déblocage évolue (déblocage parallèle, prérequis multiples), extraire `app/Actions/UnlockNextModule.php`.

### Dépendances externes
- Aucune
