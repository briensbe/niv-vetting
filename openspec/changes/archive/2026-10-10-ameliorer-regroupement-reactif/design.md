## Context

Le composant racine calcule actuellement `groupedResults` de façon synchrone à partir de `displayedRules()` et de `groupingLevels()`. La mesure sur le catalogue montre que `createGroups` prend environ 1,1 ms en moyenne pour 3 225 règles, alors que le clic demande environ 1,1 s avant la peinture suivante. Les 3 225 cartes de règles sont instanciées dans le DOM même lorsque leurs éléments `<details>` parents sont repliés; le coût dominant vient donc du rendu, pas du calcul des groupes.

Le besoin est de refléter l’ordre des contrôles immédiatement, tout en conservant l’arbre précédent visible et en gardant l’interface interactive durant le calcul. Les demandes peuvent se chevaucher quand l’utilisateur clique rapidement ou modifie les règles affichées.

## Goals / Non-Goals

**Goals:**
- Limiter le travail DOM en ne rendant les descendants et les cartes de règles qu’à l’ouverture d’un groupe.
- Publier immédiatement le nouvel ordre des niveaux et signaler l’actualisation sans faire disparaître l’arbre précédent.
- Ne publier que le résultat calculé à partir des dernières règles et des derniers niveaux.
- Rendre les erreurs de calcul visibles et accessibles.

**Non-Goals:**
- Reconcevoir les contrôles ou les critères de regroupement.
- Optimiser la recherche et le filtrage des règles, qui sont hors du chemin de changement d’ordre visé.
- Ajouter une dépendance externe ou persister les niveaux de regroupement.

## Decisions

1. **Différer le rendu des groupes fermés plutôt que d’ajouter un Worker sans justification.** La mesure sur le catalogue réel (3 225 règles, ordre initial à deux niveaux) a donné environ 1,1 ms par appel à `createGroups` en moyenne sur 30 appels, tandis que le clic prenait environ 1,1 s avant la peinture suivante et que les 3 225 cartes étaient présentes dans le DOM malgré les groupes natifs repliés. Le coût observé est donc le rendu du DOM, pas le regroupement. Ne créer les sous-groupes et cartes de règles que lorsque leur parent est ouvert; conserver l’état des ouvertures explicitement pour piloter ce rendu. Un Worker n’est pas retenu sans nouvelle mesure montrant que le calcul est lui-même coûteux.

2. **Séparer les entrées courantes du dernier arbre publié.** Conserver dans l’état du composant l’arbre actuellement affiché, les niveaux demandés, l’état d’actualisation et une éventuelle erreur. Lorsqu’une demande commence, marquer la région des résultats comme occupée et afficher un statut accessible, sans effacer l’arbre. Laisser le navigateur peindre cet état avant de calculer et publier l’arbre courant, puis retirer l’état occupé.

3. **Associer une génération à chaque demande.** Incrémenter une version lors de tout nouveau calcul demandé à la suite d’un changement de niveaux ou de règles affichées. Un résultat ou une erreur ne peut modifier l’interface que si sa version correspond encore à la dernière demande. Cette règle empêche une réponse lente d’écraser les données récentes ou de terminer prématurément leur indicateur d’attente.

4. **Traiter explicitement les défaillances du calcul.** Toute erreur de calcul est présentée à l’utilisateur; l’arbre précédent est conservé et l’indicateur actif est retiré pour la demande courante. Ne pas présenter un échec comme un regroupement réussi.

5. **Tester le rendu différé et le contrat d’actualisation.** Vérifier que l’ordre des contrôles change immédiatement, que l’arbre précédent reste affiché avec un statut accessible, que les descendants d’un groupe replié ne sont pas dans le DOM, que l’ouverture affiche ses règles, que les réponses obsolètes sont ignorées et qu’une erreur est annoncée. Compléter par une mesure du DOM et de la peinture sur le catalogue de démonstration dans un navigateur.

## Risks / Trade-offs

- [Les cartes ne sont pas présentes dans le DOM tant que leur groupe est replié.] → C’est intentionnel; garder l’aperçu du groupe et son compte visibles et rendre ses règles immédiatement à l’ouverture.
- [L’arbre conservé pendant le calcul peut refléter des critères antérieurs.] → Marquer la région comme occupée et annoncer l’actualisation jusqu’à la publication du résultat courant.

## Migration Plan

1. Mesurer le coût actuel du regroupement sur les données de démonstration et conserver une référence de comparaison.
2. Rendre explicite l’état d’ouverture des groupes et différer la création de leurs descendants et cartes jusqu’à leur expansion.
3. Remplacer la valeur calculée directement par un état de résultat avec gestion de génération, d’attente et d’erreur, et permettre au navigateur de peindre le statut avant le calcul.
4. Ajouter l’indicateur accessible et les tests de rendu différé, de réponses courantes et obsolètes, et d’erreur.
5. Vérifier dans un navigateur le nombre de cartes présentes pour les groupes repliés, la réactivité à l’ouverture et le temps de peinture sur le catalogue de démonstration.

Le retour arrière consiste à restaurer le rendu préalable de tous les descendants et cartes et à retirer l’état d’actualisation ajouté. Cette opération rétablirait le volume DOM observé avant le changement.

## Open Questions

Aucune question de conception bloquante ne reste ouverte. Si le calcul des groupes devient ultérieurement un goulot d’étranglement mesuré après la réduction du DOM, une évolution distincte pourra l’exécuter dans un Worker.
