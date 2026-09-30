## ADDED Requirements

### Requirement: Parcourir les règles par opération et famille
L’interface SHALL présenter les règles du jeu de données en conservant leur contexte d’opération (module) et de famille (rule-set). Une règle apparaissant dans plusieurs contextes SHALL rester consultable dans chacun d’eux.

#### Scenario: Sélectionner une opération
- **WHEN** l’utilisateur sélectionne une opération dans la navigation
- **THEN** l’interface affiche les familles et les règles appartenant à cette opération avec leurs libellés français disponibles

#### Scenario: Parcourir une famille
- **WHEN** l’utilisateur sélectionne une famille de règles
- **THEN** l’interface limite la liste aux règles de cette famille et conserve leur identifiant et leur contexte

### Requirement: Rechercher et filtrer les règles
L’interface SHALL permettre une recherche globale par identifiant, libellé français ou description, ainsi que le filtrage par opération, famille, état actif et comportement configuré pour un profil. La recherche globale SHALL pouvoir retourner les règles indépendamment de l’opération sélectionnée dans la navigation.

#### Scenario: Rechercher une règle par identifiant ou libellé
- **WHEN** l’utilisateur saisit un identifiant ou un terme présent dans un libellé ou une description française
- **THEN** l’interface affiche les occurrences correspondantes avec leur contexte d’opération et de famille

#### Scenario: Combiner des filtres
- **WHEN** l’utilisateur applique plusieurs filtres simultanément
- **THEN** l’interface affiche uniquement les occurrences satisfaisant tous les filtres sélectionnés

#### Scenario: Aucun résultat
- **WHEN** aucun élément ne correspond à la recherche et aux filtres
- **THEN** l’interface indique qu’aucune règle ne correspond et permet à l’utilisateur de modifier ou réinitialiser ses critères

### Requirement: Consulter les informations d’une règle
Pour chaque occurrence de règle, l’interface SHALL présenter l’identifiant, le libellé français s’il existe, l’état actif, l’opération, la famille et le comportement configuré pour chaque profil disponible. Elle SHALL afficher la description française lorsqu’elle existe et utiliser l’identifiant de règle comme libellé de repli en l’absence de traduction.

#### Scenario: Consulter une règle traduite
- **WHEN** l’utilisateur ouvre le détail d’une règle ayant un libellé ou une description française
- **THEN** l’interface présente les traductions disponibles et les comportements par profil associés à cette occurrence

#### Scenario: Consulter une règle sans libellé traduit
- **WHEN** l’utilisateur consulte une règle dont l’identifiant n’a pas de libellé correspondant dans le fichier properties
- **THEN** l’interface affiche son identifiant comme libellé et laisse la description absente si aucune description n’existe

#### Scenario: Voir le comportement par profil
- **WHEN** les comportements de la règle diffèrent entre les profils
- **THEN** l’interface affiche séparément la valeur configurée pour chaque profil sans les fusionner

### Requirement: Charger et interpréter les fichiers de règles
L’application SHALL charger comme paire de données de démonstration les copies `public/vetting-data/crca_initial_vetting_rules.xml` et `public/vetting-data/Vetting_fr_FR.properties`. Les originaux sous `private/vetting-old` SHALL rester les sources de copie et ne SHALL pas être chargés directement par l’application. L’application SHALL associer les libellés de module à partir des clés `module.<identifiant>`, les libellés de règle à partir de leur identifiant et les descriptions à partir de la clé `<identifiant>.description`. Une erreur de chargement ou d’interprétation SHALL être signalée explicitement au lieu d’afficher une liste vide présentée comme valide.

#### Scenario: Charger les copies publiques de démonstration
- **WHEN** l’application démarre avec les deux fichiers disponibles et valides
- **THEN** elle construit les opérations, familles, règles et libellés correspondants à partir de ces fichiers

#### Scenario: Ne pas lire directement les originaux privés
- **WHEN** l’application charge le catalogue
- **THEN** elle lit uniquement les copies sous `public/vetting-data/` et n’accède pas directement aux fichiers sources sous `private/vetting-old`

#### Scenario: Fichier manquant ou invalide
- **WHEN** un des fichiers est absent ou ne peut pas être interprété
- **THEN** l’interface affiche un état d’erreur explicite et n’indique pas que le catalogue vide est un chargement réussi

### Requirement: Présenter une interface utilisable sur différentes tailles d’écran
L’interface SHALL permettre l’accès aux fonctions de navigation, de recherche et de détail sur les tailles d’écran prises en charge par l’application, et SHALL rendre les informations compréhensibles sans dépendre uniquement de la couleur.

#### Scenario: Utiliser l’interface sur petit écran
- **WHEN** l’application est affichée dans un viewport étroit
- **THEN** la navigation, les filtres et le détail restent accessibles sans exiger une disposition côte à côte permanente
