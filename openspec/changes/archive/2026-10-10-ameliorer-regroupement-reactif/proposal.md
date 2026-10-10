## Why

Le changement de l’ordre des niveaux de regroupement semble bloquer l’interface, mais la mesure montre que le délai vient surtout des milliers de cartes instanciées sous des groupes repliés, et non du calcul de l’arbre. L’utilisateur doit voir le nouvel ordre dès le clic, recevoir un retour d’actualisation et ne faire rendre les règles que lorsqu’il développe leur groupe.

## What Changes

- Mettre à jour l’ordre affiché des niveaux de regroupement dès l’action sur une flèche.
- Conserver l’arbre de résultats déjà affiché pendant le calcul du nouveau regroupement et signaler explicitement son actualisation.
- Différer le rendu des sous-arbres et des cartes de règles des groupes repliés jusqu’à leur ouverture afin de limiter le travail de l’interface.
- Mesurer le calcul et le rendu après optimisation; n’introduire un Web Worker que si le calcul lui-même devient un goulot mesuré.
- Ignorer tout résultat de calcul devenu obsolète après un changement ultérieur des niveaux ou des règles affichées.
- Signaler explicitement une erreur de calcul au lieu de laisser indéfiniment un indicateur d’actualisation.

## Capabilities

### New Capabilities
- `regroupement-regles-reactif`: Réordonnancement immédiat des niveaux et actualisation réactive, accessible et cohérente de l’arbre des règles.

### Modified Capabilities

## Impact

- Interface Angular : gestion d’état, calcul des groupes, affichage de l’arbre et styles de l’indicateur.
- Tests du composant couvrant le nouvel ordre, l’état d’actualisation, la cohérence des résultats et les changements rapides successifs.
- La mesure initiale attribue le délai au grand nombre de cartes instanciées dans le DOM plutôt qu’au calcul des groupes; aucun Worker ni dépendance externe n’est présumé.
