# UC-M01 — Créer un compte via webhook CRM

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-M01 |
| **Titre** | Créer un compte via webhook CRM |
| **Acteur principal** | Système (webhook Close.com) |
| **Pré-conditions** | Paiement validé côté CRM Close.com ; secret partagé `CLOSE_WEBHOOK_SECRET` configuré dans `.env` |
| **Déclencheur** | Close.com envoie un webhook HTTP POST après validation du paiement |

## Scénario principal (Happy Path)

1. Close.com déclenche un webhook POST vers `/webhooks/close` avec le payload contenant les données de l'apprenant (nom, email, pôle, langue).
2. Le contrôleur reçoit la requête et vérifie la signature HMAC via le header `X-Close-Signature` en comparant avec le secret `CLOSE_WEBHOOK_SECRET`.
3. La signature est valide : le contrôleur dispatch le job asynchrone `ProcessCloseWebhook` avec le payload.
4. Le contrôleur retourne immédiatement `200 OK` avec `{ "status": "received" }`.
5. Le job `ProcessCloseWebhook` s'exécute en arrière-plan :
   - Crée un `User` avec `name`, `email`, `password` (généré via `Str::random(12)`), `role = learner`, `locale` (depuis le payload ou défaut `fr`).
   - Crée un `Enrollment` associant le nouvel utilisateur au(x) cours correspondant(s) au pôle.
   - Déclenche l'envoi de l'email d'onboarding (voir UC-M02).

## Extensions (Cas alternatifs / Erreurs)

- **1a** — Signature HMAC invalide ou absente :
  1. Le contrôleur retourne `403 Forbidden` avec `{ "error": "Invalid signature" }`.
  2. L'événement est journalisé via `Log::warning()` avec l'IP source.

- **5a** — L'adresse email existe déjà en base :
  1. Le job vérifie `User::where('email', $payload['email'])->exists()`.
  2. Si l'utilisateur existe, le job crée uniquement le nouvel `Enrollment` sans créer de doublon.
  3. Un log `info` est enregistré mentionnant l'email déjà existant.

- **5b** — Le payload est incomplet ou mal formé (champs obligatoires manquants) :
  1. Le job échoue et lève une exception.
  2. Le système de retry de Laravel Queue réessaie jusqu'à 3 fois (`$tries = 3`).
  3. Après échec final, le job est déplacé vers la `failed_jobs` table.
  4. Une notification d'alerte est envoyée à l'administrateur via `Log::error()`.

- **5c** — Le pôle indiqué dans le payload ne correspond à aucun cours :
  1. Le job crée l'utilisateur sans enrollment.
  2. Un log `warning` est enregistré pour investigation manuelle.

## Post-conditions

- Un compte `User` existe avec `role = learner` et un mot de passe temporaire.
- Un `Enrollment` lie l'utilisateur au(x) cours de son pôle.
- L'email d'onboarding est en file d'attente (UC-M02).

## Règles métier

- La signature HMAC doit être vérifiée avant tout traitement pour garantir l'authenticité du webhook.
- Le traitement du payload est asynchrone (job queue) pour répondre rapidement à Close.com et éviter les timeouts.
- Un email ne peut correspondre qu'à un seul compte utilisateur (unicité).
- Le mot de passe temporaire est généré aléatoirement (12 caractères) ; l'utilisateur devra le modifier via le flux "mot de passe oublié" ou lors de sa première connexion.

## Implémentation technique

### Modèles Eloquent
- `User` — `app/Models/User.php` — champs : `name` (string), `email` (string, unique), `password` (string, hashed), `role` (enum: admin, learner ; default learner), `locale` (enum: fr, de, en ; default fr), `is_active` (boolean, default true). Relations : `hasMany(Enrollment::class)`, `hasMany(LessonProgress::class)`.
- `Enrollment` — `app/Models/Enrollment.php` — champs : `user_id` (foreignId), `course_id` (foreignId), `enrolled_at` (timestamp). Relations : `belongsTo(User::class)`, `belongsTo(Course::class)`.
- `Course` — `app/Models/Course.php` — champs : `title`, `slug`, `description`, `pole` (enum: assurance, telephonie, energie), `status` (enum: draft, published). Scope : `scopePublished()`, `scopeByPole(string $pole)`.

### Migrations
- `add_role_locale_is_active_to_users_table` — colonnes : `role` (string, default 'learner'), `locale` (string, default 'fr'), `is_active` (boolean, default true). Index : `index('role')`.
- `create_enrollments_table` — colonnes : `id`, `user_id` (foreignId, constrained, cascadeOnDelete), `course_id` (foreignId, constrained, cascadeOnDelete), `enrolled_at` (timestamp). Index : `unique(['user_id', 'course_id'])`.

### DTO / Response
- Aucun DTO Inertia — ce endpoint retourne une réponse JSON brute `{ "status": "received" }` destinée au caller webhook, pas à une page Inertia.

### Contrôleur(s)
- `CloseWebhookController` — `app/Http/Controllers/Webhook/CloseWebhookController.php` — méthode `handle(Request $request)` :
  1. Vérifie la signature HMAC du header `X-Close-Signature` via `hash_equals(hash_hmac('sha256', $request->getContent(), config('services.close.webhook_secret')), $signature)`.
  2. Dispatch `ProcessCloseWebhook::dispatch($request->all())`.
  3. Retourne `response()->json(['status' => 'received'], 200)`.

### Routes
- `POST /webhooks/close` — nom : `webhooks.close`, middleware : `api` (pas `auth`). CSRF exclu via `bootstrap/app.php` → `$middleware->validateCsrfTokens(except: ['webhooks/*'])`.

### Page(s) React (Inertia)
- Aucune — endpoint API webhook sans interface utilisateur.

### Service(s) / Action(s)
- `ProcessCloseWebhook` — `app/Jobs/ProcessCloseWebhook.php` — job asynchrone (implémente `ShouldQueue`). Propriétés : `$tries = 3`, `$backoff = [10, 60, 300]`. Responsabilité :
  1. Valider la structure du payload (champs `email`, `name` requis).
  2. Créer ou retrouver le `User` par email.
  3. Créer l'`Enrollment` vers le(s) cours du pôle.
  4. Déclencher `$user->notify(new OnboardingNotification($temporaryPassword))` (voir UC-M02).

### Dépendances externes
- API Close.com (webhook entrant) — documentation : [https://developer.close.com/topics/webhooks/](https://developer.close.com/topics/webhooks/)

### Configuration

- `.env` :
  ```
  CLOSE_WEBHOOK_SECRET=your-hmac-secret-here
  ```
- `config/services.php` :
  ```php
  'close' => [
      'webhook_secret' => env('CLOSE_WEBHOOK_SECRET'),
  ],
  ```
- `bootstrap/app.php` — exclusion CSRF :
  ```php
  ->withMiddleware(function (Middleware $middleware) {
      $middleware->validateCsrfTokens(except: [
          'webhooks/*',
      ]);
  })
  ```
