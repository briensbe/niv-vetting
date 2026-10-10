## 1. Moteur de calcul différentiel

- [x] 1.1 Définir les types et interfaces du comparateur (`RuleComparisonStatus`, `ProfileDiff`, `RuleComparisonItem`, `ComparisonSummary`)
- [x] 1.2 Implémenter la fonction pure de comparaison de règles indexée par clé composite `${moduleId}::${ruleId}`
- [x] 1.3 Implémenter le calcul de la matrice différentielle des profils et la détection des écarts de sévérité
- [x] 1.4 Écrire les tests unitaires automatisés couvrant tous les cas de comparaison (identiques, ajout B, suppression B, divergence active, divergences profils)

## 2. Intégration de l'onglet et état réactif

- [x] 2.1 Étendre le type `WorkspaceView` pour inclure la vue `'compare'`
- [x] 2.2 Ajouter l'onglet « 03 Comparateur » dans la barre d'onglets de navigation principale
- [x] 2.3 Gérer les signaux de sélection de la source A et de la source B avec pré-sélection automatique des deux premières sources distinctes
- [x] 2.4 Implémenter les signaux dérivés réactifs (`computed`) pour le calcul de la synthèse et le filtrage (filtre d'écart, recherche textuelle, filtre par module)

## 3. Interface utilisateur du comparateur

- [x] 3.1 Afficher l'état d'information guidant l'utilisateur si moins de deux fichiers sources sont disponibles
- [x] 3.2 Construire la barre d'indicateurs de synthèse (KPIs : total règles, identiques, divergences, seulement A, seulement B)
- [x] 3.3 Construire la barre d'outils avec les boutons de filtres rapides (Tous les écarts par défaut, Identiques, Tout afficher, filtre module, recherche)
- [x] 3.4 Réaliser le rendu détaillé des règles divergentes (état actif A vs B, tableau comparatif des profils avec mise en évidence des discordances)
- [x] 3.5 Intégrer les styles CSS dédiés dans `app.css` en respectant la charte graphique et la lisibilité des écarts

## 4. Validation et tests fonctionnels

- [x] 4.1 Valider le bon comportement interactif (changement de sources, bascule de filtres, recherche instantanée)
- [x] 4.2 Exécuter les tests globaux du projet (`pnpm test`) et vérifier la compilation sans avertissement (`pnpm build`)
