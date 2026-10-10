import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { App } from './app';
import { VettingCatalogService } from './vetting-catalog.service';
import { VettingCatalog } from './vetting-catalog';

const sampleRule = {
  key: 'PAYMENT::common::R1::0',
  moduleId: 'PAYMENT',
  moduleLabel: 'Paiements',
  familyId: 'common',
  familyLabel: 'common',
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
};

const secondRule = {
  key: 'TRANSFER::wire::R2::0',
  moduleId: 'TRANSFER',
  moduleLabel: 'Virements',
  familyId: 'wire',
  familyLabel: 'wire',
  packageName: 'example.rules.Transfer',
  id: 'R2',
  label: 'Seuil de virement',
  description: 'Vérifie un montant.',
  messageVariants: [],
  active: false,
  profiles: { USER: 'WARNING', ROOT: 'IGNORE' },
};

const catalog: VettingCatalog = {
  operations: [
    {
      id: 'PAYMENT',
      label: 'Paiements',
      ruleCount: 1,
      families: [
        {
          id: 'common',
          hasDeclaredId: true,
          label: 'common',
          packageName: 'example.rules.Common',
          rules: [sampleRule],
        },
        {
          id: 'package-family-1',
          hasDeclaredId: false,
          label: 'derived / from package',
          packageName: 'example.rules.Derived',
          rules: [],
        },
      ],
    },
    {
      id: 'TRANSFER',
      label: 'Virements',
      ruleCount: 1,
      families: [
        {
          id: 'wire',
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

const catalogService = { load: vi.fn(() => of(catalog)) };

describe('App', () => {
  beforeEach(async () => {
    catalogService.load.mockReturnValue(of(catalog));
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
    expect(compiled.querySelectorAll('.rule-card:first-child .profile-row')).toHaveLength(2);
    expect(compiled.querySelectorAll('.rule-card:first-child .behavior-badge svg')).toHaveLength(2);
    expect(compiled.querySelector('.rule-card .rule-profiles .field-label')).toBeNull();
    expect(
      Array.from(compiled.querySelectorAll('.rule-card:first-child .behavior-badge'), (badge) =>
        badge.getAttribute('aria-label'),
      ),
    ).toEqual(['ERROR', 'IGNORE']);
    expect(compiled.querySelector('.behavior-legend')?.textContent).toContain(
      'Avertissement accepté',
    );
    expect(compiled.querySelector('.rule-card .rule-description .field-label')).toBeNull();
  });

  it('keeps property-file message variants in a second-level disclosure', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

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

    expect(fixture.nativeElement.querySelector('.rule-card .rule-id')?.textContent).toContain('R1');
    expect(fixture.nativeElement.textContent).toContain('Résultats de recherche');
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

    select('Filtrer par opération', 'TRANSFER');
    select('Filtrer par état actif', 'inactive');
    select('Filtrer par profil', 'USER');
    select('Filtrer par comportement de profil', 'WARNING');

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
          '[aria-label="Filtrer par famille"]',
        ) as HTMLSelectElement
      ).options,
    ).map((option) => option.textContent?.trim());
    expect(familyOptions).toEqual(['Toutes', 'common', '(Paiements)', 'wire']);
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
    expect(fixture.nativeElement.textContent).toContain('Aucune règle trouvée');

    (fixture.nativeElement.querySelector('.text-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.rule-card')).toHaveLength(2);
  });

  it('shows an explicit loading error instead of an empty catalogue', async () => {
    catalogService.load.mockReturnValue(throwError(() => new Error('XML invalide')));
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
