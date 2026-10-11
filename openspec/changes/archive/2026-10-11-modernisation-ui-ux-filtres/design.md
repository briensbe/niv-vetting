## Context

L'application Vetting Desk permet de consulter, gérer et comparer des règles métier issues de configurations XML et de bundles de libellés `.properties`.
À ce jour, l'interface utilisateur souffre de plusieurs freins :
1. **Style daté :** typographies serif, palette vert forêt et crème façon journal d'imprimerie rétro, contrastes peu marqués.
2. **Perte d'espace utile :** un volet latéral « Parcours » consomme près d'un quart de la largeur de l'écran tout en faisant doublon avec les sélecteurs du tableau principal.
3. **Filtres peu adaptés au multi-fichiers :** les modules homonymes issus de sources différentes sont indiscernables, la sélection de fichiers est absente, et le filtre de comportement exige de choisir un profil au préalable.

## Goals / Non-Goals

**Goals :**
- Passer la consultation des règles en **pleine largeur** en éliminant le panneau latéral redondant.
- Adopter le thème **« Slate & Clean Modern »** (fonds blancs/ardoise doux `#f8fafc`, accents bleu ardoise/indigo `#2563eb`, badges de statut précis) appliqué de manière homogène à toute l'application.
- Rendre la **barre de recherche textuelle** proéminente avec déclenchement instantané réactif et raccourci clavier (`/` ou `Ctrl+K`).
- Implémenter un **composant autonome `app-tree-select`** à 3 niveaux (`Fichier ➔ Module ➔ Rule-set`) doté d'une recherche textuelle interne avec auto-dépliage, sélection en cascade et gestion d'état indéterminé (`[-]`).
- Décorréler le filtre de **sévérité** du profil (filtrage par présence d'un `ERROR`, `WARNING` ou `IGNORE`) tout en conservant le filtre profil en tant qu'affineur contextuel.
- Conserver le bloc de regroupement dynamique (« Regrouper par ») en le modernisant visuellement.

**Non-Goals :**
- Modifier la structure de stockage locale (IndexedDB / `VettingCatalogStorage`).
- Modifier la logique interne de comparaison différentielle des règles (déjà couverte par `app-rule-comparison`).
- Remplacer le moteur de parsing XML ou `.properties`.

## Decisions

### 1. Composant autonome `app-tree-select`
- **Décision :** Créer un composant Angular autonome (`standalone: true`) avec fichiers dédiés `.ts`, `.html`, `.css` et son fichier de test unitaire `.spec.ts`.
- **Structure des données du composant :** Un arbre de nœuds récursif ou hiérarchique typé (`TreeNode { id, label, count?, children?, checked, indeterminate }`).
- **Comportement de recherche :** Lorsqu'un terme est saisi, les nœuds ne matchant pas sont masqués et les parents des nœuds matchants sont automatiquement dépliés pour rendre le résultat visible sans action manuelle.
- **Alternative rejetée :** Intégrer tout le HTML/CSS du popover directement dans `app.html` (rejeté pour des raisons de maintenabilité et de testabilité).

### 2. Décorrélation de la sévérité et du profil
- **Décision :** Le filtre de sévérité globale vérifie si `Object.values(rule.profiles).includes(selectedSeverity)`. Si l'utilisateur a également sélectionné un profil spécifique `P`, alors la condition devient `rule.profiles[P] === selectedSeverity`.
- **Alternative rejetée :** Garder le comportement subordonné avec dropdown grisé (rejeté car cela bloquait la recherche rapide de règles bloquantes `ERROR`).

### 3. Tokens CSS globaux et modernisation du layout
- **Décision :** Refondre les variables CSS déclarées dans `styles.css` / `app.css` (`--ink`, `--paper`, etc.) vers une palette moderne slate/indigo (`--bg-canvas: #f8fafc; --bg-surface: #ffffff; --text-primary: #0f172a; --border-subtle: #e2e8f0; --accent: #2563eb;`). Les composants enfants (`source-management`, `rule-comparison`) consomment ces variables et profitent automatiquement du relooking.
- **Alternative rejetée :** Ne modifier le CSS que dans `app.css` sans toucher aux styles partagés, créant une disparité visuelle majeure lors du passage au comparateur.

## Risks / Trade-offs

- **[Performance du Tree-Select avec des milliers de règles] ➔** L'arbre ne charge que les nœuds hiérarchiques (Fichiers ~ 5, Modules ~ 30, Rule-sets ~ 150), et non pas les milliers de règles unitaires elles-mêmes, ce qui garantit un rendu DOM instantané sous les 10ms.
- **[Densité de la barre d'outils pleine largeur] ➔** Utilisation d'une barre de filtres responsive avec wraps soignés et badges actifs compactés sous forme de chips détachables.
