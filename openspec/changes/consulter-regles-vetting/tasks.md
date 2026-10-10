## 1. Préparer les données

- [x] 1.1 Confirmer que la diffusion des deux fichiers de démonstration aux utilisateurs de l’application est autorisée ; si elle ne l’est pas, réviser l’approche avant publication.
- [x] 1.2 Copier uniquement `private/vetting-old/crca_initial_vetting_rules.xml` et `private/vetting-old/Vetting_fr_FR.properties` vers `public/vetting-data/`, sans charger les originaux privés à l’exécution.
- [x] 1.3 Vérifier l’encodage des copies et implémenter leur chargement depuis `public/vetting-data/` ainsi que l’interprétation typée du XML et des propriétés, avec gestion des erreurs explicites.
- [x] 1.4 Ajouter des tests couvrant la structure des occurrences, les profils, les traductions disponibles et manquantes, les caractères français et les entrées invalides.

## 2. Créer l’interface de consultation

- [x] 2.1 Remplacer l’écran placeholder par une interface Angular de navigation par opération et famille, avec libellés français et indication des résultats.
- [x] 2.2 Ajouter la recherche globale par identifiant, libellé et description ainsi que les filtres combinables par opération, famille, état actif et profil.
- [x] 2.3 Ajouter la consultation du détail d’une occurrence, en conservant son contexte, son état et les comportements séparés par profil.
- [x] 2.4 Présenter distinctement les états de chargement, d’erreur et d’absence de résultats, et rendre l’interface utilisable sur petit écran.

## 3. Vérifier l’évolution

- [x] 3.1 Exécuter les tests et le build Angular, puis corriger les régressions liées à l’évolution.
- [x] 3.2 Vérifier sur le jeu de données réel les recherches, filtres, libellés de repli, descriptions et occurrences ayant le même identifiant dans plusieurs contextes.

## 4. Étendre les catalogues locaux

- [x] 4.1 Persister le catalogue intégré et les catalogues importés dans IndexedDB, avec mise à jour explicite du jeu livré.
- [x] 4.2 Importer plusieurs XML valides, valider leur structure et confirmer le remplacement d’un nom déjà présent.
- [x] 4.3 Associer les fichiers `.properties` et permettre la correction des métadonnées adhérent/offre déduites du nom.
- [x] 4.4 Étendre la recherche aux métadonnées et ajouter des niveaux de regroupement configurables et réordonnables.
- [x] 4.5 Couvrir les parcours locaux par des tests et vérifier le build de production.
