import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, OnInit, PendingTasks, signal } from '@angular/core';
import { VettingCatalogService, VettingCatalogWorkspace } from './vetting-catalog.service';
import { RuleFamily, VettingOperation, VettingRule } from './vetting-catalog';
import { StoredVettingSource } from './vetting-catalog-storage';
import { createRuleGroups, GroupLevel, RuleGroup } from './rule-grouping';

type WorkspaceView = 'catalog' | 'manage';

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
  imports: [NgTemplateOutlet],
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
  protected readonly managementError = signal('');
  protected readonly managementMessage = signal('');
  protected readonly workspaceView = signal<WorkspaceView>('catalog');
  protected readonly query = signal('');
  protected readonly selectedOperationId = signal<string | null>(null);
  protected readonly selectedFamilyId = signal<string | null>(null);
  protected readonly operationFilter = signal('all');
  protected readonly familyFilter = signal('all');
  protected readonly activeFilter = signal<'all' | 'active' | 'inactive'>('all');
  protected readonly profileFilter = signal('all');
  protected readonly behaviorFilter = signal('all');
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
  protected readonly familyOptions = computed(() =>
    this.operations().flatMap((operation) =>
      operation.families.map((family) => {
        const familyLabel = family.hasDeclaredId ? family.id : `(${operation.label})`;
        const operationLabel = this.operationDisplayLabel(operation);
        return {
          key: family.key ?? `${operation.key ?? operation.id}::${family.id}`,
          label:
            operationLabel === operation.label
              ? familyLabel
              : `${familyLabel} · ${operationLabel}`,
        };
      }),
    ),
  );
  protected readonly selectedOperation = computed(
    () =>
      this.operations().find(
        (operation) => (operation.key ?? operation.id) === this.selectedOperationId(),
      ) ?? null,
  );
  protected readonly operationDisplayLabel = (operation: VettingOperation): string => {
    const occurrences = this.operations().filter((item) => item.id === operation.id);
    return occurrences.length > 1
      ? `${operation.label} · ${operation.sourceName}`
      : operation.label;
  };
  protected readonly selectedFamily = computed(
    () =>
      this.selectedOperation()?.families.find(
        (family) => (family.key ?? family.id) === this.selectedFamilyId(),
      ) ?? null,
  );
  protected readonly displayedRules = computed(() => {
    const catalog = this.catalog();
    if (!catalog) {
      return [];
    }

    const query = this.normalize(this.query().trim());
    return catalog.rules.filter((rule) => {
      if (
        this.operationFilter() !== 'all' &&
        rule.operationKey !== this.operationFilter() &&
        rule.moduleId !== this.operationFilter()
      ) {
        return false;
      }
      if (
        this.familyFilter() !== 'all' &&
        (rule.familyKey ?? `${rule.moduleId}::${rule.familyId}`) !== this.familyFilter()
      ) {
        return false;
      }

      if (!query) {
        if (
          this.selectedOperationId() &&
          (rule.operationKey ?? rule.moduleId) !== this.selectedOperationId()
        ) {
          return false;
        }
        if (
          this.selectedFamilyId() &&
          (rule.familyKey ?? rule.familyId) !== this.selectedFamilyId()
        ) {
          return false;
        }
      } else {
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

      if (this.activeFilter() === 'active' && !rule.active) {
        return false;
      }
      if (this.activeFilter() === 'inactive' && rule.active) {
        return false;
      }

      const profile = this.profileFilter();
      if (profile !== 'all' && !(profile in rule.profiles)) {
        return false;
      }
      const behavior = this.behaviorFilter();
      return behavior === 'all' || rule.profiles[profile] === behavior;
    });
  });
  protected readonly heading = computed(() => {
    if (this.query().trim()) {
      return 'Résultats de recherche';
    }
    const operation = this.selectedOperation();
    return operation ? this.operationDisplayLabel(operation) : 'Toutes les règles';
  });

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

  protected selectOperation(operation: VettingOperation): void {
    this.selectedOperationId.set(operation.key ?? operation.id);
    this.selectedFamilyId.set(null);
  }

  protected selectAllOperations(): void {
    this.selectedOperationId.set(null);
    this.selectedFamilyId.set(null);
  }

  protected selectFamily(operation: VettingOperation, family: RuleFamily): void {
    this.selectedOperationId.set(operation.key ?? operation.id);
    this.selectedFamilyId.set(
      family.key ?? `${operation.key ?? operation.id}::${family.id}`,
    );
  }

  protected onSearchInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected onActiveFilterChange(event: Event): void {
    this.activeFilter.set(
      (event.target as HTMLSelectElement).value as 'all' | 'active' | 'inactive',
    );
  }

  protected onProfileFilterChange(event: Event): void {
    this.profileFilter.set((event.target as HTMLSelectElement).value);
    this.behaviorFilter.set('all');
  }

  protected onOperationFilterChange(event: Event): void {
    this.operationFilter.set((event.target as HTMLSelectElement).value);
    this.familyFilter.set('all');
  }

  protected onFamilyFilterChange(event: Event): void {
    this.familyFilter.set((event.target as HTMLSelectElement).value);
  }

  protected onBehaviorFilterChange(event: Event): void {
    this.behaviorFilter.set((event.target as HTMLSelectElement).value);
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

  protected async onXmlFilesChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.managementError.set('');
    this.managementMessage.set('');
    const imported: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const duplicate = this.sources().find(
          (source) =>
            source.fileName.toLocaleLowerCase('fr-FR') === file.name.toLocaleLowerCase('fr-FR'),
        );
        let replaceSourceId: string | undefined;
        if (duplicate) {
          const shouldReplace = window.confirm(
            `Un jeu de règles nommé « ${file.name} » existe déjà. Voulez-vous le remplacer ?`,
          );
          if (!shouldReplace) {
            continue;
          }
          replaceSourceId = duplicate.id;
        }
        await this.catalogService.importXmlFile(file, replaceSourceId);
        imported.push(file.name);
      } catch (error: unknown) {
        errors.push(`${file.name} : ${this.describeError(error)}`);
      }
    }

    if (imported.length > 0) {
      this.managementMessage.set(
        `${imported.length} fichier${imported.length > 1 ? 's' : ''} XML importé${imported.length > 1 ? 's' : ''}.`,
      );
      await this.refreshWorkspace();
    }
    this.managementError.set(errors.join('\n'));
  }

  protected async onSourceMetadataChange(
    source: StoredVettingSource,
    field: 'adherent' | 'offer',
    event: Event,
  ): Promise<void> {
    const value = (event.target as HTMLInputElement).value;
    const adherent = field === 'adherent' ? value : source.adherent;
    const offer = field === 'offer' ? value : source.offer;
    try {
      await this.catalogService.updateSourceMetadata(source.id, adherent, offer);
      await this.refreshWorkspace();
    } catch (error: unknown) {
      this.managementError.set(this.describeError(error));
    }
  }

  protected async onPropertiesFileChange(
    source: StoredVettingSource,
    event: Event,
  ): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.managementError.set('');
    this.managementMessage.set('');
    try {
      await this.catalogService.attachPropertiesFile(source.id, file);
      this.managementMessage.set(`Libellés associés à « ${source.fileName} ».`);
      await this.refreshWorkspace();
    } catch (error: unknown) {
      this.managementError.set(`${file.name} : ${this.describeError(error)}`);
    }
  }

  protected async removeSource(source: StoredVettingSource): Promise<void> {
    if (!window.confirm(`Supprimer « ${source.fileName} » du stockage local de ce navigateur ?`)) {
      return;
    }
    this.managementError.set('');
    this.managementMessage.set('');
    try {
      await this.catalogService.removeSource(source.id);
      this.managementMessage.set(`« ${source.fileName} » a été supprimé du stockage local.`);
      await this.refreshWorkspace();
    } catch (error: unknown) {
      this.managementError.set(this.describeError(error));
    }
  }

  protected async updateBundledSource(): Promise<void> {
    this.managementError.set('');
    this.managementMessage.set('');
    try {
      await this.catalogService.updateBundledSource();
      this.managementMessage.set('Le jeu de règles intégré a été mis à jour.');
      await this.refreshWorkspace();
    } catch (error: unknown) {
      this.managementError.set(this.describeError(error));
    }
  }

  protected sourceRuleCount(sourceId: string): number {
    return this.catalog()?.rules.filter((rule) => rule.sourceId === sourceId).length ?? 0;
  }

  protected clearFilters(): void {
    this.query.set('');
    this.operationFilter.set('all');
    this.familyFilter.set('all');
    this.activeFilter.set('all');
    this.profileFilter.set('all');
    this.behaviorFilter.set('all');
    this.selectAllOperations();
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
      const operationKeys = new Set(
        workspace.catalog.operations.map((operation) => operation.key ?? operation.id),
      );
      const selectedOperationId = this.selectedOperationId();
      if (selectedOperationId && !operationKeys.has(selectedOperationId)) {
        this.selectAllOperations();
      }
      const familyKeys = new Set(
        workspace.catalog.operations.flatMap((operation) =>
          operation.families.map(
            (family) => family.key ?? `${operation.key ?? operation.id}::${family.id}`,
          ),
        ),
      );
      const selectedFamilyId = this.selectedFamilyId();
      if (selectedFamilyId && !familyKeys.has(selectedFamilyId)) {
        this.selectedFamilyId.set(null);
      }
      if (
        this.operationFilter() !== 'all' &&
        !operationKeys.has(this.operationFilter()) &&
        !workspace.catalog.rules.some((rule) => rule.moduleId === this.operationFilter())
      ) {
        this.operationFilter.set('all');
      }
      if (
        this.familyFilter() !== 'all' &&
        !familyKeys.has(this.familyFilter()) &&
        !workspace.catalog.rules.some((rule) => rule.familyId === this.familyFilter())
      ) {
        this.familyFilter.set('all');
      }
      if (
        this.profileFilter() !== 'all' &&
        !workspace.catalog.profiles.includes(this.profileFilter())
      ) {
        this.profileFilter.set('all');
        this.behaviorFilter.set('all');
      }
      if (
        this.behaviorFilter() !== 'all' &&
        !workspace.catalog.behaviors.includes(this.behaviorFilter())
      ) {
        this.behaviorFilter.set('all');
      }
      this.loadingState.set('ready');
      this.errorMessage.set('');
    } catch (error: unknown) {
      const message = this.describeError(error);
      if (initial) {
        this.errorMessage.set(message);
        this.loadingState.set('error');
      } else {
        this.managementError.set(message);
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
