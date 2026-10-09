# UC-M03 — Envoyer des notifications transactionnelles

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-M03 |
| **Titre** | Envoyer des notifications transactionnelles |
| **Acteur principal** | Système (événements applicatifs et commande planifiée) |
| **Pré-conditions** | Compte apprenant existant avec adresse email valide |
| **Déclencheur** | Trois événements distincts : (1) certificat disponible, (2) quiz échoué N fois, (3) inactivité prolongée |

## Scénario principal (Happy Path)

### Scénario A — Certificat disponible

1. L'apprenant termine un cours à 100 % (dernier quiz réussi) d'un pôle éligible (Téléphonie ou Énergie).
2. Lors de la première génération du certificat via `Learner\CertificateController@download`, le système vérifie qu'aucune notification de certificat n'a encore été envoyée pour ce couple (user, course).
3. Le système déclenche `$user->notify(new CertificateAvailableNotification($course))`.
4. L'apprenant reçoit un email l'informant que son certificat est disponible au téléchargement avec un lien direct.

### Scénario B — Quiz échoué plusieurs fois

1. L'apprenant soumet un quiz et obtient un score inférieur au seuil de réussite.
2. Le contrôleur `Learner\QuizController@submit` compte le nombre de tentatives échouées via `QuizAttempt::where('user_id', $user->id)->where('quiz_id', $quiz->id)->whereNull('passed_at')->count()`.
3. Si le nombre de tentatives échouées atteint le seuil configurable (par défaut 3), le système déclenche `$user->notify(new QuizFailedNotification($quiz, $attemptsCount))`.
4. L'apprenant reçoit un email d'encouragement avec des conseils pour réussir le quiz.

### Scénario C — Rappel d'inactivité

1. La commande planifiée `reminders:inactivity` s'exécute quotidiennement via le scheduler Laravel.
2. La commande interroge les utilisateurs dont la dernière activité (`last_activity_at`) dépasse N jours (configurable, par défaut 14 jours).
3. Pour chaque utilisateur inactif identifié, le système déclenche `$user->notify(new InactivityReminderNotification())`.
4. L'apprenant reçoit un email de rappel l'invitant à reprendre sa formation.

## Extensions (Cas alternatifs / Erreurs)

- **A.2a** — Le cours appartient au pôle Assurance (AFA) :
  1. Aucun certificat n'est généré et aucune notification n'est envoyée.

- **A.3a** — La notification de certificat a déjà été envoyée pour ce couple (user, course) :
  1. Le système ne renvoie pas la notification (vérification via `DatabaseNotification` ou flag dédié).

- **B.3a** — Le nombre de tentatives est inférieur au seuil :
  1. Aucune notification n'est envoyée ; le flux normal continue.

- **C.2a** — Aucun utilisateur inactif trouvé :
  1. La commande se termine sans envoyer de notification.
  2. Un log `info` indique « Aucun utilisateur inactif détecté ».

- **C.3a** — L'utilisateur a déjà reçu un rappel d'inactivité récemment (< 7 jours) :
  1. Le système ignore cet utilisateur pour éviter le spam.
  2. Vérification via `$user->notifications()->where('type', InactivityReminderNotification::class)->where('created_at', '>=', now()->subDays(7))->exists()`.

## Post-conditions

- L'apprenant concerné a reçu un email transactionnel adapté à l'événement déclencheur.
- Les notifications envoyées sont enregistrées dans la table `notifications` de Laravel (canal `database` optionnel pour historique).

## Règles métier

- Toutes les notifications sont multilingues : le contenu est traduit selon la `locale` de l'utilisateur (fr, de, en).
- Le seuil de tentatives échouées avant notification est configurable (`config/quiz.php` → `failed_attempts_notification_threshold`, défaut 3).
- Le seuil d'inactivité est configurable (`config/notifications.php` → `inactivity_days`, défaut 14 jours).
- Un rappel d'inactivité ne peut pas être envoyé plus d'une fois par période de 7 jours au même utilisateur.
- Les certificats ne sont disponibles que pour les pôles Téléphonie et Énergie (jamais Assurance).

## Implémentation technique

### Modèles Eloquent
- `User` — `app/Models/User.php` — trait `Notifiable`. Champ `last_activity_at` (timestamp, nullable) mis à jour par le middleware `TrackLastActivity`.
- `QuizAttempt` — `app/Models/QuizAttempt.php` — champs : `user_id`, `quiz_id`, `score`, `passed_at` (nullable). Scope : `scopeFailed()` (where `passed_at` is null).
- `Course` — `app/Models/Course.php` — champ `pole` (enum: assurance, telephonie, energie).

### Migrations
- `add_last_activity_at_to_users_table` — colonne : `last_activity_at` (timestamp, nullable). Index : `index('last_activity_at')`.

### DTO / Response
- Aucun DTO — toutes les notifications sont des emails transactionnels envoyés en arrière-plan, sans réponse Inertia ni JSON.

### Contrôleur(s)
- Aucun contrôleur dédié pour les notifications. Les déclenchements sont intégrés dans :
  - `Learner\CertificateController@download` — déclenche `CertificateAvailableNotification` lors de la première génération.
  - `Learner\QuizController@submit` — déclenche `QuizFailedNotification` après N échecs.

### Routes
- Aucune route dédiée aux notifications transactionnelles.
- Route console (scheduler) : `Schedule::command('reminders:inactivity')->daily()` dans `routes/console.php`.

### Page(s) React (Inertia)
- Aucune — notifications email sans interface utilisateur dédiée.

### Service(s) / Action(s)

#### Notifications

- `CertificateAvailableNotification` — `app/Notifications/CertificateAvailableNotification.php` :
  ```php
  class CertificateAvailableNotification extends Notification implements ShouldQueue
  {
      use Queueable;

      public function __construct(
          private readonly Course $course,
      ) {}

      public function via(object $notifiable): array
      {
          return ['mail'];
      }

      public function toMail(object $notifiable): MailMessage
      {
          $locale = $notifiable->locale ?? 'fr';

          return (new MailMessage)
              ->subject(__('notifications.certificate_available.subject', ['course' => $this->course->title], $locale))
              ->greeting(__('notifications.certificate_available.greeting', ['name' => $notifiable->name], $locale))
              ->line(__('notifications.certificate_available.body', ['course' => $this->course->title], $locale))
              ->action(
                  __('notifications.certificate_available.download_button', [], $locale),
                  url("/courses/{$this->course->id}/certificate")
              );
      }
  }
  ```

- `QuizFailedNotification` — `app/Notifications/QuizFailedNotification.php` :
  ```php
  class QuizFailedNotification extends Notification implements ShouldQueue
  {
      use Queueable;

      public function __construct(
          private readonly Quiz $quiz,
          private readonly int $attemptsCount,
      ) {}

      public function via(object $notifiable): array
      {
          return ['mail'];
      }

      public function toMail(object $notifiable): MailMessage
      {
          $locale = $notifiable->locale ?? 'fr';

          return (new MailMessage)
              ->subject(__('notifications.quiz_failed.subject', [], $locale))
              ->greeting(__('notifications.quiz_failed.greeting', ['name' => $notifiable->name], $locale))
              ->line(__('notifications.quiz_failed.body', [
                  'module' => $this->quiz->module->title,
                  'attempts' => $this->attemptsCount,
              ], $locale))
              ->action(
                  __('notifications.quiz_failed.retry_button', [], $locale),
                  url("/quizzes/{$this->quiz->id}")
              )
              ->line(__('notifications.quiz_failed.encouragement', [], $locale));
      }
  }
  ```

- `InactivityReminderNotification` — `app/Notifications/InactivityReminderNotification.php` :
  ```php
  class InactivityReminderNotification extends Notification implements ShouldQueue
  {
      use Queueable;

      public function via(object $notifiable): array
      {
          return ['mail'];
      }

      public function toMail(object $notifiable): MailMessage
      {
          $locale = $notifiable->locale ?? 'fr';

          return (new MailMessage)
              ->subject(__('notifications.inactivity.subject', [], $locale))
              ->greeting(__('notifications.inactivity.greeting', ['name' => $notifiable->name], $locale))
              ->line(__('notifications.inactivity.body', [], $locale))
              ->action(
                  __('notifications.inactivity.resume_button', [], $locale),
                  url('/dashboard')
              );
      }
  }
  ```

#### Commande planifiée

- `SendInactivityReminders` — `app/Console/Commands/SendInactivityReminders.php` :
  ```php
  class SendInactivityReminders extends Command
  {
      protected $signature = 'reminders:inactivity
                              {--days= : Nombre de jours d\'inactivité (défaut: config)}';

      protected $description = 'Envoie un rappel aux apprenants inactifs';

      public function handle(): int
      {
          $days = $this->option('days') ?? config('notifications.inactivity_days', 14);
          $cooldown = config('notifications.inactivity_cooldown_days', 7);

          $inactiveUsers = User::query()
              ->where('role', 'learner')
              ->where('is_active', true)
              ->where('last_activity_at', '<=', now()->subDays($days))
              ->whereDoesntHave('notifications', function ($query) use ($cooldown) {
                  $query->where('type', InactivityReminderNotification::class)
                        ->where('created_at', '>=', now()->subDays($cooldown));
              })
              ->get();

          $count = 0;
          foreach ($inactiveUsers as $user) {
              $user->notify(new InactivityReminderNotification());
              $count++;
          }

          $this->info("Rappels d'inactivité envoyés : {$count}");

          return Command::SUCCESS;
      }
  }
  ```

- Enregistrement dans `routes/console.php` :
  ```php
  use Illuminate\Support\Facades\Schedule;

  Schedule::command('reminders:inactivity')->daily()->at('08:00');
  ```

#### Middleware de suivi d'activité

- `TrackLastActivity` — `app/Http/Middleware/TrackLastActivity.php` :
  ```php
  class TrackLastActivity
  {
      public function handle(Request $request, Closure $next): Response
      {
          if ($user = $request->user()) {
              $user->updateQuietly(['last_activity_at' => now()]);
          }

          return $next($request);
      }
  }
  ```
  Enregistré dans `bootstrap/app.php` sur le groupe middleware `web`.

#### Intégration dans les contrôleurs existants

- Dans `Learner\CertificateController@download` :
  ```php
  // Après génération du certificat
  $alreadyNotified = $user->notifications()
      ->where('type', CertificateAvailableNotification::class)
      ->where('data->course_id', $course->id)
      ->exists();

  if (! $alreadyNotified) {
      $user->notify(new CertificateAvailableNotification($course));
  }
  ```

- Dans `Learner\QuizController@submit` :
  ```php
  // Après création du QuizAttempt échoué
  $failedAttempts = QuizAttempt::where('user_id', $user->id)
      ->where('quiz_id', $quiz->id)
      ->whereNull('passed_at')
      ->count();

  $threshold = config('quiz.failed_attempts_notification_threshold', 3);

  if ($failedAttempts >= $threshold && $failedAttempts % $threshold === 0) {
      $user->notify(new QuizFailedNotification($quiz, $failedAttempts));
  }
  ```

### Dépendances externes
- Serveur SMTP ou service d'envoi d'emails (Amazon SES, Mailgun, Postmark, etc.) — même configuration que UC-M02.

### Configuration

- `config/notifications.php` :
  ```php
  return [
      'inactivity_days'          => env('INACTIVITY_REMINDER_DAYS', 14),
      'inactivity_cooldown_days' => env('INACTIVITY_COOLDOWN_DAYS', 7),
  ];
  ```

- `config/quiz.php` :
  ```php
  return [
      'failed_attempts_notification_threshold' => env('QUIZ_FAILED_NOTIFICATION_THRESHOLD', 3),
  ];
  ```

- Fichiers de traduction :
  - `resources/lang/fr/notifications.php`
  - `resources/lang/de/notifications.php`
  - `resources/lang/en/notifications.php`

  Exemple `resources/lang/fr/notifications.php` :
  ```php
  return [
      'certificate_available' => [
          'subject'         => 'Votre certificat est disponible',
          'greeting'        => 'Félicitations :name !',
          'body'            => 'Vous avez terminé le cours « :course » avec succès. Votre certificat est prêt à être téléchargé.',
          'download_button' => 'Télécharger le certificat',
      ],
      'quiz_failed' => [
          'subject'       => 'Besoin d\'un coup de pouce ?',
          'greeting'      => 'Bonjour :name,',
          'body'          => 'Vous avez tenté le quiz du module « :module » :attempts fois. Ne vous découragez pas !',
          'retry_button'  => 'Réessayer le quiz',
          'encouragement' => 'Nous vous conseillons de revoir les leçons du module avant de retenter le quiz.',
      ],
      'inactivity' => [
          'subject'       => 'Vous nous manquez !',
          'greeting'      => 'Bonjour :name,',
          'body'          => 'Cela fait un moment que vous ne vous êtes pas connecté(e). Vos cours vous attendent !',
          'resume_button' => 'Reprendre ma formation',
      ],
  ];
  ```
