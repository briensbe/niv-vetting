import { VettingRule } from './vetting-catalog';

export type GroupLevel = 'file' | 'adherent' | 'offer' | 'module' | 'ruleSet';

export interface RuleGroup {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly children: readonly RuleGroup[];
  readonly rules: readonly VettingRule[];
}

function groupValue(rule: VettingRule, level: GroupLevel): { key: string; label: string } {
  switch (level) {
    case 'file':
      return {
        key: rule.sourceId ?? rule.sourceName ?? 'local',
        label: rule.sourceName || 'Fichier sans nom',
      };
    case 'adherent':
      return {
        key: rule.adherent || 'adherent-missing',
        label: rule.adherent || 'Adhérent non renseigné',
      };
    case 'offer':
      return {
        key: rule.offer || 'offer-missing',
        label: rule.offer || 'Offre non renseignée',
      };
    case 'module':
      return { key: rule.moduleId, label: rule.moduleLabel };
    case 'ruleSet':
      return {
        key: `${rule.familyId}::${rule.packageName}`,
        label: rule.familyLabel,
      };
    default:
      throw new Error(`Niveau de regroupement inconnu : ${level}.`);
  }
}

export function createRuleGroups(
  rules: readonly VettingRule[],
  levels: readonly GroupLevel[],
): RuleGroup[] {
  const groupAtLevel = (
    members: readonly VettingRule[],
    depth: number,
    parentKey: string,
  ): RuleGroup[] => {
    const level = levels[depth];
    const groups = new Map<string, { label: string; rules: VettingRule[] }>();
    for (const rule of members) {
      const value = groupValue(rule, level);
      const existing = groups.get(value.key);
      if (existing) {
        existing.rules.push(rule);
      } else {
        groups.set(value.key, { label: value.label, rules: [rule] });
      }
    }

    return [...groups.entries()].map(([key, group]) => {
      const fullKey = `${parentKey}/${key}`;
      const children: RuleGroup[] =
        depth + 1 < levels.length ? groupAtLevel(group.rules, depth + 1, fullKey) : [];
      return {
        key: fullKey,
        label: group.label,
        count: group.rules.length,
        children,
        rules: children.length === 0 ? group.rules : [],
      };
    });
  };

  return levels.length === 0 ? [] : groupAtLevel(rules, 0, 'root');
}
