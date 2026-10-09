# UC-A07 — Consulter les analytics apprenants

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-A07 |
| **Titre** | Consulter les analytics apprenants |
| **Acteur principal** | Administrateur |
| **Pré-conditions** | L'administrateur est authentifié avec le rôle `admin` |
| **Déclencheur** | L'administrateur accède à la section « Analytics » du back-office |

## Scénario principal (Happy Path)

1. L'administrateur accède au tableau de bord analytics.
2. Le système calcule et affiche les indicateurs globaux : nombre total d'apprenants, apprenants actifs, taux de complétion moyen, score moyen aux quiz.
3. Le système affiche les statistiques par cours : nombre d'inscrits, taux de complétion, taux de réussite aux quiz.
4. L'administrateur peut filtrer les données par pôle (Assurance, Téléphonie, Énergie).
5. L'administrateur peut filtrer les données par période (dates de début et fin).
6. Les graphiques et indicateurs se mettent à jour selon les filtres appliqués.

## Extensions (Cas alternatifs / Erreurs)

- **2a** — Aucun apprenant inscrit :
  1. Le système affiche les indicateurs à zéro avec un message « Aucun apprenant inscrit pour le moment ».

- **4a** — Aucun résultat pour le filtre sélectionné :
  1. Le système affiche un message « Aucune donnée pour les critères sélectionnés ».
  2. L'administrateur ajuste les filtres.

- **6a** — Calcul lent sur un grand volume de données :
  1. Le système affiche un indicateur de chargement pendant le calcul.
  2. Les résultats s'affichent une fois le calcul terminé.

## Post-conditions

- L'administrateur a consulté les indicateurs de performance des apprenants.
- Aucune donnée n'est modifiée (consultation seule).

## Règles métier

- Les apprenants actifs sont ceux ayant eu une activité (leçon visionnée ou quiz passé) dans les 30 derniers jours.
- Le taux de complétion est calculé comme le ratio leçons complétées / leçons totales par cours.
- Le taux de réussite aux quiz est le ratio quiz réussis / quiz tentés.
- Les filtres par pôle et période sont cumulables.

## Implémentation technique

### Modèles Eloquent
- `User` — `app/Models/User.php` — scope `scopeActive()` : filtre les utilisateurs ayant une activité récente.
- `Enrollment` — `app/Models/Enrollment.php` — relation `belongsTo(Course::class)`, `belongsTo(User::class)`.
- `LessonProgress` — `app/Models/LessonProgress.php` — champs `user_id`, `lesson_id`, `completed` (boolean).
- `QuizAttempt` — `app/Models/QuizAttempt.php` — champs `user_id`, `quiz_id`, `score`, `passed_at` (nullable).
- `Course` — `app/Models/Course.php` — champ `pole` pour le filtrage.

### Migrations
- Voir UC-L02 (`create_enrollments_table`), UC-L03 (`create_lesson_progress_table`), UC-L06 (`create_quiz_attempts_table`) — les tables nécessaires sont déjà définies.

### DTO / Response
- `AnalyticsDashboardData` — `app/DTOs/Admin/AnalyticsDashboardData.php` — readonly class, propriétés typées, `build()` static factory.
- `CourseAnalyticsData` — `app/DTOs/Admin/CourseAnalyticsData.php` — readonly class, propriétés typées.
- Convention : contrôleurs retournent UNIQUEMENT des DTOs comme props Inertia, jamais des modèles Eloquent.
- Pattern :
  ```php
  readonly class AnalyticsDashboardData {
      /**
       * @param CourseAnalyticsData[] $courseStats
       */
      public function __construct(
          public int $totalStudents,
          public int $activeStudents,
          public float $averageCompletionPercent,
          public float $averageQuizScore,
          public array $courseStats,
      ) {}

      /**
       * @param array{pole?: string, from?: string, to?: string} $filters
       */
      public static function build(array $filters): self
      {
          // Agrège les données depuis Enrollment, LessonProgress, QuizAttempt
          // Applique les filtres par pôle et période
          // Retourne une instance avec les statistiques calculées
      }
  }
  ```

  ```php
  readonly class CourseAnalyticsData {
      public function __construct(
          public int $courseId,
          public string $courseTitle,
          public string $pole,
          public int $enrolledCount,
          public float $completionRate,
          public float $quizPassRate,
      ) {}
  }
  ```

### Contrôleur(s)
- `Admin\AnalyticsController` — `app/Http/Controllers/Admin/AnalyticsController.php` — méthodes :
  - `index(Request $request)` : extrait les filtres (`pole`, `from`, `to`) depuis la query string, retourne `Inertia::render('admin/analytics/index', ['analytics' => AnalyticsDashboardData::build($filters), 'filters' => $filters])`.

### Routes
- `GET /admin/analytics` — nom : `admin.analytics.index`, middleware : `auth, admin`

### Page(s) React (Inertia)
- `resources/js/pages/admin/analytics/index.tsx` — TypeScript interfaces miroir des DTOs :
  ```typescript
  interface AnalyticsDashboardData {
      totalStudents: number;
      activeStudents: number;
      averageCompletionPercent: number;
      averageQuizScore: number;
      courseStats: CourseAnalyticsData[];
  }

  interface CourseAnalyticsData {
      courseId: number;
      courseTitle: string;
      pole: string;
      enrolledCount: number;
      completionRate: number;
      quizPassRate: number;
  }

  interface Filters {
      pole?: string;
      from?: string;
      to?: string;
  }

  interface AnalyticsPageProps {
      analytics: AnalyticsDashboardData;
      filters: Filters;
  }
  ```
  Composants clés : `<KpiCard>` pour les indicateurs globaux (total apprenants, actifs, complétion, score quiz), `<CourseStatsTable>` pour le détail par cours, `<FilterBar>` avec sélecteur de pôle et date picker, graphiques via `recharts` (barres, courbes).

### Service(s) / Action(s)
- Aucun service dédié — la logique d'agrégation est dans `AnalyticsDashboardData::build()` qui effectue les requêtes directement sur les modèles Eloquent.

### Dépendances externes
- `recharts` (npm) — bibliothèque de graphiques React pour les visualisations de données
