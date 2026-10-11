## 1. Tokens graphiques et modernisation du thème (« Slate & Clean Modern »)

- [x] 1.1 Remplacer la palette de couleurs dans `src/styles.css` et `src/app/app.css` par les variables Slate & Clean Modern (fonds clairs `#f8fafc` / `#ffffff`, bordures subtiles, accents bleu ardoise/indigo `#2563eb`).
- [x] 1.2 Mettre à jour les styles du bandeau supérieur (`topbar`), de l'en-tête et des onglets de navigation.
- [x] 1.3 Harmoniser les variables et cartes dans `src/app/source-management.component.css` et `src/app/rule-comparison.component.css`.

## 2. Refonte du layout et de la barre de recherche globale

- [x] 2.1 Supprimer le panneau latéral gauche « Parcours » (`navigation-panel`) dans `src/app/app.html` et adapter le conteneur en pleine largeur.
- [x] 2.2 Concevoir une barre de recherche textuelle large et mise en avant avec raccourci clavier (`/` ou `Ctrl+K`), bouton d'effacement et compteur de correspondances.
- [x] 2.3 Nettoyer les propriétés et méthodes obsolètes de navigation latérale dans `src/app/app.ts`.

## 3. Composant autonome `app-tree-select` (Fichier ➔ Module ➔ Rule-set)

- [x] 3.1 Créer l'interface et le modèle de nœud arborescent (`TreeNode`) avec états coché, décoché et indéterminé.
- [x] 3.2 Implémenter le composant autonome `TreeSelectComponent` (`.ts`, `.html`, `.css`) avec popover, recherche interne filtrante et auto-dépliage des branches.
- [x] 3.3 Gérer la propagation de sélection en cascade (cocher un parent coche les enfants, décochage partiel déclenche l'état indéterminé).
- [x] 3.4 Ajouter les tests unitaires complets pour `TreeSelectComponent` dans `tree-select.component.spec.ts`.

## 4. Filtres de sévérité globale, profils et états

- [x] 4.1 Implémenter le filtre de sévérité globale décorrélé du profil dans `src/app/app.ts` (`ERROR`, `WARNING`, `IGNORE` avec opérateur OU inclusif).
- [x] 4.2 Adapter le filtre de profil pour agir en tant qu'affineur contextuel lorsqu'une sévérité est active ou de ciblage unitaire.
- [x] 4.3 Moderniser le sélecteur d'état (`Tous` | `Actives` | `Inactives`) sous forme de boutons segmentés.
- [x] 4.4 Intégrer les chips récapitulatifs des filtres actifs avec suppression unitaire `[✕]` et bouton global `Tout effacer`.

## 5. Modernisation du bloc de regroupement et validation de non-régression

- [x] 5.1 Restyler le panneau « Regrouper par » pour une intégration compacte et élégante en pleine largeur.
- [x] 5.2 Valider la compilation (`pnpm build`) et l'exécution de l'ensemble des tests unitaires (`pnpm test`).
