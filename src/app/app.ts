import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, HostListener, computed, effect, inject, OnInit, PendingTasks, signal } from '@angular/core';
import { VettingCatalogService, VettingCatalogWorkspace } from './vetting-catalog.service';
import { RuleFamily, VettingOperation, VettingRule } from './vetting-catalog';
import { StoredVettingSource } from './vetting-catalog-storage';
import { createRuleGroups, GroupLevel, RuleGroup } from './rule-grouping';
import { RuleComparisonComponent } from './rule-comparison.component';
import { SourceManagementComponent } from './source-management.component';
import { TreeSelectComponent } from './tree-select.component';
import { TreeNode } from './tree-select.model';
import {
  compareVettingRules,
  ComparisonSummary,
} from './rule-comparison';

type WorkspaceView = 'catalog' | 'manage' | 'compare';

interface GroupOption {
  readonly id: GroupLevel;
  readonly label: string;
}

export interface RuleProfileEntry {
  readonly name: string;
  readonly behavior: string;
  readonly badgeClass: string;
}

const groupOptions: readonly GroupOption[] = [
  { id: 'file', label: 'Fichier' },
  { id: 'adherent', label: 'Adhérent' },
  { id: 'offer', label: 'Offre' },
  { id: 'module', label: 'Module' },
  { id: 'ruleSet', label: 'Rule-set' },
];

@Component({
  selector: 'app-root',
  imports: [NgTemplateOutlet, RuleComparisonComponent, SourceManagementComponent, TreeSelectComponent],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly catalogService = inject(VettingCatalogService);
  private readonly pendingTasks = inject(PendingTasks);

  protected readonly loadingState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly workspace = signal<VettingCatalogWorkspace | null>(null);
  protected readonly catalog = computed(() => this.workspace()?.catalog ?? null);
  protected readonly errorMessage = signal('');
  protected readonly workspaceView = signal<WorkspaceView>('catalog');
  protected readonly query = signal('');
  protected readonly selectedRuleSetKeys = signal<ReadonlySet<string>>(new Set<string>());
  protected readonly severityFilter = signal<'all' | string>('all');
  protected readonly activeFilter = signal<'all' | 'active' | 'inactive'>('all');
  protected readonly profileFilter = signal('all');
  protected readonly groupingLevels = signal<GroupLevel[]>(['file', 'module', 'ruleSet']);
  protected readonly expandedGroupDepth = signal(1);
  protected readonly expandedGroupOverrides = signal<ReadonlyMap<string, boolean>>(new Map());
  protected readonly expandingLevel = signal<number | null>(null);
  protected readonly isExpanding = computed(() => this.expandingLevel() !== null);
  protected readonly groupingUpdating = signal(false);
  protected readonly groupingError = signal('');
  protected readonly groupedResults = signal<RuleGroup[]>([]);
  private groupingRequestId = 0;
  protected readonly availableGroupingLevels = computed(() =>
    groupOptions.filter((option) => !this.groupingLevels().includes(option.id)),
  );
  protected readonly newGroupingLevel = signal<GroupLevel>('adherent');
  protected readonly operations = computed(() => this.catalog()?.operations ?? []);
  protected readonly sources = computed(() => this.workspace()?.sources ?? []);
  protected readonly bundledUpdateAvailable = computed(
    () => this.workspace()?.bundledUpdateAvailable ?? false,
  );

  protected readonly comparisonSummary = computed(() => {
    const sources = this.sources();
    if (sources.length < 2) {
      return null;
    }
    const rules = this.catalog()?.rules ?? [];
    const rulesA = rules.filter((rule) => rule.sourceId === sources[0].id);
    const rulesB = rules.filter((rule) => rule.sourceId === sources[1].id);
    return compareVettingRules(rulesA, rulesB).summary;
  });
  protected readonly treeNodes = computed<TreeNode[]>(() => {
    const sources = this.sources();
    const operations = this.operations();

    return sources.map((source) => {
      const sourceOps = operations.filter(
        (op) => op.sourceId === source.id || (!op.sourceId && source.origin === 'bundled'),
      );
      const sourceRuleCount = sourceOps.reduce((sum, op) => sum + op.ruleCount, 0);

      const opNodes: TreeNode[] = sourceOps.map((op) => {
        const familyNodes: TreeNode[] = op.families.map((fam) => ({
          id: fam.key ?? `${op.key ?? op.id}::${fam.id}`,
          label: fam.label,
          depth: 2,
          ruleCount: fam.rules.length,
        }));

        return {
          id: op.key ?? `${source.id}::${op.id}`,
          label: op.label,
          depth: 1,
          ruleCount: op.ruleCount,
          children: familyNodes,
        };
      });

      return {
        id: source.id,
        label: `${source.fileName}${source.adherent ? ` (${source.adherent})` : ''}`,
        depth: 0,
        ruleCount: sourceRuleCount,
        children: opNodes,
      };
    });
  });

  protected readonly displayedRules = computed(() => {
    const catalog = this.catalog();
    if (!catalog) {
      return [];
    }

    const query = this.normalize(this.query().trim());
    const selectedKeys = this.selectedRuleSetKeys();
    const active = this.activeFilter();
    const profile = this.profileFilter();
    const severity = this.severityFilter();

    return catalog.rules.filter((rule) => {
      // 1. Filtrage arborescent (Fichier -> Module -> Rule-set)
      if (selectedKeys.size > 0) {
        const familyKey = rule.familyKey ?? `${rule.operationKey ?? rule.moduleId}::${rule.familyId}`;
        if (!selectedKeys.has(familyKey)) {
          return false;
        }
      }

      // 2. Filtrage textuel global
      if (query) {
        const searchable = this.normalize(
          [
            rule.id,
            rule.label,
            rule.description ?? '',
            ...rule.messageVariants.map((variant) => variant.message),
            ...rule.messageVariants.map((variant) => variant.context),
            ...Object.entries(rule.profiles).flat(),
            rule.moduleLabel,
            rule.moduleId,
            rule.familyId,
            rule.familyLabel,
            rule.packageName,
            rule.sourceName ?? '',
            rule.adherent ?? '',
            rule.offer ?? '',
          ].join(' '),
        );
        if (!searchable.includes(query)) {
          return false;
        }
      }

      // 3. Filtrage par état actif
      if (active === 'active' && !rule.active) {
        return false;
      }
      if (active === 'inactive' && rule.active) {
        return false;
      }

      // 4. Filtrage par sévérité globale et profil
      if (severity !== 'all') {
        if (profile !== 'all') {
          // Profil spécifique + sévérité
          if (rule.profiles[profile] !== severity) {
            return false;
          }
        } else {
          // Sévérité globale décorrélée du profil (au moins un profil correspond)
          const behaviors = Object.values(rule.profiles);
          if (!behaviors.includes(severity)) {
            return false;
          }
        }
      } else if (profile !== 'all') {
        // Profil seul sans sévérité imposée
        if (!(profile in rule.profiles)) {
          return false;
        }
      }

      return true;
    });
  });

  protected readonly heading = computed(() => {
    if (this.query().trim()) {
      return 'Résultats de recherche';
    }
    return 'Toutes les règles';
  });

  private readonly elementRef = inject(ElementRef);

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    if (
      (event.key === '/' || (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey))) &&
      !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
    ) {
      event.preventDefault();
      const input = this.elementRef.nativeElement.querySelector('.hero-search-input') as HTMLInputElement | null;
      input?.focus();
    }
  }

  ngOnInit(): void {
    void this.refreshWorkspace(true);
  }

  constructor() {
    effect((onCleanup) => {
      const rules = this.displayedRules();
      const levels = this.groupingLevels();
      const requestId = ++this.groupingRequestId;

      this.groupingUpdating.set(true);
      this.groupingError.set('');

      const removePendingTask = this.pendingTasks.add();
      let pending = true;
      const finishPendingTask = (): void => {
        if (pending) {
          pending = false;
          removePendingTask();
        }
      };
      const timer = setTimeout(() => {
        try {
          if (requestId === this.groupingRequestId) {
            this.groupedResults.set(createRuleGroups(rules, levels));
            this.expandedGroupOverrides.set(new Map());
            this.groupingUpdating.set(false);
          }
        } catch (error) {
          if (requestId === this.groupingRequestId) {
            this.groupingError.set(
              error instanceof Error
                ? `Le regroupement n’a pas pu être actualisé : ${error.message}`
                : 'Le regroupement n’a pas pu être actualisé.',
            );
            this.groupingUpdating.set(false);
          }
        } finally {
          finishPendingTask();
        }
      }, 0);

      onCleanup(() => {
        clearTimeout(timer);
        finishPendingTask();
      });
    });
  }

  protected onTreeSelectionChange(keys: ReadonlySet<string>): void {
    this.selectedRuleSetKeys.set(keys);
  }

  protected onSeverityFilterChange(event: Event): void {
    this.severityFilter.set((event.target as HTMLSelectElement).value);
  }

  protected onSearchInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected onActiveFilterChange(value: 'all' | 'active' | 'inactive'): void {
    this.activeFilter.set(value);
  }

  protected onProfileFilterChange(event: Event): void {
    this.profileFilter.set((event.target as HTMLSelectElement).value);
  }

  protected onGroupingLevelChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as GroupLevel;
    this.newGroupingLevel.set(value);
  }

  protected addGroupingLevel(): void {
    const nextLevel = this.newGroupingLevel();
    if (this.groupingLevels().includes(nextLevel)) {
      return;
    }
    this.groupingLevels.update((levels) => [...levels, nextLevel]);
    this.syncGroupingSelection();
  }

  protected removeGroupingLevel(index: number): void {
    if (this.isExpanding()) {
      return;
    }
    this.groupingLevels.update((levels) => levels.filter((_, itemIndex) => itemIndex !== index));
    this.syncGroupingSelection();
  }

  protected moveGroupingLevel(index: number, direction: -1 | 1): void {
    if (this.isExpanding()) {
      return;
    }
    const target = index + direction;
    const levels = [...this.groupingLevels()];
    if (target < 0 || target >= levels.length) {
      return;
    }
    [levels[index], levels[target]] = [levels[target], levels[index]];
    this.groupingLevels.set(levels);
    this.syncGroupingSelection();
  }

  protected groupingLabel(level: GroupLevel): string {
    return groupOptions.find((option) => option.id === level)?.label ?? level;
  }

  protected toggleGroupExpansion(index: number): void {
    if (this.isExpanding()) {
      return;
    }
    const targetDepth = index + 1;
    this.expandingLevel.set(index);

    const removeTask = this.pendingTasks.add();
    setTimeout(() => {
      try {
        this.expandedGroupDepth.update((depth) =>
          depth >= targetDepth ? targetDepth - 1 : targetDepth,
        );
        this.expandedGroupOverrides.set(new Map());
      } finally {
        this.expandingLevel.set(null);
        removeTask();
      }
    }, 0);
  }

  protected isGroupExpanded(groupKey: string, depth: number): boolean {
    return this.expandedGroupOverrides().get(groupKey) ?? depth < this.expandedGroupDepth();
  }

  protected onGroupToggle(groupKey: string, event: Event): void {
    const isOpen = (event.currentTarget as HTMLDetailsElement).open;
    this.expandedGroupOverrides.update((overrides) => {
      const next = new Map(overrides);
      next.set(groupKey, isOpen);
      return next;
    });
  }

  protected onWorkspaceUpdated(): void {
    void this.refreshWorkspace();
  }

  protected clearFilters(): void {
    this.query.set('');
    this.selectedRuleSetKeys.set(new Set<string>());
    this.activeFilter.set('all');
    this.profileFilter.set('all');
    this.severityFilter.set('all');
  }

  protected clearTreeSelection(): void {
    this.selectedRuleSetKeys.set(new Set<string>());
  }

  protected removeTreeSelectionKey(key: string): void {
    const next = new Set(this.selectedRuleSetKeys());
    next.delete(key);
    this.selectedRuleSetKeys.set(next);
  }

  private static readonly numberFormatter = new Intl.NumberFormat('fr-FR');
  private static readonly profileCache = new WeakMap<
    Readonly<Record<string, string>>,
    readonly RuleProfileEntry[]
  >();

  protected formatCount(value: number): string {
    return App.numberFormatter.format(value);
  }

  protected ruleProfiles(profiles: Readonly<Record<string, string>>): readonly RuleProfileEntry[] {
    let cached = App.profileCache.get(profiles);
    if (!cached) {
      cached = Object.entries(profiles).map(([name, behavior]) => ({
        name,
        behavior,
        badgeClass: this.getBehaviorClass(behavior),
      }));
      App.profileCache.set(profiles, cached);
    }
    return cached;
  }

  protected profileEntries(profiles: Readonly<Record<string, string>>): [string, string][] {
    return this.ruleProfiles(profiles).map((p) => [p.name, p.behavior]);
  }

  protected profileCount(profiles: Readonly<Record<string, string>>): number {
    return this.ruleProfiles(profiles).length;
  }

  protected getBehaviorClass(value: string): string {
    switch (value) {
      case 'ERROR':
        return 'behavior-error';
      case 'WARNING':
      case 'WARNING_ACCEPTED':
        return 'behavior-warning';
      case 'IGNORE':
        return 'behavior-muted';
      default:
        return 'behavior-default';
    }
  }

  private syncGroupingSelection(): void {
    const next = this.availableGroupingLevels()[0];
    if (next) {
      this.newGroupingLevel.set(next.id);
    }
  }

  private async refreshWorkspace(initial = false): Promise<void> {
    try {
      const workspace = await this.catalogService.load();
      this.workspace.set(workspace);
      if (
        this.profileFilter() !== 'all' &&
        !workspace.catalog.profiles.includes(this.profileFilter())
      ) {
        this.profileFilter.set('all');
      }
      this.loadingState.set('ready');
      this.errorMessage.set('');
    } catch (error: unknown) {
      const message = this.describeError(error);
      if (initial) {
        this.errorMessage.set(message);
        this.loadingState.set('error');
      } else {
        this.errorMessage.set(message);
      }
    }
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('fr-FR');
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return `Chargement impossible (HTTP ${error.status}). Vérifiez les ressources du catalogue.`;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Une erreur inconnue empêche le chargement du catalogue.';
  }
}
