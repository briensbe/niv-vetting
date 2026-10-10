import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SourceManagementComponent } from './source-management.component';
import { VettingCatalogService } from './vetting-catalog.service';
import { StoredVettingSource } from './vetting-catalog-storage';
import { VettingRule } from './vetting-catalog';
import { vi } from 'vitest';

describe('SourceManagementComponent', () => {
  let fixture: ComponentFixture<SourceManagementComponent>;
  let component: SourceManagementComponent;
  let catalogService: {
    importXmlFile: ReturnType<typeof vi.fn>;
    updateSourceMetadata: ReturnType<typeof vi.fn>;
    attachPropertiesFile: ReturnType<typeof vi.fn>;
    removeSource: ReturnType<typeof vi.fn>;
    updateBundledSource: ReturnType<typeof vi.fn>;
  };

  const mockSources: StoredVettingSource[] = [
    {
      id: 'source-1',
      fileName: 'rules_1.xml',
      origin: 'bundled',
      adherent: 'crca',
      offer: 'standard',
      xmlText: '<rules></rules>',
      propertiesText: '',
      propertiesFileName: 'rules_1.properties',
    },
    {
      id: 'source-2',
      fileName: 'rules_2.xml',
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
      sourceId: 'source-1',
      familyId: 'fam',
      familyLabel: 'Fam',
      packageName: 'pkg',
      messageVariants: [],
    },
  ];

  beforeEach(async () => {
    catalogService = {
      importXmlFile: vi.fn(async () => undefined),
      updateSourceMetadata: vi.fn(async () => undefined),
      attachPropertiesFile: vi.fn(async () => undefined),
      removeSource: vi.fn(async () => undefined),
      updateBundledSource: vi.fn(async () => undefined),
    };

    await TestBed.configureTestingModule({
      imports: [SourceManagementComponent],
      providers: [{ provide: VettingCatalogService, useValue: catalogService }],
    }).compileComponents();

    fixture = TestBed.createComponent(SourceManagementComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('sources', mockSources);
    fixture.componentRef.setInput('rules', mockRules);
    fixture.detectChanges();
  });

  it('renders source items and displays correct rule count and origin', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('rules_1.xml');
    expect(text).toContain('rules_2.xml');
    expect(text).toContain('FICHIER INTÉGRÉ');
    expect(text).toContain('FICHIER IMPORTÉ');
    expect(text).toContain('1 règles');
    expect(text).toContain('0 règles');
  });

  it('emits workspaceUpdated when metadata changes', async () => {
    let emitted = false;
    component.workspaceUpdated.subscribe(() => {
      emitted = true;
    });

    const adherentInput = fixture.nativeElement.querySelector(
      '.source-metadata input[type="text"]',
    ) as HTMLInputElement;
    adherentInput.value = 'nouveau-adherent';
    adherentInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(catalogService.updateSourceMetadata).toHaveBeenCalledWith(
      'source-1',
      'nouveau-adherent',
      'standard',
    );
    expect(emitted).toBe(true);
  });

  it('displays empty state when sources list is empty', () => {
    fixture.componentRef.setInput('sources', []);
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('.empty-state');
    expect(empty).toBeTruthy();
    expect(empty.textContent).toContain('Aucun jeu de règles enregistré');
  });
});
