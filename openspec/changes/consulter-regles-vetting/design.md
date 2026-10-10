## Context

L’application est un projet Angular encore à l’écran de démarrage. Les sources fournies sont un XML d’environ 880 Ko et un fichier Java properties d’environ 1,1 Mo. Le XML décrit des modules (opérations), des rule-sets (familles) et des rule-defs (occurrences de règles) ; plusieurs occurrences peuvent partager un même identifiant. Les propriétés contiennent des traductions de module, des libellés de règle et des descriptions. Les originaux sont aujourd’hui sous `private/vetting-old`. Le projet Angular 22 configure `public/` comme source de ressources statiques à copier dans le build ; l’application consommera des copies dédiées placées sous `public/vetting-data/`, et non les originaux privés.

Le choix confirmé pour la proposition est un jeu de données de démonstration intégré à l’application. Cela suppose que les utilisateurs de l’application sont autorisés à consulter le contenu de ces deux fichiers.

## Goals / Non-Goals

**Goals:**
- Fournir un catalogue consultable en français, navigable par opération et famille.
- Permettre recherche et filtres combinables sur un volume de quelques milliers d’occurrences.
- Conserver les profils, l’état actif et le contexte de chaque occurrence.
- Rendre explicites les absences de traduction et les erreurs de chargement.

**Non-Goals:**
- Modifier, activer ou désactiver les règles.
- Ajouter une API ou un contrôle d’accès côté serveur dans cette évolution.
- Charger les autres fichiers présents dans `private/vetting-old` ou fournir un import arbitraire de fichiers utilisateur.
- Traduire les identifiants ou inventer des libellés manquants.

## Decisions

1. **Copier uniquement la paire de fichiers prévue dans `public/vetting-data/` et charger ces copies comme ressources statiques Angular.** Les fichiers originaux restent dans `private/vetting-old` et ne sont jamais chargés directement par l’application. Cette approche suit la configuration Angular existante qui copie `public/` dans les ressources servies au build, sans service backend ni dépendance supplémentaire. Le contenu de `public/` étant publiquement servi, la copie ne doit être publiée qu’après approbation de sa diffusion. Alternative écartée : `src/assets`, qui nécessiterait de modifier la configuration existante alors que `public/` est déjà configuré.

2. **Transformer les fichiers à l’initialisation en un modèle de consultation typé, sans dédupliquer les occurrences.** Le modèle garde le module, le rule-set, le package, l’identifiant, l’état actif et la collection des profils pour chaque occurrence. Les traductions sont résolues par clés de propriétés ; l’identifiant sert de libellé de repli. Certains `rule-set` n’ont pas d’attribut `id` : dans ce cas, dériver leur libellé du package Java et générer un identifiant interne stable propre à l’opération, en conservant le package complet dans le détail. Cette structure préserve les différences contextuelles entre occurrences d’un même identifiant.

3. **Séparer la navigation contextuelle de la recherche globale.** La navigation sélectionne opération puis famille, tandis qu’une recherche globale peut retourner des occurrences de toutes les opérations. Les filtres combinés s’appliquent sur les occurrences, ce qui permet de conserver leur contexte sans fusion accidentelle.

4. **Traiter explicitement l’encodage et la syntaxe Java properties.** Le chargement devra gérer le format réel du fichier, les commentaires, séparateurs, échappements et éventuelles continuations de lignes ; il ne devra pas supposer qu’un simple découpage naïf sur `=` suffit. Si nécessaire, normaliser les ressources dédiées en UTF-8 tout en préservant les caractères et la sémantique des propriétés.

5. **Afficher une erreur de données distincte d’un catalogue valide vide.** Les erreurs réseau, XML invalide ou propriétés non interprétables doivent produire un état visible, sans masquer la cause derrière des données vides.

## Risks / Trade-offs

- [Les fichiers sous `public/vetting-data/` sont servis aux utilisateurs et peuvent être récupérés] → Ne copier ni publier les fichiers avant validation de leur autorisation de diffusion ; si elle n’est pas acquise, réviser l’approche et proposer une API protégée.
- [Les copies publiques peuvent diverger des originaux privés lors d’une mise à jour] → Faire de la copie depuis les deux chemins sources une étape explicite et vérifiable ; conserver les noms et la paire de fichiers prévus, sans charger le répertoire privé à l’exécution.
- [Un parseur properties incomplet ou un mauvais décodage altère les libellés français] → Vérifier l’encodage source et couvrir les échappements, commentaires, continuations et caractères accentués avec des tests représentatifs.
- [Les doublons d’identifiant produisent des résultats visuellement répétés] → Afficher l’opération et la famille dans les résultats et détails, et traiter chaque occurrence séparément.
- [Le volume peut rendre une liste longue difficile à parcourir] → Filtrer côté client sur le modèle chargé et garder les interactions de recherche réactives ; évaluer la virtualisation si les essais d’usage montrent un besoin.

## Migration Plan

1. Confirmer l’autorisation de diffuser les deux fichiers, puis copier uniquement `private/vetting-old/crca_initial_vetting_rules.xml` et `private/vetting-old/Vetting_fr_FR.properties` vers `public/vetting-data/`.
2. Ajouter le chargement des copies sous `public/vetting-data/`, leur interprétation, le modèle typé et les tests de traduction et de structure.
3. Remplacer l’écran placeholder par la navigation, la recherche, les filtres et le détail.
4. Vérifier le build et les scénarios du catalogue avant déploiement.

Le retour arrière consiste à rétablir l’écran Angular précédent et à retirer les ressources de démonstration de la distribution. Aucune migration serveur n’est prévue.

## Open Questions

- L’autorisation de distribuer ces règles et leurs libellés avec l’application reste à confirmer avant leur publication.
- Le format et l’encodage exacts de la source properties devront être vérifiés pendant l’implémentation afin de choisir une normalisation sûre.
