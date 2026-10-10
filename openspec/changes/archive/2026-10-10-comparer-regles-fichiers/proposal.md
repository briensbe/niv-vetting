## Why

Lors de la gestion des référentiels de contrôle et de vetting, les utilisateurs doivent pouvoir confronter deux fichiers XML de configuration (par exemple entre deux adhérents, deux offres, ou deux versions successives) afin d'identifier rapidement les similarités et surtout les écarts. Actuellement, l'application permet uniquement d'explorer le catalogue consolidé ou de gérer les fichiers importés, sans vue différentielle dédiée.

L'ajout d'un troisième onglet de comparaison permet aux équipes métier et techniques d'auditer immédiatement les divergences de configuration, de valider la conformité des règles et de détecter les anomalies de paramétrage (règles manquantes, désactivées ou comportements de profils discordants) sans manipulation manuelle fastidieuse.

## What Changes

- **Nouvel onglet de navigation (03 Comparateur / Comparer deux fichiers)** : Ajout d'une vue dédiée accessible depuis la barre d'onglets principale aux côtés de l'exploration du catalogue et de la gestion des fichiers.
- **Sélection des sources à comparer** : Sélecteurs permettant de choisir un fichier source A (référence) et un fichier source B (cible) parmi les fichiers locaux enregistrés.
- **Moteur de comparaison de règles par clé composite `Module + Règle`** :
  - Rapprochement des règles sur la clé `${moduleId}::${ruleId}`.
  - Qualification de chaque règle : identique, divergence de configuration (statut actif, profils), exclusivité source A, exclusivité source B.
  - Détection détaillée des écarts de profils (profils absents ou comportements divergents : `ERROR`, `WARNING`, `WARNING_ACCEPTED`, `IGNORE`).
- **Tableau de bord de synthèse (KPIs d'écarts)** : Indicateurs visuels synthétisant le nombre total de règles comparées, le nombre de règles identiques, les divergences, et les règles exclusives à chaque fichier.
- **Filtres rapides et recherche** : Filtrage par défaut axé sur « Tous les écarts », avec bascule possible vers les règles identiques ou l'affichage exhaustif, recherche textuelle et filtrage par module.
- **Vue détaillée des écarts** : Affichage clair pour chaque règle divergente de l'état d'activation (A vs B) et d'un tableau comparatif des comportements par profil.
- **Gestion des états limites** : Message explicatif et invitation à importer des fichiers si moins de deux sources sont disponibles dans le stockage local.

## Capabilities

### New Capabilities
- `comparaison-regles-fichiers`: Comparaison différentielle entre deux jeux de règles XML, qualification des écarts (présence, statut d'activation, profils et sévérités) et interface d'audit interactive.

### Modified Capabilities
<!-- Aucune modification des exigences sur les capacités existantes -->

## Impact

- **Composant principal (`src/app/app.*`)** : Ajout de la vue `compare` dans `workspaceView`, intégration des sélecteurs de sources, des filtres et du panneau d'affichage comparatif.
- **Modèle et services métier (`src/app/vetting-catalog*`)** : Fonctions pures ou service dédié pour la comparaison différentielle entre deux sources (`VettingRuleComparison`, `compareVettingSources`).
- **Styles CSS (`src/app/app.css`)** : Nouveaux styles pour la grille de synthèse des écarts, les cartes/lignes comparatives, les badges de statut de divergence et les tableaux de profils différentiels.
- **Tests unitaires** : Couverture des algorithmes de comparaison (cas identiques, ajouts, suppressions, divergences de profils et d'activation) et des interactions de l'interface.
