# UC-L09 — Changer la langue de l'interface

## Informations

| Champ | Valeur |
|---|---|
| **ID** | UC-L09 |
| **Titre** | Changer la langue de l'interface |
| **Acteur principal** | Apprenant (ou visiteur non authentifié) |
| **Pré-conditions** | Aucune |
| **Déclencheur** | Action utilisateur — sélection d'une langue (FR / DE / EN) dans le sélecteur du header |

## Scénario principal (Happy Path)

1. L'utilisateur clique sur le sélecteur de langue `<LanguageSwitcher />` dans le header.
2. L'utilisateur choisit une langue : Français (fr), Deutsch (de) ou English (en).
3. Le frontend envoie `PUT /locale` avec `{ locale: 'de' }`.
4. Le système sauvegarde la préférence : en base (`users.locale`) si l'utilisateur est authentifié, sinon dans un cookie `locale`.
5. Le système retourne `redirect()->back()`.
6. À la requête suivante, le middleware `SetLocale` applique la langue : `App::setLocale('de')`.
7. L'interface React se recharge avec les traductions de la langue choisie (fichiers JSON i18next).

## Extensions (Cas alternatifs / Erreurs)

- **UC-L09a** — Langue non supportée :
  1. La validation échoue (`in:fr,de,en`) — erreur 422.
  2. La locale courante est conservée.
- **UC-L09b** — Visiteur non authentifié :
  1. La préférence est stockée dans un cookie `locale` (durée : 1 an).
  2. À la création du compte (UC-M01), la locale du cookie peut être reprise.

## Post-conditions

- La préférence de langue est persistée (colonne `users.locale` ou cookie).
- Toutes les requêtes suivantes utilisent la nouvelle locale (interface, emails, messages serveur).

## Règles métier

- i18n natif : les seules langues supportées sont FR, DE, EN.
- La langue par défaut est le français (`fr`).
- La locale de l'utilisateur détermine aussi la langue des emails transactionnels (voir UC-M02, UC-M03).

## Implémentation technique

### Modèles Eloquent
- `User` — `app/Models/User.php` — champ ajouté : `locale` (enum: fr, de, en ; default fr).

### Migrations
- `add_locale_to_users_table` — `string('locale', 2)->default('fr')` après `email`. Pas d'index (faible cardinalité, jamais filtré).

### DTO / Response
- Aucun DTO — le contrôleur retourne `redirect()->back()`, pas de page Inertia avec props.
- La locale courante est exposée globalement via `HandleInertiaRequests::share()` :
  ```php
  'locale' => fn () => app()->getLocale(),
  ```

### Contrôleur(s)
- `LocaleController` — `app/Http/Controllers/LocaleController.php` :
  - `update(Request $request)` — valide `locale` (`required|in:fr,de,en`). Si authentifié : `$request->user()->update(['locale' => $locale])`. Sinon : met à jour le cookie. Retourne `redirect()->back()->withCookie(cookie('locale', $locale, 525600))`.

### Middleware
- `SetLocale` — `app/Http/Middleware/SetLocale.php` — résout la locale par priorité : `user.locale` (si authentifié) → cookie `locale` → défaut `fr`. Appelle `App::setLocale($locale)`.
- Enregistrement dans `bootstrap/app.php` : ajouté au groupe `web` via `$middleware->web(append: [SetLocale::class])`.

### Routes
- `PUT /locale` — name `locale.update`, middleware `web` (accessible aux invités et authentifiés)

### Page(s) React (Inertia)
- Composant partagé `resources/js/components/language-switcher.tsx` :
  ```tsx
  const locales = [
      { code: 'fr', label: 'Français' },
      { code: 'de', label: 'Deutsch' },
      { code: 'en', label: 'English' },
  ];
  // router.put(route('locale.update'), { locale: code })
  ```
  Placé dans le layout header (`resources/js/layouts/app-layout.tsx`).
- Traductions React : `react-i18next` avec fichiers `resources/js/locales/fr.json`, `de.json`, `en.json`.
- Traductions serveur (emails, messages de validation) : `resources/lang/fr/`, `resources/lang/de/`, `resources/lang/en/`.

### Service(s) / Action(s)
- Aucun service dédié — la logique tient dans `SetLocale` (résolution) et `LocaleController` (persistance).

### Dépendances externes
- `react-i18next` (npm) — intégration React de i18next
- `i18next` (npm) — moteur de traduction côté client
