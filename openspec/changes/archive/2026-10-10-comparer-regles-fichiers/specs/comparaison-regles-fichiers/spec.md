## ADDED Requirements

### Requirement: Accès au comparateur et sélection de deux sources
L'application DOIT proposer un troisième onglet de navigation permettant de comparer deux jeux de règles distincts issus des fichiers locaux enregistrés.

#### Scenario: Navigation vers le comparateur
- **GIVEN** l'utilisateur est sur la page d'accueil de l'application
- **WHEN** il clique sur l'onglet « 03 Comparer deux fichiers »
- **THEN** l'application affiche l'interface du comparateur avec les sélecteurs de source A et source B

#### Scenario: Sélection de deux fichiers distincts
- **GIVEN** au moins deux fichiers sources sont disponibles dans le stockage local
- **WHEN** l'utilisateur sélectionne un premier fichier comme source A et un second comme source B
- **THEN** le comparateur recalcule automatiquement et immédiatement l'ensemble des écarts et des similarités entre ces deux sources

### Requirement: Calcul différentiel basé sur la clé composite Module + Règle
Le moteur de comparaison DOIT rapprocher les règles entre la source A et la source B en utilisant comme identifiant unique d'alignement le couple formé par l'identifiant du module et l'identifiant de la règle (`${moduleId}::${ruleId}`).

#### Scenario: Rapprochement de règles partageant le même identifiant dans des modules différents
- **GIVEN** une règle avec l'identifiant `COM4` présente dans le module `MODULE_1` et dans le module `MODULE_2`
- **WHEN** le calcul de comparaison est exécuté
- **THEN** `COM4` sous `MODULE_1` et `COM4` sous `MODULE_2` sont traitées comme deux entités comparatives distinctes et indépendantes

### Requirement: Qualification des statuts de comparaison
Chaque règle rapprochée DOIT être qualifiée selon l'un des statuts suivants :
1. `SEULEMENT_A` : présente dans la source A mais absente de la source B.
2. `SEULEMENT_B` : présente dans la source B mais absente de la source A.
3. `IDENTIQUE` : présente dans les deux sources avec le même état d'activation et exactement les mêmes profils et comportements associés.
4. `DIVERGENTE` : présente dans les deux sources mais présentant au moins un écart d'activation (`active`) ou de profil (profil manquant d'un côté ou niveau de comportement différent).

#### Scenario: Détection d'une règle identique
- **GIVEN** une règle présente dans A et B avec `active=true` et les profils `USER=ERROR`, `COLLABORATOR=ERROR` dans les deux sources
- **WHEN** la comparaison est calculée
- **THEN** la règle est qualifiée avec le statut `IDENTIQUE`

#### Scenario: Détection d'une divergence d'activation
- **GIVEN** une règle présente dans A avec `active=true` et dans B avec `active=false`
- **WHEN** la comparaison est calculée
- **THEN** la règle est qualifiée avec le statut `DIVERGENTE` et l'écart d'activation est explicité

#### Scenario: Détection d'une divergence sur les profils
- **GIVEN** une règle présente dans A avec le profil `ROOT=IGNORE` et dans B avec le profil `ROOT=ERROR`
- **WHEN** la comparaison est calculée
- **THEN** la règle est qualifiée avec le statut `DIVERGENTE` et la divergence de comportement sur le profil `ROOT` est répertoriée

### Requirement: Tableau de bord de synthèse et filtrage des résultats
Le comparateur DOIT présenter une synthèse chiffrée immédiate et permettre de filtrer instantanément les résultats avec un affichage par défaut orienté vers les écarts.

#### Scenario: Affichage par défaut orienté sur les écarts
- **GIVEN** deux sources comparées contenant des règles identiques et des règles divergentes
- **WHEN** la vue de comparaison est affichée
- **THEN** la liste des résultats filtre par défaut sur « Tous les écarts » (règles divergentes, règles seulement dans A et règles seulement dans B), masquant initialement les règles strictement identiques

#### Scenario: Bascule vers l'affichage des règles identiques ou complet
- **GIVEN** la vue de comparaison affichée
- **WHEN** l'utilisateur sélectionne le filtre « Identiques » ou « Tout afficher »
- **THEN** la liste s'actualise pour afficher respectivement uniquement les règles identiques ou l'intégralité des règles analysées

#### Scenario: Recherche textuelle et filtre par module
- **GIVEN** des résultats de comparaison affichés
- **WHEN** l'utilisateur saisit un mot-clé dans la recherche ou sélectionne un module spécifique
- **THEN** la liste filtrée conserve le critère d'écart sélectionné tout en restreignant les résultats au texte ou au module choisi

### Requirement: Affichage détaillé des divergences
Pour chaque règle présentant des divergences, l'interface DOIT afficher clairement les différences d'activation et une matrice comparative des profils.

#### Scenario: Visualisation comparative des profils
- **GIVEN** une règle divergente sélectionnée ou dépliée
- **WHEN** l'utilisateur consulte le détail de la règle
- **THEN** l'interface présente pour chaque profil son état dans la source A, son état dans la source B, et un indicateur visuel mettant en évidence l'écart de comportement

### Requirement: Gestion des sources insuffisantes
Lorsque le catalogue local compte moins de deux sources de règles enregistrées, le comparateur DOIT guider l'utilisateur.

#### Scenario: Moins de deux fichiers enregistrés
- **GIVEN** l'application possède 0 ou 1 fichier source dans son stockage local
- **WHEN** l'utilisateur consulte l'onglet du comparateur
- **THEN** l'application affiche un message explicatif invitant à importer au moins deux fichiers dans l'onglet « Gérer les fichiers »
