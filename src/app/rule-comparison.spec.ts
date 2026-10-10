import { VettingRule } from './vetting-catalog';
import {
  compareVettingRules,
  filterComparisonItems,
} from './rule-comparison';

function mockRule(partial: Partial<VettingRule> & { moduleId: string; id: string }): VettingRule {
  const base: VettingRule = {
    key: `${partial.moduleId}::${partial.id}`,
    moduleId: partial.moduleId,
    moduleLabel: partial.moduleId,
    familyId: 'family-1',
    familyLabel: 'Family 1',
    packageName: 'com.test.Rule',
    id: partial.id,
    label: partial.id,
    description: null,
    messageVariants: [],
    active: true,
    profiles: { USER: 'ERROR', COLLABORATOR: 'ERROR' },
  };
  return {
    ...base,
    ...partial,
  };
}

describe('RuleComparisonEngine', () => {
  it('detects identical rules between two sources', () => {
    const ruleA = mockRule({ moduleId: 'MOD1', id: 'R1', active: true, profiles: { USER: 'ERROR' } });
    const ruleB = mockRule({ moduleId: 'MOD1', id: 'R1', active: true, profiles: { USER: 'ERROR' } });

    const { items, summary } = compareVettingRules([ruleA], [ruleB]);

    expect(items.length).toBe(1);
    expect(items[0].status).toBe('identical');
    expect(items[0].activeDiff).toBe(false);
    expect(items[0].hasProfileDiff).toBe(false);
    expect(summary.identicalCount).toBe(1);
    expect(summary.totalDiffsCount).toBe(0);
  });

  it('detects rules only present in source A', () => {
    const ruleA = mockRule({ moduleId: 'MOD1', id: 'R1' });

    const { items, summary } = compareVettingRules([ruleA], []);

    expect(items.length).toBe(1);
    expect(items[0].status).toBe('only_in_a');
    expect(items[0].ruleA).toBe(ruleA);
    expect(items[0].ruleB).toBeNull();
    expect(summary.onlyACount).toBe(1);
    expect(summary.totalDiffsCount).toBe(1);
  });

  it('detects rules only present in source B', () => {
    const ruleB = mockRule({ moduleId: 'MOD1', id: 'R2' });

    const { items, summary } = compareVettingRules([], [ruleB]);

    expect(items.length).toBe(1);
    expect(items[0].status).toBe('only_in_b');
    expect(items[0].ruleA).toBeNull();
    expect(items[0].ruleB).toBe(ruleB);
    expect(summary.onlyBCount).toBe(1);
    expect(summary.totalDiffsCount).toBe(1);
  });

  it('detects divergent active status when profiles are identical', () => {
    const ruleA = mockRule({ moduleId: 'MOD1', id: 'R1', active: true });
    const ruleB = mockRule({ moduleId: 'MOD1', id: 'R1', active: false });

    const { items, summary } = compareVettingRules([ruleA], [ruleB]);

    expect(items[0].status).toBe('divergent');
    expect(items[0].activeDiff).toBe(true);
    expect(items[0].hasProfileDiff).toBe(false);
    expect(items[0].activeA).toBe(true);
    expect(items[0].activeB).toBe(false);
    expect(summary.divergentCount).toBe(1);
  });

  it('detects divergent profile behaviors', () => {
    const ruleA = mockRule({
      moduleId: 'MOD1',
      id: 'R1',
      profiles: { USER: 'ERROR', ROOT: 'IGNORE' },
    });
    const ruleB = mockRule({
      moduleId: 'MOD1',
      id: 'R1',
      profiles: { USER: 'ERROR', ROOT: 'ERROR' },
    });

    const { items, summary } = compareVettingRules([ruleA], [ruleB]);

    expect(items[0].status).toBe('divergent');
    expect(items[0].hasProfileDiff).toBe(true);
    const rootDiff = items[0].profileDiffs.find((d) => d.profile === 'ROOT');
    expect(rootDiff?.hasDiff).toBe(true);
    expect(rootDiff?.behaviorA).toBe('IGNORE');
    expect(rootDiff?.behaviorB).toBe('ERROR');
    expect(summary.divergentCount).toBe(1);
  });

  it('handles profiles defined in A but missing in B', () => {
    const ruleA = mockRule({
      moduleId: 'MOD1',
      id: 'R1',
      profiles: { USER: 'ERROR', ADVISOR: 'WARNING' },
    });
    const ruleB = mockRule({
      moduleId: 'MOD1',
      id: 'R1',
      profiles: { USER: 'ERROR' },
    });

    const { items } = compareVettingRules([ruleA], [ruleB]);

    expect(items[0].status).toBe('divergent');
    const advisorDiff = items[0].profileDiffs.find((d) => d.profile === 'ADVISOR');
    expect(advisorDiff?.hasDiff).toBe(true);
    expect(advisorDiff?.behaviorA).toBe('WARNING');
    expect(advisorDiff?.behaviorB).toBeNull();
  });

  it('keeps rules with the same ID in different modules separate', () => {
    const ruleMod1A = mockRule({ moduleId: 'MOD1', id: 'COM4', active: true });
    const ruleMod1B = mockRule({ moduleId: 'MOD1', id: 'COM4', active: false });
    const ruleMod2A = mockRule({ moduleId: 'MOD2', id: 'COM4', active: true });
    const ruleMod2B = mockRule({ moduleId: 'MOD2', id: 'COM4', active: true });

    const { items, summary } = compareVettingRules(
      [ruleMod1A, ruleMod2A],
      [ruleMod1B, ruleMod2B],
    );

    expect(items.length).toBe(2);
    expect(items.find((i) => i.moduleId === 'MOD1')?.status).toBe('divergent');
    expect(items.find((i) => i.moduleId === 'MOD2')?.status).toBe('identical');
    expect(summary.totalRules).toBe(2);
    expect(summary.identicalCount).toBe(1);
    expect(summary.divergentCount).toBe(1);
  });

  describe('filterComparisonItems', () => {
    const ruleIdentical = mockRule({ moduleId: 'MOD1', id: 'R1', label: 'Règle Identique' });
    const ruleDivergent = mockRule({ moduleId: 'MOD1', id: 'R2', active: false, label: 'Règle Divergente' });
    const ruleOnlyA = mockRule({ moduleId: 'MOD2', id: 'R3', label: 'Règle Uniquement A' });
    const ruleOnlyB = mockRule({ moduleId: 'MOD2', id: 'R4', label: 'Règle Uniquement B' });

    const { items } = compareVettingRules(
      [ruleIdentical, mockRule({ moduleId: 'MOD1', id: 'R2', active: true }), ruleOnlyA],
      [ruleIdentical, ruleDivergent, ruleOnlyB],
    );

    it('filters all diffs by default (excludes identical)', () => {
      const filtered = filterComparisonItems(items, { diffFilter: 'all_diffs' });
      expect(filtered.every((i) => i.status !== 'identical')).toBe(true);
      expect(filtered.length).toBe(3);
    });

    it('filters only divergent items', () => {
      const filtered = filterComparisonItems(items, { diffFilter: 'divergent' });
      expect(filtered.length).toBe(1);
      expect(filtered[0].ruleId).toBe('R2');
    });

    it('filters only A items', () => {
      const filtered = filterComparisonItems(items, { diffFilter: 'only_a' });
      expect(filtered.length).toBe(1);
      expect(filtered[0].ruleId).toBe('R3');
    });

    it('filters only B items', () => {
      const filtered = filterComparisonItems(items, { diffFilter: 'only_b' });
      expect(filtered.length).toBe(1);
      expect(filtered[0].ruleId).toBe('R4');
    });

    it('filters identical items', () => {
      const filtered = filterComparisonItems(items, { diffFilter: 'identical' });
      expect(filtered.length).toBe(1);
      expect(filtered[0].ruleId).toBe('R1');
    });

    it('filters by query across labels or rule IDs', () => {
      const filtered = filterComparisonItems(items, {
        diffFilter: 'all',
        query: 'divergente',
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0].ruleId).toBe('R2');
    });

    it('filters by module', () => {
      const filtered = filterComparisonItems(items, {
        diffFilter: 'all',
        moduleId: 'MOD2',
      });
      expect(filtered.length).toBe(2);
      expect(filtered.every((i) => i.moduleId === 'MOD2')).toBe(true);
    });
  });
});
