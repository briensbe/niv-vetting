# Navigation et filtres hiérarchiques des règles

## Purpose

Permettre une exploration précise et rapide des catalogues multi-fichiers grâce à un sélecteur arborescent à 3 niveaux (Fichier ➔ Module ➔ Rule-set), une barre de recherche universelle mise en avant et un filtre de sévérité globale.

## Requirements

### Requirement: Sélecteur hiérarchique arborescent à 3 niveaux
Le système DOIT fournir un composant de filtre arborescent (`Tree-Select`) organisant la sélection selon la hiérarchie `Fichier (Source)` ➔ `Module` ➔ `Rule-set`.

#### Scenario: Affichage compact initial
- **GIVEN** des catalogues de règles chargés depuis plusieurs fichiers
- **WHEN** l'utilisateur ouvre le sélecteur arborescent
- **THEN** seuls les fichiers sources sont dépliés au premier niveau, leurs modules et rule-sets associés étant repliés par défaut

#### Scenario: Recherche textuelle interne et auto-dépliage
- **GIVEN** le sélecteur arborescent ouvert
- **WHEN** l'utilisateur saisit un mot-clé dans la zone de recherche interne
- **THEN** la liste filtre immédiatement les éléments correspondants et déplie automatiquement les branches parentes pour mettre en évidence les correspondances

#### Scenario: Sélection en cascade et état indéterminé
- **GIVEN** un fichier ou un module dans le sélecteur
- **WHEN** l'utilisateur coche la case d'un fichier source
- **THEN** tous les modules et rule-sets enfants de ce fichier sont cochés
- **WHEN** l'utilisateur décoche ensuite un rule-set spécifique
- **THEN** le module parent et le fichier parent passent visuellement à l'état indéterminé (`[-]`)

### Requirement: Filtrage par sévérité globale décorrélée du profil
Le système DOIT permettre de filtrer les règles affichées en fonction de leur sévérité (`ERROR`, `WARNING`, `IGNORE`) sans exiger la sélection préalable d'un profil particulier.

#### Scenario: Filtrage par présence d'une sévérité
- **GIVEN** une liste de règles contenant divers profils et réactions
- **WHEN** l'utilisateur coche la sévérité `ERROR` dans le filtre
- **THEN** le catalogue n'affiche que les règles possédant au moins un profil ayant la sévérité `ERROR` (opérateur OU inclusif)

#### Scenario: Combinaison d'une sévérité avec un profil spécifique
- **GIVEN** la sévérité `ERROR` sélectionnée
- **WHEN** l'utilisateur sélectionne en complément le profil `USER`
- **THEN** le catalogue n'affiche que les règles dont le profil `USER` est spécifiquement associé à la sévérité `ERROR`

### Requirement: Barre de recherche proéminente et réactive
Le système DOIT afficher une barre de recherche textuelle large et accessible en tête de catalogue.

#### Scenario: Déclenchement réactif avec raccourci clavier
- **GIVEN** la page de consultation du catalogue
- **WHEN** l'utilisateur presse le raccourci clavier `/` ou `Ctrl+K`
- **THEN** le focus est automatiquement placé dans la zone de recherche textuelle
- **WHEN** l'utilisateur saisit des termes de recherche
- **THEN** le catalogue s'actualise après un court délai de frappe et affiche le nombre de règles correspondantes
