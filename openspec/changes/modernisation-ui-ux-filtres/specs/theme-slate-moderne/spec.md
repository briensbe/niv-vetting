## ADDED Requirements

### Requirement: Thème graphique moderne Slate & Clean
Le système DOIT appliquer une charte graphique épurée et contemporaine remplaçant les tonalités vert forêt et crème par une palette basée sur des fonds neutres clairs, des bordures subtiles et des accents bleu ardoise/indigo.

#### Scenario: Application globale et cohérente
- **GIVEN** l'application Vetting Desk
- **WHEN** l'utilisateur navigue entre les vues Catalogue, Gestion des fichiers et Comparateur
- **THEN** l'ensemble des trois vues partage les mêmes tokens CSS de surfaces claires, de typographie sans-serif lisible et de contrastes techniques

### Requirement: Layout pleine largeur sans volet latéral redondant
Le système DOIT présenter la vue Catalogue en pleine largeur sans le volet latéral gauche de « Parcours ».

#### Scenario: Consultation en pleine largeur
- **GIVEN** la vue Catalogue
- **WHEN** l'utilisateur consulte la liste des règles
- **THEN** la totalité de la largeur d'écran est consacrée à la barre d'outils, aux groupes et aux tableaux de règles, sans colonne latérale de navigation
