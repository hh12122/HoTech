# Repository Guidelines

## Project Overview
HoTech LMS is a specialized learning management system covering "telephonie" and "energie" poles. The application handles course/module/lesson tracking, quiz assessments with pass thresholds, quiz importing via DOM scraping, certificate PDF generation, and learner analytics.

## Architecture & Data Flow
- **Stack**: Laravel 12 backend, React 19 frontend, Inertia.js v2 bridge, and Laravel Wayfinder for end-to-end typed route actions.
- **Pattern**: Clean architecture emphasizing thin controllers orchestrating requests.
- **Data Flow**: 
  1. Client action triggers Inertia route/form submission.
  2. Laravel intercepts via `routes/web.php`.
  3. Validation occurs via custom `FormRequest` classes.
  4. Controller injects specific `Services` (business logic) or maps inputs to strongly-typed `DTOs`.
  5. Models retrieve/store data, returning an Inertia render response.

## Key Directories
- `app/Http/Controllers/`: Standard MVC controllers. Admin capabilities are grouped under `app/Http/Controllers/Admin/`.
- `app/Http/Requests/`: FormRequests handling validation (often complex, e.g., cross-field dependencies).
- `app/Services/`: Encapsulated domain and integration logic (e.g., `QuizScraperService`, `CertificateService`).
- `app/DTOs/`: Readonly PHP 8.2+ DTOs used to pass structured data (e.g., `CourseFormData`, `ScrapedQuestionData`).
- `database/`: Anonymous migration classes with strict foreign key constraints (`cascadeOnDelete`), factories, and seeders.
- `resources/js/`: React frontend containing `pages/` (routed views) and `components/ui/` (Radix UI / shadcn base components).

## Development Commands
- `composer setup`: Full project initialization (installs dependencies, `.env`, generates keys, runs migrations, builds frontend).
- `composer dev`: Starts both the Vite dev server and the Laravel server concurrently.
- `npm run build`: Bundles production client assets via Vite.
- `composer test`: Clears config cache, runs Laravel Pint for formatting, and executes the PHPUnit test suite.
- `php artisan migrate`: Runs database migrations against the local SQLite database.

## Code Conventions & Common Patterns
- **Backend (PHP 8.2+)**:
  - **Dependency Injection**: Services must be injected via controller constructors.
  - **Validation**: MUST use `FormRequest` classes; avoid inline controller validation.
  - **Data Transfer**: Use readonly DTOs to ferry complex arrays or nested objects between controllers, services, and Inertia.
  - **Models**: Explicitly define mass-assignment protection using `$fillable` or `$guarded = []`. Use strict type casts (`'completed' => 'boolean'`). Use Scopes (e.g., `scopeActive`) for frequent queries.
- **Frontend (React 19 + TypeScript)**:
  - **State Management**: Handled server-side and bridged via Inertia's props and `useForm()` hook. URL query parameters drive filtering (e.g., in analytics).
  - **Async Patterns**: Favor Inertia's `useForm` for submissions. Use standard `axios` for localized API fetching (like scraping preview data).
  - **Styling**: Tailwind CSS v4. Standard utility classes combined via `twMerge` and `clsx` (`cn()` utility). 
  - **Components**: Functional components utilizing Radix UI primitives. Icons from `lucide-react`.

## Important Files
- `routes/web.php` & `routes/settings.php`: Primary routing definitions. Use named routes consistently (e.g., `route('admin.students.index')`).
- `resources/css/app.css`: **Tailwind v4 Configuration**. There is *no* `tailwind.config.js`. Theme tokens, custom variants, and imports live here.
- `vite.config.ts`: Bundler configuration integrating Laravel Vite plugin and React Compiler.
- `app/Http/Middleware/HandleInertiaRequests.php`: Intercepts responses to attach global shared props (e.g., authenticated user data) to React views.
- `phpunit.xml`: Defines testing environments (in-memory SQLite, array cache/session).

## Runtime/Tooling Preferences
- **Runtime**: PHP >= 8.2 (CI validates 8.4/8.5). Node 22 for frontend compilation.
- **Package Managers**: Composer v2 (Backend) and npm (Frontend). *Do not use Bun or Yarn.*
- **Database**: SQLite is the default database connection out-of-the-box (`database/database.sqlite`).
- **Formatting**: Laravel Pint (`composer test` invokes it) and Prettier (`.prettierrc`).

## Testing & QA
- **Framework**: **PHPUnit 11**. *Pest is not used in this repository.*
- **Structure**: 
  - `tests/Unit/` for isolated tests.
  - `tests/Feature/` for integration, API, and HTTP flow tests.
- **Execution**: Run via `composer test` or `./vendor/bin/phpunit`.
- **Patterns**:
  - Reset database state using the `use RefreshDatabase;` trait.
  - Assert endpoints via named routes (`$this->post(route('login'), [...])`).
  - Expect standard response assertions (`$response->assertOk()`, `$response->assertValid()`, `$this->assertAuthenticated()`).
- **Frontend Testing**: Not currently configured, but future integration relies on React Testing Library. Rely on manual QA or backend Feature tests covering Inertia endpoints for now.