# Conventions et Bonnes Pratiques du Projet (Laravel & React Expert)

Ce document centralise les règles architecturales et techniques appliquées sur ce projet, combinant l'expertise backend (Laravel) et frontend (React 19 / Inertia.js).

## 1. Backend (Laravel)

### 1.1. Validation et Form Requests
- **Jamais de validation dans les contrôleurs** : Les contrôleurs ne doivent jamais utiliser `$request->validate()` ou `Validator::make()`.
- **Form Requests dédiées** : Chaque endpoint (Store, Update, Import, etc.) recevant des données utilisateur doit injecter une Form Request spécifique (ex: `StoreCourseRequest`).
- **Utilisation de `$request->validated()`** : Seules les données validées doivent être utilisées dans le contrôleur. L'utilisation de `$request->all()` est strictement interdite.
- **Transformation des données** : Les transformations (ex: génération d'un slug avec `Str::slug()`, formatage d'email en minuscule) doivent être gérées dans les méthodes `prepareForValidation()` ou `passedValidation()` de la Form Request, et réinjectées via `$this->merge()`.

### 1.2. Architecture des Contrôleurs et DTOs
- Les contrôleurs doivent être fins (Thin Controllers) et ne gérer que le flux HTTP.
- Les données envoyées aux vues Inertia ne doivent jamais être des modèles Eloquent purs.
- **Data Transfer Objects (DTOs)** : Utiliser des classes DTO (ex: `CourseFormData`, `StudentListData`) avec des propriétés typées en lecture seule (`readonly class`) pour sérialiser les données vers le frontend.

## 2. Frontend (React 19 & Inertia)

### 2.1. Typage Strict (TypeScript)
- **TypeScript Obligatoire** : Tous les composants (`.tsx`) et hooks (`.ts`) doivent être strictement typés. Les options `strict: true` et `noEmit` (pour les vérifications de type) doivent être respectées.
- Les interfaces TypeScript du frontend (ex: `CourseFormData`) doivent être le miroir exact des propriétés DTO renvoyées par le backend.
- L'utilisation de `any` est proscrite. 

### 2.2. Gestion des Formulaires (Inertia `useForm`)
- Les formulaires doivent utiliser le hook `useForm` d'Inertia, avec le type générique pointant vers l'interface des données : `const { data, setData, post, processing, errors } = useForm<CourseFormData>(initialData);`.
- **Prévention des soumissions multiples** : Le bouton de validation doit obligatoirement inclure `disabled={processing}`.
- **État immuable** : Ne jamais muter les variables d'état directement, toujours passer par les fonctions de mise à jour (comme `setData`).

### 2.3. Accessibilité (a11y - WCAG)
- **Sémantique HTML** : Utilisation stricte des balises sémantiques (ex: `<label>`, `<fieldset>`, `<legend>`, `<main>`).
- **Attributs ARIA pour l'état d'erreur** : Lier les messages d'erreur et descriptions aux champs de saisie. Par exemple, si `form.errors.title` existe, l'input doit posséder `aria-invalid="true"` et `aria-describedby="title-error"`.
- Focus management : Garantir un parcours au clavier cohérent.

### 2.4. Performance et Hooks
- **Mémorisation ciblée** : Utiliser `useMemo`, `useCallback` ou `memo` uniquement lorsque l'on passe des références complexes à des enfants coûteux en rendu. Ne pas prématurément mémoriser chaque fonction.
- **Nettoyage des Effets** : Chaque appel à `useEffect` ajoutant des écouteurs globaux ou souscriptions doit obligatoirement retourner une fonction de `cleanup`.
- **Identifiants uniques** : Ne jamais utiliser l'index de la boucle comme `key` lors de l'affichage de listes dynamiques (utiliser un `id` stable).
- Éviter de déclarer des composants dans le scope d'un autre composant pour ne pas casser le processus de réconciliation de React.

## 3. Dépendances et Tests
- L'utilisation des Error Boundaries de React doit être favorisée pour isoler les erreurs (surtout lors de la communication asynchrone).
- Favoriser la séparation des requêtes de mutation et de récupération des données, conformément au flux naturel Laravel + Inertia.
- **Tests** : Écriture de tests frontend (React Testing Library) garantissant l'accessibilité des formulaires et l'affichage adéquat des erreurs de validation (sans s'attacher au DOM non-sémantique).