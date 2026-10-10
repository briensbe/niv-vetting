import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';
import { VettingCatalogService, VettingCatalogWorkspace } from './vetting-catalog.service';
import { VettingCatalog } from './vetting-catalog';

const sampleRule = {
  key: 'PAYMENT::common::R1::0',
  moduleId: 'PAYMENT',
  moduleLabel: 'Paiements',
  operationKey: 'seed::PAYMENT',
  familyId: 'common',
  familyLabel: 'common',
  familyKey: 'seed::PAYMENT::common',
  packageName: 'example.rules.Common',
  id: 'R1',
  label: 'Règle de démonstration',
  description: 'Bloque une opération particulière.',
  messageVariants: [
    { context: 'Libellé par défaut', message: 'Message affiché au client.' },
    { context: 'USER', message: 'Déclinaison pour les utilisateurs.' },
  ],
  active: true,
  profiles: { USER: 'ERROR', ROOT: 'IGNORE' },
  sourceId: 'seed',
  sourceName: 'crca_initial_vetting_rules.xml',
  adherent: 'crca',
  offer: 'initial',
};

const secondRule = {
  key: 'TRANSFER::wire::R2::0',
  moduleId: 'TRANSFER',
  moduleLabel: 'Virements',
  operationKey: 'lcl::TRANSFER',
  familyId: 'wire',
  familyLabel: 'wire',
  familyKey: 'lcl::TRANSFER::wire',
  packageName: 'example.rules.Transfer',
  id: 'R2',
  label: 'Seuil de virement',
  description: 'Vérifie un montant.',
  messageVariants: [],
  active: false,
  profiles: { USER: 'WARNING', ROOT: 'IGNORE' },
  sourceId: 'lcl',
  sourceName: 'lcl_expert_vetting_rules.xml',
  adherent: 'lcl',
  offer: 'expert',
};

const catalog: VettingCatalog = {
  operations: [
    {
      id: 'PAYMENT',
      key: 'seed::PAYMENT',
      label: 'Paiements',
      ruleCount: 1,
      families: [
        {
          id: 'common',
          key: 'seed::PAYMENT::common',
          hasDeclaredId: true,
          label: 'common',
          packageName: 'example.rules.Common',
          rules: [sampleRule],
        },
        {
          id: 'package-family-1',
          key: 'seed::PAYMENT::package-family-1',
          hasDeclaredId: false,
          label: 'derived / from package',
          packageName: 'example.rules.Derived',
          rules: [],
        },
      ],
    },
    {
      id: 'TRANSFER',
      key: 'lcl::TRANSFER',
      label: 'Virements',
      ruleCount: 1,
      families: [
        {
          id: 'wire',
          key: 'lcl::TRANSFER::wire',
          hasDeclaredId: true,
          label: 'wire',
          packageName: 'example.rules.Transfer',
          rules: [secondRule],
        },
      ],
    },
  ],
  rules: [sampleRule, secondRule],
  profiles: ['ROOT', 'USER'],
  behaviors: ['ERROR', 'IGNORE', 'WARNING'],
};

const workspace: VettingCatalogWorkspace = {
  catalog,
  sources: [
    {
      id: 'seed',
      fileName: 'crca_initial_vetting_rules.xml',
      adherent: 'crca',
      offer: 'initial',
      origin: 'bundled',
      xmlText: '',
      propertiesText: '',
      propertiesFileName: 'Vetting_fr_FR.properties',
    },
    {
      id: 'lcl',
      fileName: 'lcl_expert_vetting_rules.xml',
      adherent: 'lcl',
      offer: 'expert',
      origin: 'imported',
      xmlText: '',
      propertiesText: '',
      propertiesFileName: null,
    },
  ],
  bundledUpdateAvailable: false,
};

const catalogService = {
  load: vi.fn(async () => workspace),
  importXmlFile: vi.fn(async () => undefined),
  updateSourceMetadata: vi.fn(async () => undefined),
  attachPropertiesFile: vi.fn(async () => undefined),
  removeSource: vi.fn(async () => undefined),
  updateBundledSource: vi.fn(async () => undefined),
};

function expandAllRules(fixture: ComponentFixture<App>): void {
  const expandButton = fixture.nativeElement.querySelector(
    '[aria-label^="Déplier les groupes jusqu’au niveau 2"]',
  ) as HTMLButtonElement | null;
  expandButton?.click();
  fixture.detectChanges();
}

describe('App', () => {
  beforeEach(async () => {
    catalogService.load.mockResolvedValue(workspace);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: VettingCatalogService,
          useValue: catalogService,
        },
      ],
    }).compileComponents();
  });

  it('loads and displays translated rule information', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expandAllRules(fixture);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Règles de vetting');
    expect(compiled.querySelector('.rule-card .rule-id')?.textContent).toContain('R1');
    expect(compiled.querySelector('.rule-card .rule-ruleset')?.textContent).toContain('common');
    expect(compiled.textContent).toContain('Bloque une opération particulière.');
    expect(compiled.textContent).toContain('Paiements');
    expect(compiled.textContent).toContain('ERROR');
    expect(compiled.querySelector('.detail-panel')).toBeNull();
    expect(compiled.querySelector('.rule-card .active-state')?.textContent).toContain('Active');
    expect(
      compiled.querySelector('.rule-card .rule-disclosure .secondary-content .rule-context')
        ?.textContent,
    ).toContain('common');
    const firstRuleCard = compiled.querySelector('.rule-card');
    expect(firstRuleCard?.querySelectorAll('.profile-row')).toHaveLength(2);
    expect(firstRuleCard?.querySelectorAll('.behavior-badge svg')).toHaveLength(2);
    expect(compiled.querySelector('.rule-card .rule-profiles .field-label')).toBeNull();
    expect(
      Array.from(firstRuleCard?.querySelectorAll('.behavior-badge') ?? [], (badge) =>
        badge.getAttribute('aria-label'),
      ),
    ).toEqual(['ERROR', 'IGNORE']);
    expect(compiled.querySelector('.behavior-legend')?.textContent).toContain(
      'Avertissement accepté',
    );
    expect(compiled.querySelector('.rule-card .rule-description .field-label')).toBeNull();
  });

  it('expands or collapses all groups through each selected level', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const expandButton = compiled.querySelector(
      'button[aria-label="Déplier les groupes jusqu’au niveau 2 : Rule-set"]',
    ) as HTMLButtonElement;
    expect(expandButton).not.toBeNull();
    expect(expandButton.textContent?.trim()).toBe('+');
    expect(expandButton.title).toContain('Déplier les groupes jusqu’à ce niveau');
    expect(compiled.querySelectorAll('.result-group[open]')).toHaveLength(2);

    expandButton.click();
    fixture.detectChanges();
    expect(compiled.querySelectorAll('.result-group[open]')).toHaveLength(4);

    const collapseButton = compiled.querySelector(
      'button[aria-label="Replier ce niveau et les niveaux suivants, niveau 2 : Rule-set"]',
    ) as HTMLButtonElement;
    expect(collapseButton.textContent?.trim()).toBe('−');
    expect(collapseButton.title).toContain('Replier ce niveau et les niveaux suivants');
    collapseButton.click();
    fixture.detectChanges();
    expect(compiled.querySelectorAll('.result-group[open]')).toHaveLength(2);
  });

  it('keeps property-file message variants in a second-level disclosure', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expandAllRules(fixture);

    const card = fixture.nativeElement.querySelector('.rule-card') as HTMLElement;
    const disclosure = card.querySelector('.rule-disclosure') as HTMLDetailsElement;
    expect(disclosure.parentElement?.classList.contains('rule-card')).toBe(true);
    expect(disclosure.open).toBe(false);
    const summary = disclosure.querySelector('summary') as HTMLElement;
    expect(summary.textContent).toContain('R1');
    expect(summary.querySelector('.rule-description')?.textContent).toContain(
      'Bloque une opération particulière.',
    );
    expect(summary.getAttribute('aria-label')).toContain('R1');
    expect(summary.nextElementSibling?.classList.contains('secondary-content')).toBe(true);
    summary.click();
    expect(disclosure.open).toBe(true);
    expect(disclosure.textContent).toContain('Déclinaisons du message');
    expect(disclosure.textContent).toContain('Déclinaison pour les utilisateurs.');
  });

  it('performs accent-insensitive global searches', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const search = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'regle de demonstration';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expandAllRules(fixture);

    expect(fixture.nativeElement.querySelector('.rule-card .rule-id')?.textContent).toContain('R1');
    expect(fixture.nativeElement.textContent).toContain('Résultats de recherche');
  });

  it('searches across filename and imported adherent/offer metadata', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const search = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'expert';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expandAllRules(fixture);

    expect(fixture.nativeElement.querySelectorAll('.rule-card')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.rule-card .rule-id')?.textContent).toContain('R2');
  });

  it('keeps a global search independent from the navigation selection', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const operationButtons = fixture.nativeElement.querySelectorAll('.operation-link');
    (operationButtons[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    const search = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'R2';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expandAllRules(fixture);

    expect(fixture.nativeElement.querySelector('.rule-card .rule-id')?.textContent).toContain('R2');
    expect(fixture.nativeElement.textContent).toContain('Virements');
    expect(fixture.nativeElement.querySelectorAll('.rule-card')).toHaveLength(1);
  });

  it('combines operation, state, profile and behavior filters', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const select = (label: string, value: string) => {
      const control = fixture.nativeElement.querySelector(
        `[aria-label="${label}"]`,
      ) as HTMLSelectElement;
      control.value = value;
      control.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };

    select('Filtrer par module', 'lcl::TRANSFER');
    select('Filtrer par état actif', 'inactive');
    select('Filtrer par profil', 'USER');
    select('Filtrer par comportement de profil', 'WARNING');
    await fixture.whenStable();
    fixture.detectChanges();
    expandAllRules(fixture);

    expect(fixture.nativeElement.querySelectorAll('.rule-card')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.rule-card .rule-id')?.textContent).toContain('R2');
    expect(fixture.nativeElement.textContent).not.toContain('Bloque une opération particulière.');
  });

  it('labels family filter options with the ruleset id or module name when id is missing', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const familyOptions = Array.from(
      (
        fixture.nativeElement.querySelector(
          '[aria-label="Filtrer par rule-set"]',
        ) as HTMLSelectElement
      ).options,
    ).map((option) => option.textContent?.trim());
    expect(familyOptions).toEqual(['Toutes', 'common', '(Paiements)', 'wire']);
  });

  it('adds and reorders grouping dimensions', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const grouping = fixture.nativeElement.querySelector(
      '[aria-label="Nouveau niveau de regroupement"]',
    ) as HTMLSelectElement;
    grouping.value = 'file';
    grouping.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.grouping-add button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const groupingLabels = fixture.nativeElement.querySelectorAll(
      '.grouping-chip > span:nth-child(2)',
    ) as NodeListOf<HTMLElement>;
    expect(Array.from(groupingLabels, (item) => item.textContent?.trim())).toEqual([
      'Module',
      'Rule-set',
      'Fichier',
    ]);

    (fixture.nativeElement.querySelector('[aria-label="Monter Fichier"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const reorderedGroupingLabels = fixture.nativeElement.querySelectorAll(
      '.grouping-chip > span:nth-child(2)',
    ) as NodeListOf<HTMLElement>;
    expect(Array.from(reorderedGroupingLabels, (item) => item.textContent?.trim())).toEqual([
      'Module',
      'Fichier',
      'Rule-set',
    ]);
    expect(fixture.nativeElement.querySelector('.grouping-update')?.textContent).toContain(
      'Actualisation des regroupements',
    );
    const rootGroupLabels = () =>
      Array.from(fixture.nativeElement.querySelectorAll('.result-group'), (group: Element) => ({
        depth: group.querySelector('.group-depth')?.textContent?.trim(),
        label: group.querySelector('.group-label')?.textContent?.trim(),
      }))
        .filter((group) => group.depth === '1')
        .map((group) => group.label);
    expect(rootGroupLabels()).toContain('Paiements');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.grouping-update')).toBeNull();

    (
      fixture.nativeElement.querySelector('[aria-label="Monter Rule-set"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector('[aria-label="Monter Rule-set"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(rootGroupLabels()).toContain('Paiements');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(rootGroupLabels()).toEqual(['common', 'wire']);
  });

  it('renders rules only after their collapsed group is expanded', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.rule-card')).toHaveLength(0);

    const collapsedGroup = Array.from(fixture.nativeElement.querySelectorAll('.result-group')).find(
      (group) => !(group as HTMLDetailsElement).open,
    ) as HTMLDetailsElement;
    expect(collapsedGroup).toBeDefined();
    collapsedGroup.open = true;
    collapsedGroup.dispatchEvent(new Event('toggle'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(collapsedGroup.open).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.rule-card').length).toBeGreaterThan(0);
  });

  it('keeps the last published tree and reports grouping errors', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.result-group')).not.toHaveLength(0);

    const groupingLevels = (
      fixture.componentInstance as unknown as {
        groupingLevels: { set: (levels: string[]) => void };
      }
    ).groupingLevels;
    groupingLevels.set(['invalid']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.grouping-update')).not.toBeNull();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Niveau de regroupement inconnu',
    );
    expect(fixture.nativeElement.querySelectorAll('.result-group')).not.toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.results-panel')?.getAttribute('aria-busy')).toBe(
      'false',
    );
  });

  it('publishes results for the latest rule filters after rapid changes', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const search = fixture.nativeElement.querySelector(
      'input[placeholder^="Rechercher un identifiant"]',
    ) as HTMLInputElement;
    search.value = 'R2';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    search.value = 'R1';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expandAllRules(fixture);

    const visibleRuleIds = Array.from(
      fixture.nativeElement.querySelectorAll('.rule-id') as NodeListOf<HTMLElement>,
      (element) => element.textContent?.trim(),
    );
    expect(visibleRuleIds).toEqual(['R1']);
  });

  it('shows local catalog management and the metadata inferred from filenames', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const manageButtons = fixture.nativeElement.querySelectorAll(
      '.workspace-tabs button',
    ) as NodeListOf<HTMLButtonElement>;
    const manageButton = Array.from(manageButtons).find((button) =>
      button.textContent?.includes('Gérer les fichiers'),
    );
    (manageButton as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('lcl_expert_vetting_rules.xml');
    expect(fixture.nativeElement.textContent).toContain('Stockage local');
    const textInputs = fixture.nativeElement.querySelectorAll(
      '.source-metadata input[type="text"]',
    );
    expect((textInputs[2] as HTMLInputElement).value).toBe('lcl');
    expect((textInputs[3] as HTMLInputElement).value).toBe('expert');
  });

  it('shows a recoverable empty state when no rule matches', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const search = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'aucune-correspondance';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aucune règle trouvée');

    (fixture.nativeElement.querySelector('.text-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expandAllRules(fixture);
    expect(fixture.nativeElement.querySelectorAll('.rule-card')).toHaveLength(2);
  });

  it('shows an explicit loading error instead of an empty catalogue', async () => {
    catalogService.load.mockRejectedValue(new Error('XML invalide'));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'XML invalide',
    );
    expect(fixture.nativeElement.querySelectorAll('.rule-card')).toHaveLength(0);
  });
});
