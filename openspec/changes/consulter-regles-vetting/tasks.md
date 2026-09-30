## 1. Préparer les données

- [ ] 1.1 Confirmer que la diffusion des deux fichiers de démonstration aux utilisateurs de l’application est autorisée ; si elle ne l’est pas, réviser l’approche avant publication.
- [ ] 1.2 Copier uniquement `private/vetting-old/crca_initial_vetting_rules.xml` et `private/vetting-old/Vetting_fr_FR.properties` vers `public/vetting-data/`, sans charger les originaux privés à l’exécution.
- [ ] 1.3 Vérifier l’encodage des copies et implémenter leur chargement depuis `public/vetting-data/` ainsi que l’interprétation typée du XML et des propriétés, avec gestion des erreurs explicites.
- [ ] 1.4 Ajouter des tests couvrant la structure des occurrences, les profils, les traductions disponibles et manquantes, les caractères français et les entrées invalides.

## 2. Créer l’interface de consultation

- [ ] 2.1 Remplacer l’écran placeholder par une interface Angular de navigation par opération et famille, avec libellés français et indication des résultats.
- [ ] 2.2 Ajouter la recherche globale par identifiant, libellé et description ainsi que les filtres combinables par opération, famille, état actif et profil.
- [ ] 2.3 Ajouter la consultation du détail d’une occurrence, en conservant son contexte, son état et les comportements séparés par profil.
- [ ] 2.4 Présenter distinctement les états de chargement, d’erreur et d’absence de résultats, et rendre l’interface utilisable sur petit écran.

## 3. Vérifier l’évolution

- [ ] 3.1 Exécuter les tests et le build Angular, puis corriger les régressions liées à l’évolution.
- [ ] 3.2 Vérifier sur le jeu de données réel les recherches, filtres, libellés de repli, descriptions et occurrences ayant le même identifiant dans plusieurs contextes.
