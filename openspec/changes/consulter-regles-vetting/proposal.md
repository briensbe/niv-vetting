## Why

Les règles de vetting sont stockées dans un fichier XML volumineux, tandis que leurs libellés et descriptions françaises sont définis séparément dans un fichier properties. Une interface dédiée permettra de parcourir et retrouver ces règles sans devoir lire directement ces fichiers techniques.

## What Changes

- Remplacer l’écran de démarrage Angular par une interface de consultation des règles du fichier `crca_initial_vetting_rules.xml`.
- Permettre la navigation par opération et famille de règles, ainsi que la recherche et le filtrage global.
- Présenter pour chaque règle son libellé et sa description française lorsqu’ils existent, son état actif, sa famille et les comportements configurés par profil.
- Utiliser l’identifiant comme libellé de repli lorsqu’une traduction manque.
- Copier les deux fichiers nécessaires depuis `private/vetting-old` vers `public/vetting-data/` pour les publier comme données de démonstration, sous réserve que leur diffusion aux utilisateurs soit autorisée ; l’application lira ces copies et non les fichiers privés d’origine.

## Capabilities

### New Capabilities
- `exploration-regles-vetting`: Parcours, recherche, filtrage et consultation détaillée des règles de vetting traduites en français.

### Modified Capabilities

## Impact

- Application Angular existante : écran racine et présentation des données à remplacer par l’interface de consultation.
- Fichiers sources conservés dans `private/vetting-old` et copies dédiées à prévoir dans `public/vetting-data/` : `crca_initial_vetting_rules.xml` et `Vetting_fr_FR.properties`. Angular sert les fichiers présents sous `public/` comme ressources statiques ; leur diffusion les rend consultables par les utilisateurs de l’application.
- Aucun changement d’API ni nouvelle dépendance n’est présumé à ce stade.
