import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreeSelectComponent } from './tree-select.component';
import { TreeNode } from './tree-select.model';

describe('TreeSelectComponent', () => {
  let fixture: ComponentFixture<TreeSelectComponent>;
  let component: TreeSelectComponent;

  const mockTree: TreeNode[] = [
    {
      id: 'source-1',
      label: 'file1.xml',
      depth: 0,
      ruleCount: 5,
      children: [
        {
          id: 'source-1::MOD1',
          label: 'MOD1',
          depth: 1,
          ruleCount: 5,
          children: [
            { id: 'source-1::MOD1::RS1', label: 'RS1', depth: 2, ruleCount: 3 },
            { id: 'source-1::MOD1::RS2', label: 'RS2', depth: 2, ruleCount: 2 },
          ],
        },
      ],
    },
    {
      id: 'source-2',
      label: 'file2.xml',
      depth: 0,
      ruleCount: 4,
      children: [
        {
          id: 'source-2::MOD2',
          label: 'MOD2',
          depth: 1,
          ruleCount: 4,
          children: [
            { id: 'source-2::MOD2::RS3', label: 'RS3', depth: 2, ruleCount: 4 },
          ],
        },
      ],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreeSelectComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TreeSelectComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tree', mockTree);
    fixture.detectChanges();
  });

  it('renders trigger button with default text "Fichiers & Modules : Tous"', () => {
    expect(component.triggerButtonText()).toBe('Fichiers & Modules : Tous');
  });

  it('toggles open state on trigger click', () => {
    expect(component.isOpen()).toBe(false);
    component.toggleOpen();
    expect(component.isOpen()).toBe(true);
  });

  it('computes checked state when all leaf children are selected', () => {
    fixture.componentRef.setInput('selectedRuleSetKeys', new Set(['source-1::MOD1::RS1', 'source-1::MOD1::RS2']));
    fixture.detectChanges();

    const rootNode = mockTree[0];
    expect(component.isNodeChecked(rootNode)).toBe(true);
    expect(component.isNodeIndeterminate(rootNode)).toBe(false);
  });

  it('computes indeterminate state when some leaf children are selected', () => {
    fixture.componentRef.setInput('selectedRuleSetKeys', new Set(['source-1::MOD1::RS1']));
    fixture.detectChanges();

    const rootNode = mockTree[0];
    expect(component.isNodeChecked(rootNode)).toBe(false);
    expect(component.isNodeIndeterminate(rootNode)).toBe(true);
  });

  it('emits all leaf keys when parent is checked', () => {
    let emitted: ReadonlySet<string> | undefined;
    component.selectionChange.subscribe((val) => {
      emitted = val;
    });

    component.onNodeToggle(mockTree[0], {
      target: { checked: true },
      stopPropagation: () => {},
    } as unknown as Event);

    expect(emitted).toBeDefined();
    expect(emitted?.has('source-1::MOD1::RS1')).toBe(true);
    expect(emitted?.has('source-1::MOD1::RS2')).toBe(true);
    expect(emitted?.size).toBe(2);
  });

  it('auto-expands nodes on search', () => {
    component.searchTerm.set('RS1');
    expect(component.isExpanded('source-1')).toBe(true);
    expect(component.isExpanded('source-1::MOD1')).toBe(true);
  });
});
