## 1. Mesurer et préparer le calcul

- [x] 1.1 Mesurer le temps du calcul de regroupement sur le catalogue de démonstration et noter le nombre de règles traité.
- [x] 1.2 Extraire le calcul pur des groupes dans un module testable en conservant les références aux règles affichées.
- [x] 1.3 Rendre explicite l’état d’ouverture des groupes et différer le rendu des descendants et des cartes de règles des groupes repliés.

## 2. Gérer les demandes asynchrones

- [x] 2.1 Remplacer le regroupement synchrone par un état contenant le dernier arbre publié, l’état d’actualisation et l’erreur éventuelle.
- [x] 2.2 Publier immédiatement les changements de niveaux et ignorer les réponses de calcul correspondant à des entrées devenues obsolètes.
- [x] 2.3 Traiter explicitement les erreurs de calcul en conservant l’arbre précédemment publié et en terminant l’état d’attente.

## 3. Présenter l’actualisation et vérifier le comportement

- [x] 3.1 Afficher un indicateur d’actualisation accessible sans retirer l’arbre précédent, puis annoncer le résultat ou l’erreur.
- [x] 3.2 Ajouter des tests contrôlant l’ordre immédiat, l’arbre conservé, le rendu différé à l’ouverture, les réponses obsolètes et l’échec du calcul.
- [x] 3.3 Exécuter les vérifications ciblées et confirmer dans le navigateur que les interactions restent réactives durant le calcul sur le catalogue de démonstration.
