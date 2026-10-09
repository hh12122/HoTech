# UC-L01 — Se connecter à la plateforme

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-L01 |
| **Titre** | Se connecter à la plateforme |
| **Acteur principal** | Apprenant |
| **Pré-conditions** | Compte créé via webhook CRM (UC-M01) |
| **Déclencheur** | L'apprenant accède à la page de connexion |

## Scénario principal (Happy Path)

1. L'apprenant accède à la page de connexion (`/login`).
2. L'apprenant saisit son adresse email et son mot de passe.
3. Le système valide les identifiants via Laravel Fortify.
4. Le système crée une session authentifiée.
5. Le système redirige l'apprenant vers le tableau de bord (`/dashboard`).

## Extensions (Cas alternatifs / Erreurs)

- **UC-L01a** — Mot de passe oublié :
  1. L'apprenant clique sur « Mot de passe oublié ».
  2. Le système affiche le formulaire de réinitialisation (Fortify password reset).
  3. L'apprenant saisit son email.
  4. Le système envoie un lien de réinitialisation par email.
  5. L'apprenant définit un nouveau mot de passe et se connecte.

- **UC-L01b** — Compte inexistant :
  1. L'apprenant saisit un email non enregistré.
  2. Le système retourne une erreur 422 avec le message « Ces identifiants ne correspondent à aucun compte ».

- **UC-L01c** — Mot de passe incorrect :
  1. L'apprenant saisit un mot de passe invalide.
  2. Le système retourne une erreur 422 avec le message « Ces identifiants ne correspondent à aucun compte ».

## Post-conditions

- L'apprenant dispose d'une session authentifiée.
- L'apprenant est redirigé vers le tableau de bord.

## Règles métier

- Les comptes sont créés exclusivement via le webhook CRM (UC-M01) ou manuellement par un administrateur (UC-A08). L'apprenant ne peut pas s'inscrire lui-même.
- Après plusieurs tentatives échouées, le rate limiter de Fortify bloque temporairement les connexions.

## Implémentation technique

### Modèles Eloquent
- `User` — `app/Models/User.php` — champs : `id`, `name`, `email`, `password`, `role` (enum: admin, learner), `locale` (enum: fr, de, en), `is_active` (boolean), `email_verified_at`, `remember_token`, `created_at`, `updated_at`. Relations : `enrollments()`, `lessonProgresses()`, `quizAttempts()`.

### Migrations
- `0001_01_01_000000_create_users_table` — colonnes existantes (`id`, `name`, `email`, `password`, `email_verified_at`, `remember_token`, `timestamps`). Colonnes à ajouter via migration dédiée : `role` (string, default `'learner'`), `locale` (string, default `'fr'`), `is_active` (boolean, default `true`).

### DTO / Response
- Aucun DTO spécifique — Fortify gère intégralement le cycle d'authentification (validation, session, redirection). Aucune réponse Inertia personnalisée n'est nécessaire pour ce use case.
- Convention : contrôleurs retournent UNIQUEMENT des DTOs comme props Inertia, jamais des modèles Eloquent.

### Contrôleur(s)
- Aucun contrôleur personnalisé — Fortify fournit `AuthenticatedSessionController` en interne. La configuration se fait dans `config/fortify.php` et `app/Providers/FortifyServiceProvider.php`.

### Routes
- `GET /login` — nom `login`, middleware `guest` — affiche la page de connexion (géré par Fortify)
- `POST /login` — nom `login.store`, middleware `guest` — traite la connexion (géré par Fortify)
- `POST /logout` — nom `logout`, middleware `auth` — déconnexion (géré par Fortify)
- `GET /forgot-password` — nom `password.request`, middleware `guest` — formulaire de réinitialisation
- `POST /forgot-password` — nom `password.email`, middleware `guest` — envoi du lien

### Page(s) React (Inertia)
- `resources/js/pages/auth/login.tsx` — page de connexion existante. Formulaire avec champs `email` et `password`, lien vers mot de passe oublié.

### Service(s) / Action(s)
- Aucun service personnalisé — Fortify gère l'authentification via ses actions par défaut (`AttemptToAuthenticate`, `EnsureLoginIsNotThrottled`, etc.).

### Dépendances externes
- `laravel/fortify` (composer) — déjà installé et configuré.
