import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  VettingCatalogService,
  VettingCatalogWorkspace,
} from './vetting-catalog.service';
import {
  RuleFamily,
  VettingOperation,
  VettingRule,
} from './vetting-catalog';
import { StoredVettingSource } from './vetting-catalog-storage';

type GroupLevel = 'file' | 'adherent' | 'offer' | 'module' | 'ruleSet';
type WorkspaceView = 'catalog' | 'manage';

interface GroupOption {
  readonly id: GroupLevel;
  readonly label: string;
}

interface RuleGroup {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly children: readonly RuleGroup[];
  readonly rules: readonly VettingRule[];
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
  protected readonly groupingLevels = signal<GroupLevel[]>(['module', 'ruleSet']);
  protected readonly availableGroupingLevels = computed(() =>
    groupOptions.filter((option) => !this.groupingLevels().includes(option.id)),
  );
  protected readonly newGroupingLevel = signal<GroupLevel>('file');
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
  protected readonly groupedResults = computed(() =>
    this.createGroups(this.displayedRules(), this.groupingLevels()),
  );
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
    this.groupingLevels.update((levels) => levels.filter((_, itemIndex) => itemIndex !== index));
    this.syncGroupingSelection();
  }

  protected moveGroupingLevel(index: number, direction: -1 | 1): void {
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

  protected formatCount(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  protected profileEntries(profiles: Readonly<Record<string, string>>): [string, string][] {
    return Object.entries(profiles);
  }

  protected profileCount(profiles: Readonly<Record<string, string>>): number {
    return Object.keys(profiles).length;
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

  private createGroups(rules: readonly VettingRule[], levels: readonly GroupLevel[]): RuleGroup[] {
    const groupAtLevel = (
      members: readonly VettingRule[],
      depth: number,
      parentKey: string,
    ): RuleGroup[] => {
      const level = levels[depth];
      const groups = new Map<string, { label: string; rules: VettingRule[] }>();
      for (const rule of members) {
        const value = this.groupValue(rule, level);
        const key = value.key;
        const existing = groups.get(key);
        if (existing) {
          existing.rules.push(rule);
        } else {
          groups.set(key, { label: value.label, rules: [rule] });
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

  private groupValue(rule: VettingRule, level: GroupLevel): { key: string; label: string } {
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
