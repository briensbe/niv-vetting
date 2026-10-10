import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RuleComparisonComponent } from './rule-comparison.component';
import { StoredVettingSource } from './vetting-catalog-storage';
import { VettingRule } from './vetting-catalog';

describe('RuleComparisonComponent', () => {
  const mockSources: StoredVettingSource[] = [
    {
      id: 'source-a',
      fileName: 'rules_a.xml',
      origin: 'imported',
      adherent: 'crca',
      offer: 'standard',
      xmlText: '<rules></rules>',
      propertiesText: '',
      propertiesFileName: null,
    },
    {
      id: 'source-b',
      fileName: 'rules_b.xml',
      origin: 'imported',
      adherent: 'lcl',
      offer: 'expert',
      xmlText: '<rules></rules>',
      propertiesText: '',
      propertiesFileName: null,
    },
  ];

  const mockRules: VettingRule[] = [
    {
      key: 'MOD1::rule1::0',
      moduleId: 'MOD1',
      moduleLabel: 'Module 1',
      id: 'R1',
      label: 'Règle 1',
      description: null,
      active: true,
      profiles: { USER: 'ERROR' },
      sourceId: 'source-a',
      familyId: 'fam',
      familyLabel: 'Fam',
      packageName: 'pkg',
      messageVariants: [],
    },
    {
      key: 'MOD1::rule1::1',
      moduleId: 'MOD1',
      moduleLabel: 'Module 1',
      id: 'R1',
      label: 'Règle 1',
      description: null,
      active: false,
      profiles: { USER: 'WARNING' },
      sourceId: 'source-b',
      familyId: 'fam',
      familyLabel: 'Fam',
      packageName: 'pkg',
      messageVariants: [],
    },
  ];

  it('renders insufficient sources notice when fewer than 2 sources are provided', async () => {
    const fixture: ComponentFixture<RuleComparisonComponent> =
      TestBed.createComponent(RuleComparisonComponent);
    fixture.componentRef.setInput('sources', [mockSources[0]]);
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();
    await fixture.whenStable();

    const emptyNotice = fixture.nativeElement.querySelector('.compare-insufficient-sources');
    expect(emptyNotice).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(
      'Comparaison impossible : au moins deux fichiers sont requis',
    );
  });

  it('emits navigateToManage event when clicking the navigation button in empty state', async () => {
    const fixture: ComponentFixture<RuleComparisonComponent> =
      TestBed.createComponent(RuleComparisonComponent);
    fixture.componentRef.setInput('sources', []);
    fixture.detectChanges();
    await fixture.whenStable();

    let emitted = false;
    fixture.componentInstance.navigateToManage.subscribe(() => {
      emitted = true;
    });

    const button: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.compare-insufficient-sources button');
    button?.click();

    expect(emitted).toBe(true);
  });

  it('renders KPIs and comparison cards when at least 2 sources are provided', async () => {
    const fixture: ComponentFixture<RuleComparisonComponent> =
      TestBed.createComponent(RuleComparisonComponent);
    fixture.componentRef.setInput('sources', mockSources);
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();
    await fixture.whenStable();

    const kpis = fixture.nativeElement.querySelectorAll('.kpi-card');
    expect(kpis.length).toBeGreaterThanOrEqual(4);

    const cards = fixture.nativeElement.querySelectorAll('.compare-rule-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain('R1');
  });

  it('filters rules when search input is changed', async () => {
    const fixture: ComponentFixture<RuleComparisonComponent> =
      TestBed.createComponent(RuleComparisonComponent);
    fixture.componentRef.setInput('sources', mockSources);
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();
    await fixture.whenStable();

    const searchInput: HTMLInputElement | null =
      fixture.nativeElement.querySelector('.search-field input');
    expect(searchInput).toBeTruthy();

    if (searchInput) {
      searchInput.value = 'R1';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
    }

    expect(fixture.nativeElement.querySelectorAll('.compare-rule-card')).toHaveLength(1);

    if (searchInput) {
      searchInput.value = 'INEXISTANT';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
    }

    expect(fixture.nativeElement.querySelectorAll('.compare-rule-card')).toHaveLength(0);
  });
});
