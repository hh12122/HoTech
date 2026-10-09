# UC-M02 — Envoyer l'email d'onboarding

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-M02 |
| **Titre** | Envoyer l'email d'onboarding |
| **Acteur principal** | Système (déclenché par UC-M01) |
| **Pré-conditions** | Compte apprenant créé via le job `ProcessCloseWebhook` (UC-M01) |
| **Déclencheur** | Fin de la création du compte utilisateur dans le job `ProcessCloseWebhook` |

## Scénario principal (Happy Path)

1. Le job `ProcessCloseWebhook` (UC-M01) termine la création du `User` et de l'`Enrollment`.
2. Le job déclenche `$user->notify(new OnboardingNotification($temporaryPassword))`.
3. La notification `OnboardingNotification` compose un email contenant :
   - Les identifiants de connexion (email + mot de passe temporaire).
   - Un lien direct vers la page de login.
   - Les instructions de première connexion et de changement de mot de passe.
4. Le système détermine la langue de l'email via `$user->locale` (fr, de ou en).
5. L'email est envoyé via le mailer configuré (SMTP, SES, etc.).
6. L'apprenant reçoit l'email dans sa boîte de réception.

## Extensions (Cas alternatifs / Erreurs)

- **5a** — Le serveur mail est indisponible :
  1. Laravel Queue réessaie l'envoi automatiquement (la notification est envoyée via le job déjà en queue).
  2. Après épuisement des tentatives, le job est déplacé vers `failed_jobs`.
  3. L'administrateur est alerté via les logs.

- **5b** — L'adresse email est invalide ou inexistante :
  1. Le mailer retourne un bounce.
  2. L'erreur est journalisée via le listener `MessageFailed` de Laravel.

- **4a** — La locale de l'utilisateur n'est pas supportée :
  1. Le système utilise la locale par défaut `fr` comme fallback via la configuration `app.fallback_locale`.

## Post-conditions

- L'apprenant a reçu un email contenant ses identifiants et un lien de connexion.
- L'email est dans la langue préférée de l'utilisateur.

## Règles métier

- L'email d'onboarding est multilingue : le contenu est traduit en français, allemand ou anglais selon la `locale` de l'utilisateur.
- Le mot de passe temporaire est inclus en clair dans l'email (une seule fois) ; l'utilisateur est invité à le modifier.
- L'email contient obligatoirement : identifiants, lien de login, instructions de démarrage.

## Implémentation technique

### Modèles Eloquent
- `User` — `app/Models/User.php` — utilise le trait `Notifiable`. Champ `locale` (enum: fr, de, en) utilisé pour déterminer la langue de la notification.

### Migrations
- Aucune migration supplémentaire — la colonne `locale` sur `users` est créée dans UC-M01.

### DTO / Response
- Aucun DTO — notification email sans réponse Inertia. L'email est une notification Laravel standard, pas une page web.

### Contrôleur(s)
- Aucun contrôleur dédié — l'envoi est déclenché depuis le job `ProcessCloseWebhook` (UC-M01), pas depuis une route HTTP.

### Routes
- Aucune route — l'envoi est interne au système (job queue → notification).

### Page(s) React (Inertia)
- Aucune — notification email sans interface utilisateur.

### Service(s) / Action(s)
- `OnboardingNotification` — `app/Notifications/OnboardingNotification.php` — notification Laravel implémentant `ShouldQueue`. Responsabilité : composer et envoyer l'email d'onboarding multilingue.

  Structure :
  ```php
  class OnboardingNotification extends Notification implements ShouldQueue
  {
      use Queueable;

      public function __construct(
          private readonly string $temporaryPassword,
      ) {}

      public function via(object $notifiable): array
      {
          return ['mail'];
      }

      public function toMail(object $notifiable): MailMessage
      {
          $locale = $notifiable->locale ?? config('app.fallback_locale', 'fr');

          return (new MailMessage)
              ->subject(__('onboarding.subject', [], $locale))
              ->greeting(__('onboarding.greeting', ['name' => $notifiable->name], $locale))
              ->line(__('onboarding.intro', [], $locale))
              ->line(__('onboarding.email_label', ['email' => $notifiable->email], $locale))
              ->line(__('onboarding.password_label', ['password' => $this->temporaryPassword], $locale))
              ->action(__('onboarding.login_button', [], $locale), url('/login'))
              ->line(__('onboarding.change_password_reminder', [], $locale));
      }
  }
  ```

- Déclenchement dans `ProcessCloseWebhook` :
  ```php
  // Après création du User
  $temporaryPassword = Str::random(12);
  $user = User::create([
      'name'     => $payload['name'],
      'email'    => $payload['email'],
      'password' => Hash::make($temporaryPassword),
      'role'     => 'learner',
      'locale'   => $payload['locale'] ?? 'fr',
  ]);

  $user->notify(new OnboardingNotification($temporaryPassword));
  ```

- Templates de traduction (fichiers lang) :
  - `resources/lang/fr/onboarding.php` — messages en français.
  - `resources/lang/de/onboarding.php` — messages en allemand.
  - `resources/lang/en/onboarding.php` — messages en anglais.

  Exemple `resources/lang/fr/onboarding.php` :
  ```php
  return [
      'subject'                  => 'Bienvenue sur la plateforme ISF',
      'greeting'                 => 'Bonjour :name,',
      'intro'                    => 'Votre compte a été créé avec succès. Voici vos identifiants de connexion :',
      'email_label'              => 'Email : :email',
      'password_label'           => 'Mot de passe temporaire : :password',
      'login_button'             => 'Se connecter',
      'change_password_reminder' => 'Nous vous recommandons de changer votre mot de passe dès votre première connexion.',
  ];
  ```

- Template Blade (optionnel, si personnalisation avancée) :
  - `resources/views/mail/onboarding.blade.php` — surcharge du template mail par défaut si nécessaire.

### Dépendances externes
- Serveur SMTP ou service d'envoi d'emails (Amazon SES, Mailgun, Postmark, etc.) — configuré via `MAIL_MAILER` dans `.env`.

### Configuration

- `.env` :
  ```
  MAIL_MAILER=smtp
  MAIL_HOST=smtp.example.com
  MAIL_PORT=587
  MAIL_USERNAME=your-username
  MAIL_PASSWORD=your-password
  MAIL_ENCRYPTION=tls
  MAIL_FROM_ADDRESS=noreply@isf-platform.com
  MAIL_FROM_NAME="ISF EdTech"
  ```
- `config/mail.php` — configuration standard Laravel (déjà présent par défaut dans le framework).
