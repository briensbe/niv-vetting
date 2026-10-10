import { Component, computed, effect, input, output, signal } from '@angular/core';
import { StoredVettingSource } from './vetting-catalog-storage';
import { VettingRule } from './vetting-catalog';
import {
  compareVettingRules,
  filterComparisonItems,
  formatCount,
  getBehaviorClass,
  ComparisonDiffFilter,
  ComparisonSummary,
} from './rule-comparison';

@Component({
  selector: 'app-rule-comparison',
  standalone: true,
  templateUrl: './rule-comparison.component.html',
  styleUrl: './rule-comparison.component.css',
})
export class RuleComparisonComponent {
  readonly sources = input<readonly StoredVettingSource[]>([]);
  readonly rules = input<readonly VettingRule[]>([]);

  readonly navigateToManage = output<void>();
  readonly summaryChange = output<ComparisonSummary>();

  protected readonly compareSourceAId = signal<string | null>(null);
  protected readonly compareSourceBId = signal<string | null>(null);
  protected readonly compareDiffFilter = signal<ComparisonDiffFilter>('all_diffs');
  protected readonly compareModuleFilter = signal('all');
  protected readonly compareQuery = signal('');

  protected readonly compareSourceA = computed(
    () => this.sources().find((source) => source.id === this.compareSourceAId()) ?? null,
  );
  protected readonly compareSourceB = computed(
    () => this.sources().find((source) => source.id === this.compareSourceBId()) ?? null,
  );

  protected getRulesForSource(sourceId: string | null): readonly VettingRule[] {
    if (!sourceId) {
      return [];
    }
    return this.rules().filter((rule) => rule.sourceId === sourceId);
  }

  protected readonly rulesSourceA = computed(() => this.getRulesForSource(this.compareSourceAId()));
  protected readonly rulesSourceB = computed(() => this.getRulesForSource(this.compareSourceBId()));

  protected readonly comparisonResult = computed(() =>
    compareVettingRules(this.rulesSourceA(), this.rulesSourceB()),
  );

  protected readonly comparisonSummary = computed(() => this.comparisonResult().summary);
  protected readonly allComparisonItems = computed(() => this.comparisonResult().items);

  protected readonly comparisonModules = computed(() => {
    const items = this.allComparisonItems();
    const map = new Map<string, string>();
    for (const item of items) {
      if (!map.has(item.moduleId)) {
        map.set(item.moduleId, item.moduleLabel);
      }
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr-FR'));
  });

  protected readonly filteredComparisonItems = computed(() =>
    filterComparisonItems(this.allComparisonItems(), {
      diffFilter: this.compareDiffFilter(),
      moduleId: this.compareModuleFilter(),
      query: this.compareQuery(),
    }),
  );

  constructor() {
    effect(() => {
      const sources = this.sources();
      if (sources.length >= 2) {
        const currentA = this.compareSourceAId();
        const currentB = this.compareSourceBId();
        const validA = sources.some((s) => s.id === currentA);
        const validB = sources.some((s) => s.id === currentB);

        if (!validA) {
          this.compareSourceAId.set(sources[0].id);
        }
        if (!validB || (validA && currentB === currentA)) {
          const alternate = sources.find((s) => s.id !== (validA ? currentA : sources[0].id));
          this.compareSourceBId.set(alternate ? alternate.id : sources[1].id);
        }
      } else if (sources.length === 1) {
        this.compareSourceAId.set(sources[0].id);
        this.compareSourceBId.set(null);
      } else {
        this.compareSourceAId.set(null);
        this.compareSourceBId.set(null);
      }
    });

    effect(() => {
      this.summaryChange.emit(this.comparisonSummary());
    });
  }

  protected onCompareSourceAChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.compareSourceAId.set(target.value);
  }

  protected onCompareSourceBChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.compareSourceBId.set(target.value);
  }

  protected onCompareDiffFilterChange(filter: ComparisonDiffFilter): void {
    this.compareDiffFilter.set(filter);
  }

  protected onCompareModuleFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.compareModuleFilter.set(target.value);
  }

  protected onCompareSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.compareQuery.set(target.value);
  }

  protected clearCompareFilters(): void {
    this.compareDiffFilter.set('all_diffs');
    this.compareModuleFilter.set('all');
    this.compareQuery.set('');
  }

  protected sourceOptionLabel(source: StoredVettingSource): string {
    const parts = [source.fileName];
    if (source.adherent || source.offer) {
      parts.push(`(${[source.adherent, source.offer].filter(Boolean).join(' · ')})`);
    }
    return parts.join(' ');
  }

  protected formatCount(value: number): string {
    return formatCount(value);
  }

  protected getBehaviorClass(value: string): string {
    return getBehaviorClass(value);
  }
}
