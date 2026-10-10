## ADDED Requirements

### Requirement: Réordonner les niveaux et actualiser les résultats de manière réactive
L’interface SHALL refléter immédiatement dans les contrôles l’ordre des niveaux après un clic sur une flèche. Elle SHALL conserver l’arbre précédent et signaler son actualisation jusqu’à ce que l’arbre correspondant aux critères courants soit prêt. Le rendu SHALL différer les sous-arbres et les cartes de règles des groupes repliés jusqu’à leur ouverture afin de limiter le travail du thread principal. Un calcul SHALL être déplacé hors du thread principal seulement si une mesure démontre qu’il constitue lui-même un goulot d’étranglement.

#### Scenario: Réordonner un niveau
- **WHEN** l’utilisateur déplace un niveau vers le haut ou vers le bas
- **THEN** le nouvel ordre apparaît immédiatement dans les contrôles et l’arbre existant reste affiché avec un indicateur accessible d’actualisation jusqu’à la publication du nouvel arbre

#### Scenario: Différer le rendu des groupes repliés
- **WHEN** un groupe de règles est replié
- **THEN** ses groupes descendants et cartes de règles ne sont pas instanciés dans le DOM avant que l’utilisateur développe ce groupe

#### Scenario: Publier le nouvel arbre
- **WHEN** le calcul du regroupement correspondant à l’ordre courant se termine avec succès
- **THEN** l’interface remplace l’arbre précédent par le nouvel arbre et retire l’indicateur d’actualisation

### Requirement: Écarter les résultats de regroupement obsolètes
L’interface SHALL afficher uniquement le résultat correspondant aux niveaux et aux règles affichées les plus récents. La fin tardive d’un calcul démarré avant une modification ultérieure SHALL NOT remplacer un résultat plus récent ni effacer l’état d’actualisation de cette demande.

#### Scenario: Plusieurs déplacements successifs
- **WHEN** l’utilisateur déplace des niveaux plusieurs fois avant la fin d’un calcul précédent
- **THEN** l’interface affiche finalement l’arbre correspondant au dernier ordre et ignore les résultats des calculs précédents

#### Scenario: Modification des règles pendant un calcul
- **WHEN** les règles affichées changent avant la fin d’un calcul de regroupement
- **THEN** l’interface ne publie pas un arbre calculé à partir de l’ancien ensemble de règles

### Requirement: Signaler une erreur de calcul
Si le calcul du regroupement échoue, l’interface SHALL afficher un message d’erreur explicite et accessible, SHALL retirer l’indicateur de calcul actif et SHALL conserver l’arbre précédemment affiché plutôt que de présenter l’échec comme un succès.

#### Scenario: Le calcul du regroupement échoue
- **WHEN** le calcul du nouvel arbre échoue
- **THEN** l’interface conserve l’arbre précédent, retire l’état d’attente et informe explicitement l’utilisateur de l’erreur
