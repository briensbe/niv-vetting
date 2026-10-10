## Context

L'application Vetting Desk permet de charger et de consulter localement des jeux de règles de vetting issus de fichiers XML (avec ou sans fichiers `.properties` pour les libellés). L'utilisateur peut importer plusieurs fichiers (fichiers de référence, fichiers spécifiques à des adhérents ou des offres).

Pour comparer deux fichiers, l'utilisateur a besoin d'identifier immédiatement les règles identiques et surtout les divergences (règles désactivées, règles absentes d'un côté, profils avec des niveaux de sévérité discordants tels que `ERROR` vs `WARNING` ou `IGNORE`).

Chaque fichier contient des modules qui contiennent des rule-sets, lesquels contiennent des `rule-def`. Un même identifiant de règle (ex: `COM4`) peut coexister dans plusieurs modules différents avec des significations fonctionnelles distinctes. La comparaison doit donc obligatoirement être indexée par le couple `Module + Règle`.

## Goals / Non-Goals

**Goals:**
- Proposer un troisième onglet « 03 Comparateur » permettant de sélectionner une source A et une source B parmi les fichiers locaux.
- Aligner les règles entre les deux sources sur la clé unique composite `${moduleId}::${ruleId}`.
- Fournir un indicateur de synthèse des écarts (total règles, identiques, divergences de paramétrage, exclusivité source A, exclusivité source B).
- Positionner par défaut la vue sur « Tous les écarts » pour une lecture directe des divergences.
- Afficher pour chaque règle divergente une comparaison visuelle claire de l'état d'activation et une matrice comparative des profils (valeur dans A, valeur dans B, mise en évidence des discordances).
- Permettre la recherche textuelle et le filtrage par module ou par type de divergence.
- Traiter avec élégance le cas où moins de deux fichiers sont présents en orientant l'utilisateur vers l'onglet de gestion des fichiers.

**Non-Goals:**
- Export de fichiers (CSV, Excel ou rapport PDF) pour cette première version (explicitement exclu à ce stade).
- Édition ou fusion directe des règles (merge/résolution de conflits dans l'interface).
- Comparaison sémantique des expressions de règles ou du code Java sous-jacent.

## Decisions

### 1. Clé d'alignement composite `moduleId + ruleId`
- **Décision** : Deux règles issues de A et B sont considérées comme la même règle à comparer si et seulement si `ruleA.moduleId === ruleB.moduleId` et `ruleA.id === ruleB.id`.
- **Alternatives considérées** :
  - *Identifiant de règle seul (`rule.id`)* : Rejeté, car une règle comme `COM4` existe dans plusieurs modules avec des contextes d'exécution différents.
  - *Triplet `moduleId + ruleSetId + ruleId`* : Rejeté, car l'identifiant technique du rule-set peut varier d'un packaging à l'autre sans que la règle métier ne change de module.

### 2. Moteur de calcul différentiel pur et réactif
- **Décision** : Implémenter la logique de comparaison sous forme de fonctions TypeScript pures dans un module dédié (`rule-comparison.ts` ou dans le service de catalogue). Le composant Angular expose des Signals calculés (`computed()`) réagissant au changement des deux sources sélectionnées et aux critères de filtre.
- **Alternatives considérées** :
  - *Calcul différé en Web Worker* : Inutile à ce stade car le volume typique (3 000 à 6 000 règles) s'exécute en quelques millisecondes via des structures `Map<string, VettingRule>`.

### 3. Matrice de profils comparative
- **Décision** : Pour une règle commune aux deux fichiers, l'union ordonnée des profils présents dans A et B est construite. Pour chaque profil, on compare la valeur dans A et dans B :
  - Si `behaviorA === behaviorB` : Statut identique (badge neutre).
  - Si `behaviorA !== behaviorB` : Statut divergent (badge d'alerte avec visualisation A ➔ B).
  - Si absent d'un côté : Mention explicite `Non défini` ou `Absent`.

### 4. Filtre par défaut sur les divergences
- **Décision** : Par défaut, le filtre de statut est initialisé sur `all-diffs` (qui regroupe `DIVERGENTE`, `SEULEMENT_A` et `SEULEMENT_B`). L'utilisateur n'est pas submergé par les 95% de règles identiques et peut basculer en un clic sur `identical` ou `all`.

## Risks / Trade-offs

- **[Risque] Volume de données et performances de rendu DOM** → Bien que le calcul différentiel en mémoire soit rapide (< 10 ms), le rendu de plusieurs milliers de lignes complexes avec détails de profils peut ralentir l'affichage initial si tout est ouvert.
  - *Atténuation* : La vue par défaut filtre sur les écarts (généralement une minorité de règles). De plus, l'utilisation de détails dépliables ou d'un affichage paginé/limité évite la surcharge du DOM.
- **[Risque] Profils implicites vs explicites** → Dans certains XML de vetting, le profil `USER` sert de repli par défaut pour les profils non déclarés.
  - *Atténuation* : Comparer fidèlement les déclarations présentes dans les XML tout en affichant clairement l'absence de déclaration explicite d'un profil.

## Migration Plan

- Ajout transparent et non destructif d'un 3e onglet dans l'interface sans impacter l'état de l'onglet catalogue ou gestion des fichiers.
- Déploiement direct avec la version de l'application Angular.

## Open Questions

- Aucune question bloquante en suspens (choix par défaut et clé composite validés par l'utilisateur).
