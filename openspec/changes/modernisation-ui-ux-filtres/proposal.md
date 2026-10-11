## Why

L'interface actuelle présente une ergonomie vieillotte (tons vert forêt et crème façon papier d'imprimerie rétro, éléments étroits), souffre d'un encombrement inutile causé par un volet latéral de navigation redondant avec les filtres, et manque de souplesse pour la recherche. De plus, les filtres souffrent de limites critiques : impossibilité de distinguer clairement les modules homonymes issus de fichiers XML différents, absence de filtre dédié par fichier, recherche textuelle trop peu visible et filtre de comportement rigide subordonné à un profil spécifique.

Cette évolution modernise l'identité visuelle de l'ensemble de l'application (« Slate & Clean Modern »), libère l'espace de consultation en pleine largeur et dote l'outil d'un sélecteur hiérarchique arborescent à 3 niveaux (Fichier ➔ Module ➔ Rule-set) ainsi que d'un filtrage direct par sévérité globale.

## What Changes

- **Suppression du volet latéral « Parcours »** : passage à une disposition plein écran (Full Width) épurée et aérée pour la consultation du catalogue de règles.
- **Refonte graphique globale (« Slate & Clean Modern »)** : remplacement de la palette vert/crème par des fonds blancs/ardoise doux (`#f8fafc`), des contrastes techniques nets, des bordures raffinées et une typographie sans-serif moderne, répercutée sur les trois vues (Catalogue, Gestion, Comparateur).
- **Barre de recherche textuelle proéminente** : champ de recherche élargi, placé en tête de catalogue, avec activation instantanée (debounce fluide), raccourci clavier (`Ctrl+K` ou `/`) et compteur de résultats dynamique.
- **Nouveau composant de sélection hiérarchique arborescente (`app-tree-select`)** :
  - Arborescence à 3 niveaux : `Fichier` ➔ `Module` ➔ `Rule-set`.
  - Recherche textuelle intégrée avec auto-dépliage contextuel des branches correspondantes.
  - Sélection en cascade (parent/enfants) avec gestion de l'état indéterminé (`[-]`).
  - Arborescence compactée/pliée par défaut à l'ouverture du popover.
- **Filtres de sévérité et profil repensés** :
  - Nouveau filtre de **sévérité globale** décorrélé du profil (opérateur OU inclusif : repère les règles ayant au moins un profil en `ERROR`, `WARNING`, ou `IGNORE`).
  - Filtre par **profil** unitaire conservé pour affiner spécifiquement la règle lorsqu'il est combiné à une sévérité ou pour cibler un rôle utilisateur.
  - Sélecteur d'état sous forme de boutons segmentés modernes (`Tous` | `Actives` | `Inactives`).
- **Affichage des filtres actifs & reset rapide** : badges/chips récapitulatifs intelligents sous la barre d'outils avec suppression unitaire (`✕`) et bouton `Tout effacer`.
- **Modernisation du bloc de regroupement** : intégration plus fine et compacte des niveaux de regroupement (« Regrouper par ») sans dénaturer la fonctionnalité existante.

## Capabilities

### New Capabilities
- `navigation-filtres-hierarchiques`: Sélecteur arborescent à 3 niveaux (Fichier ➔ Module ➔ Rule-set), recherche textuelle globale mise en valeur, et filtrage par sévérité globale sans dépendance obligatoire au profil.
- `theme-slate-moderne`: Nouvelle charte graphique épurée et moderne (« Slate & Clean ») appliquée à la coquille applicative et partagée entre le catalogue, la gestion des sources et la comparaison différentielle.

### Modified Capabilities
<!-- Aucune exigence existante dans openspec/specs n'est modifiée -->

## Impact

- **Composants Angular impactés** :
  - `src/app/app.html`, `src/app/app.ts`, `src/app/app.css` : refonte du layout principal, suppression de l'aside de navigation, intégration de la nouvelle barre de recherche et toolbar de filtres, mise à jour des tokens CSS.
  - Création du composant dédié `src/app/tree-select.component.{ts,html,css}` et de son test unitaire `src/app/tree-select.component.spec.ts`.
  - Harmonisation du style dans `src/app/source-management.component.css` et `src/app/rule-comparison.component.css` pour exploiter les nouvelles variables globales du thème.
- **Modèle de données & Filtrage** :
  - Enrichissement des signaux de filtrage dans `App` (`treeSelection`, `severityFilter`, `query`, etc.) sans régression sur les fonctionnalités de regroupement ou de pagination.
