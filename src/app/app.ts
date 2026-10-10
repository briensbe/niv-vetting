import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { VettingCatalogService } from './vetting-catalog.service';
import { VettingCatalog, VettingOperation } from './vetting-catalog';

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly catalogService = inject(VettingCatalogService);
  protected readonly loadingState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly catalog = signal<VettingCatalog | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly query = signal('');
  protected readonly selectedOperationId = signal<string | null>(null);
  protected readonly selectedFamilyId = signal<string | null>(null);
  protected readonly operationFilter = signal('all');
  protected readonly familyFilter = signal('all');
  protected readonly activeFilter = signal<'all' | 'active' | 'inactive'>('all');
  protected readonly profileFilter = signal('all');
  protected readonly behaviorFilter = signal('all');

  protected readonly operations = computed(() => this.catalog()?.operations ?? []);
  protected readonly familyOptions = computed(() =>
    this.operations().flatMap((operation) =>
      operation.families.map((family) => ({
        key: `${operation.id}::${family.id}`,
        label: family.hasDeclaredId ? family.id : `(${operation.label})`,
      })),
    ),
  );
  protected readonly selectedOperation = computed(
    () =>
      this.operations().find((operation) => operation.id === this.selectedOperationId()) ?? null,
  );
  protected readonly displayedRules = computed(() => {
    const catalog = this.catalog();
    if (!catalog) {
      return [];
    }

    const query = this.normalize(this.query().trim());
    return catalog.rules.filter((rule) => {
      if (this.operationFilter() !== 'all' && rule.moduleId !== this.operationFilter()) {
        return false;
      }
      if (
        this.familyFilter() !== 'all' &&
        `${rule.moduleId}::${rule.familyId}` !== this.familyFilter()
      ) {
        return false;
      }
      if (!query) {
        if (this.selectedOperationId() && rule.moduleId !== this.selectedOperationId()) {
          return false;
        }
        if (this.selectedFamilyId() && rule.familyId !== this.selectedFamilyId()) {
          return false;
        }
      } else {
        const searchable = this.normalize(
          `${rule.id} ${rule.label} ${rule.description ?? ''} ${rule.messageVariants.map((variant) => variant.message).join(' ')} ${rule.moduleLabel} ${rule.moduleId} ${rule.familyId} ${rule.familyLabel}`,
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
    const query = this.query().trim();
    if (query) {
      return 'Résultats de recherche';
    }
    return this.selectedOperation()?.label ?? 'Toutes les opérations';
  });

  ngOnInit(): void {
    this.catalogService.load().subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        this.loadingState.set('ready');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.describeError(error));
        this.loadingState.set('error');
      },
    });
  }

  protected selectOperation(operation: VettingOperation): void {
    this.selectedOperationId.set(operation.id);
    this.selectedFamilyId.set(null);
  }

  protected selectAllOperations(): void {
    this.selectedOperationId.set(null);
    this.selectedFamilyId.set(null);
  }

  protected selectFamily(operation: VettingOperation, familyId: string): void {
    this.selectedOperationId.set(operation.id);
    this.selectedFamilyId.set(familyId);
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
