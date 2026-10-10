import { VettingRule } from './vetting-catalog';

export type RuleComparisonStatus =
  | 'identical'
  | 'divergent'
  | 'only_in_a'
  | 'only_in_b';

export type ComparisonDiffFilter =
  | 'all_diffs'
  | 'divergent'
  | 'only_a'
  | 'only_b'
  | 'identical'
  | 'all';

export interface ProfileDiff {
  readonly profile: string;
  readonly behaviorA: string | null;
  readonly behaviorB: string | null;
  readonly hasDiff: boolean;
}

export interface RuleComparisonItem {
  readonly comparisonKey: string;
  readonly moduleId: string;
  readonly moduleLabel: string;
  readonly ruleId: string;
  readonly label: string;
  readonly description: string | null;
  readonly ruleA: VettingRule | null;
  readonly ruleB: VettingRule | null;
  readonly status: RuleComparisonStatus;
  readonly activeA: boolean | null;
  readonly activeB: boolean | null;
  readonly activeDiff: boolean;
  readonly profileDiffs: readonly ProfileDiff[];
  readonly hasProfileDiff: boolean;
}

export interface ComparisonSummary {
  readonly totalRules: number;
  readonly identicalCount: number;
  readonly divergentCount: number;
  readonly onlyACount: number;
  readonly onlyBCount: number;
  readonly totalDiffsCount: number;
}

export interface ComparisonFilterOptions {
  readonly diffFilter: ComparisonDiffFilter;
  readonly moduleId?: string;
  readonly query?: string;
}

export function buildRuleComparisonKey(moduleId: string, ruleId: string): string {
  return `${moduleId}::${ruleId}`;
}

export function compareVettingRules(
  rulesA: readonly VettingRule[],
  rulesB: readonly VettingRule[],
): {
  readonly items: readonly RuleComparisonItem[];
  readonly summary: ComparisonSummary;
} {
  const mapA = new Map<string, VettingRule>();
  for (const rule of rulesA) {
    const key = buildRuleComparisonKey(rule.moduleId, rule.id);
    if (!mapA.has(key)) {
      mapA.set(key, rule);
    }
  }

  const mapB = new Map<string, VettingRule>();
  for (const rule of rulesB) {
    const key = buildRuleComparisonKey(rule.moduleId, rule.id);
    if (!mapB.has(key)) {
      mapB.set(key, rule);
    }
  }

  const allKeys = new Set<string>([...mapA.keys(), ...mapB.keys()]);
  const items: RuleComparisonItem[] = [];

  for (const key of allKeys) {
    const ruleA = mapA.get(key) ?? null;
    const ruleB = mapB.get(key) ?? null;

    if (ruleA && !ruleB) {
      const profileDiffs: ProfileDiff[] = Object.entries(ruleA.profiles)
        .sort(([left], [right]) => left.localeCompare(right, 'fr-FR'))
        .map(([profile, behaviorA]) => ({
          profile,
          behaviorA,
          behaviorB: null,
          hasDiff: true,
        }));

      items.push({
        comparisonKey: key,
        moduleId: ruleA.moduleId,
        moduleLabel: ruleA.moduleLabel,
        ruleId: ruleA.id,
        label: ruleA.label,
        description: ruleA.description,
        ruleA,
        ruleB: null,
        status: 'only_in_a',
        activeA: ruleA.active,
        activeB: null,
        activeDiff: false,
        profileDiffs,
        hasProfileDiff: profileDiffs.length > 0,
      });
    } else if (!ruleA && ruleB) {
      const profileDiffs: ProfileDiff[] = Object.entries(ruleB.profiles)
        .sort(([left], [right]) => left.localeCompare(right, 'fr-FR'))
        .map(([profile, behaviorB]) => ({
          profile,
          behaviorA: null,
          behaviorB,
          hasDiff: true,
        }));

      items.push({
        comparisonKey: key,
        moduleId: ruleB.moduleId,
        moduleLabel: ruleB.moduleLabel,
        ruleId: ruleB.id,
        label: ruleB.label,
        description: ruleB.description,
        ruleA: null,
        ruleB,
        status: 'only_in_b',
        activeA: null,
        activeB: ruleB.active,
        activeDiff: false,
        profileDiffs,
        hasProfileDiff: profileDiffs.length > 0,
      });
    } else if (ruleA && ruleB) {
      const activeDiff = ruleA.active !== ruleB.active;
      const allProfiles = [
        ...new Set([...Object.keys(ruleA.profiles), ...Object.keys(ruleB.profiles)]),
      ].sort((left, right) => left.localeCompare(right, 'fr-FR'));

      const profileDiffs: ProfileDiff[] = allProfiles.map((profile) => {
        const behaviorA = ruleA.profiles[profile] ?? null;
        const behaviorB = ruleB.profiles[profile] ?? null;
        return {
          profile,
          behaviorA,
          behaviorB,
          hasDiff: behaviorA !== behaviorB,
        };
      });

      const hasProfileDiff = profileDiffs.some((diff) => diff.hasDiff);
      const isDivergent = activeDiff || hasProfileDiff;

      const label =
        ruleA.label && ruleA.label !== ruleA.id
          ? ruleA.label
          : ruleB.label && ruleB.label !== ruleB.id
            ? ruleB.label
            : ruleA.label || ruleB.label;
      const description = ruleA.description || ruleB.description;

      items.push({
        comparisonKey: key,
        moduleId: ruleA.moduleId,
        moduleLabel: ruleA.moduleLabel,
        ruleId: ruleA.id,
        label,
        description,
        ruleA,
        ruleB,
        status: isDivergent ? 'divergent' : 'identical',
        activeA: ruleA.active,
        activeB: ruleB.active,
        activeDiff,
        profileDiffs,
        hasProfileDiff,
      });
    }
  }

  items.sort((left, right) => {
    const moduleComparison = left.moduleId.localeCompare(right.moduleId, 'fr-FR');
    if (moduleComparison !== 0) {
      return moduleComparison;
    }
    return left.ruleId.localeCompare(right.ruleId, 'fr-FR', { numeric: true });
  });

  let identicalCount = 0;
  let divergentCount = 0;
  let onlyACount = 0;
  let onlyBCount = 0;

  for (const item of items) {
    switch (item.status) {
      case 'identical':
        identicalCount += 1;
        break;
      case 'divergent':
        divergentCount += 1;
        break;
      case 'only_in_a':
        onlyACount += 1;
        break;
      case 'only_in_b':
        onlyBCount += 1;
        break;
    }
  }

  const summary: ComparisonSummary = {
    totalRules: items.length,
    identicalCount,
    divergentCount,
    onlyACount,
    onlyBCount,
    totalDiffsCount: divergentCount + onlyACount + onlyBCount,
  };

  return { items, summary };
}

function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function filterComparisonItems(
  items: readonly RuleComparisonItem[],
  options: ComparisonFilterOptions,
): readonly RuleComparisonItem[] {
  const query = options.query ? normalizeSearchText(options.query.trim()) : '';
  const moduleId = options.moduleId && options.moduleId !== 'all' ? options.moduleId : null;

  return items.filter((item) => {
    if (moduleId && item.moduleId !== moduleId) {
      return false;
    }

    switch (options.diffFilter) {
      case 'all_diffs':
        if (item.status === 'identical') {
          return false;
        }
        break;
      case 'divergent':
        if (item.status !== 'divergent') {
          return false;
        }
        break;
      case 'only_a':
        if (item.status !== 'only_in_a') {
          return false;
        }
        break;
      case 'only_b':
        if (item.status !== 'only_in_b') {
          return false;
        }
        break;
      case 'identical':
        if (item.status !== 'identical') {
          return false;
        }
        break;
      case 'all':
        break;
    }

    if (query) {
      const searchable = normalizeSearchText(
        [
          item.ruleId,
          item.label,
          item.description ?? '',
          item.ruleA?.label ?? '',
          item.ruleA?.description ?? '',
          item.ruleB?.label ?? '',
          item.ruleB?.description ?? '',
          item.moduleId,
          item.moduleLabel,
          ...item.profileDiffs.map((diff) => diff.profile),
          ...item.profileDiffs.map((diff) => diff.behaviorA ?? ''),
          ...item.profileDiffs.map((diff) => diff.behaviorB ?? ''),
        ].join(' '),
      );
      if (!searchable.includes(query)) {
        return false;
      }
    }

    return true;
  });
}
