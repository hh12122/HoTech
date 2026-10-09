# UC-L10 — Consulter le catalogue de cours

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-L10 |
| **Titre** | Consulter le catalogue de cours |
| **Acteur principal** | Apprenant |
| **Pré-conditions** | L'apprenant est authentifié |
| **Déclencheur** | Action utilisateur — accès à la page « Catalogue » (`GET /courses`) |

## Scénario principal (Happy Path)

1. L'apprenant clique sur « Catalogue » dans la navigation.
2. Le système charge la liste des cours publiés (`status = published`) avec le nombre de modules et la durée totale.
3. Le système affiche chaque cours sous forme de carte : titre, description, pôle, nombre de modules, durée totale, vignette.
4. L'apprenant parcourt la liste et clique sur un cours pour voir le détail (redirection vers UC-L04 si inscrit, sinon page de présentation).

## Extensions (Cas alternatifs / Erreurs)

- **UC-L10a** — Filtre par pôle :
  1. L'apprenant sélectionne un pôle (Assurance / Téléphonie / Énergie) dans le filtre.
  2. Le système recharge la liste avec `?pole=telephonie` et n'affiche que les cours du pôle.
  3. Le filtre actif est reflété dans l'URL et le formulaire.
- **UC-L10b** — Aucun cours publié (ou aucun résultat pour le filtre) :
  1. Le système affiche un état vide : « Aucun cours disponible pour ce filtre. »

## Post-conditions

- L'apprenant a visualisé la liste des cours disponibles (aucune modification de données — consultation seule).

## Règles métier

- Seuls les cours avec `status = published` sont visibles dans le catalogue ; les brouillons (`draft`) sont réservés à l'admin (UC-A01).
- Le filtre par pôle est optionnel ; sans filtre, tous les cours publiés sont listés.

## Implémentation technique

### Modèles Eloquent
- `Course` — `app/Models/Course.php` — champs : `id`, `title`, `slug`, `description`, `pole` (enum: assurance, telephonie, energie), `status` (enum: draft, published), `thumbnail_path` (string, nullable). Relations : `modules()` → `hasMany(Module::class)`. Scopes :
  - `scopePublished()` → `where('status', 'published')`
  - `scopeForPole(string $pole)` → `where('pole', $pole)`

### Migrations
- `create_courses_table` — voir UC-A01. Colonnes utilisées ici : `title`, `slug` (unique, index), `description`, `pole`, `status` (index), `thumbnail_path`.

### DTO / Response
- Convention : contrôleurs retournent UNIQUEMENT des DTOs comme props Inertia, jamais des modèles Eloquent.
- `CatalogCourseData` — `app/DTOs/Learner/CatalogCourseData.php` :
  ```php
  readonly class CatalogCourseData {
      public function __construct(
          public int $id,
          public string $title,
          public string $slug,
          public string $description,
          public string $pole,
          public int $modulesCount,
          public int $totalDurationSeconds,
          public ?string $thumbnailUrl,
      ) {}

      public static function fromModel(Course $course): self {
          return new self(
              id: $course->id,
              title: $course->title,
              slug: $course->slug,
              description: $course->description,
              pole: $course->pole,
              modulesCount: $course->modules_count,
              totalDurationSeconds: (int) $course->modules
                  ->flatMap->lessons
                  ->sum('duration_seconds'),
              thumbnailUrl: $course->thumbnail_path
                  ? Storage::url($course->thumbnail_path)
                  : null,
          );
      }

      /** @return self[] */
      public static function fromCollection(Collection $courses): array {
          return $courses->map(fn (Course $c) => self::fromModel($c))->all();
      }
  }
  ```
- Les filtres actifs sont passés comme prop simple : `['filters' => ['pole' => 'telephonie']]`.

### Contrôleur(s)
- `Learner\CourseController` — `app/Http/Controllers/Learner/CourseController.php` :
  - `index(Request $request)` — requête :
    ```php
    $courses = Course::published()
        ->when($request->string('pole')->value(), fn ($q, $pole) => $q->forPole($pole))
        ->withCount('modules')
        ->with('modules.lessons:id,module_id,duration_seconds')
        ->get();

    return Inertia::render('learner/course-index', [
        'courses' => CatalogCourseData::fromCollection($courses),
        'filters' => $request->only(['pole']),
    ]);
    ```
  - `show()` — voir UC-L04.

### Routes
- `GET /courses` — name `courses.index`, middleware `auth`

### Page(s) React (Inertia)
- `resources/js/pages/learner/course-index.tsx` — interfaces TypeScript :
  ```ts
  interface CatalogCourseData {
      id: number;
      title: string;
      slug: string;
      description: string;
      pole: 'assurance' | 'telephonie' | 'energie';
      modulesCount: number;
      totalDurationSeconds: number;
      thumbnailUrl: string | null;
  }
  interface CourseIndexProps {
      courses: CatalogCourseData[];
      filters: { pole?: string };
  }
  ```
  Composants clés : `<CourseCard />` (vignette, titre, pôle, durée formatée, nombre de modules), `<PoleFilter />` (select avec `router.get` préservant l'état), état vide `<EmptyCatalog />`.

### Service(s) / Action(s)
- Aucun service dédié — requête Eloquent simple dans le contrôleur.

### Dépendances externes
- Aucune
