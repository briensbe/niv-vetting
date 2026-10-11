import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TreeNode } from './tree-select.model';

export interface FlattenedItem {
  readonly node: TreeNode;
  readonly parentId?: string;
}

@Component({
  selector: 'app-tree-select',
  standalone: true,
  templateUrl: './tree-select.component.html',
  styleUrl: './tree-select.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeSelectComponent {
  private readonly elementRef = inject(ElementRef);

  readonly tree = input.required<readonly TreeNode[]>();
  readonly selectedRuleSetKeys = input<ReadonlySet<string>>(new Set<string>());
  readonly selectionChange = output<ReadonlySet<string>>();

  readonly isOpen = signal(false);
  readonly searchTerm = signal('');
  readonly expandedNodeIds = signal<Set<string>>(new Set<string>());

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggleOpen(): void {
    this.isOpen.update((v) => !v);
  }

  onSearchInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.searchTerm.set(inputElement.value);
  }

  isExpanded(nodeId: string): boolean {
    if (this.searchTerm().trim()) {
      return true; // Auto-déplié lors d'une recherche
    }
    return this.expandedNodeIds().has(nodeId);
  }

  toggleExpand(nodeId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.expandedNodeIds.update((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  triggerButtonText = computed(() => {
    const count = this.selectedRuleSetKeys().size;
    if (count === 0) {
      return 'Fichiers & Modules : Tous';
    }
    return `Fichiers & Modules (${count})`;
  });

  private getAllLeafKeys(node: TreeNode): string[] {
    if (!node.children || node.children.length === 0) {
      return [node.id];
    }
    return node.children.flatMap((c) => this.getAllLeafKeys(c));
  }

  isNodeChecked(node: TreeNode): boolean {
    const leafKeys = this.getAllLeafKeys(node);
    if (leafKeys.length === 0) return false;
    const selected = this.selectedRuleSetKeys();
    return leafKeys.every((key) => selected.has(key));
  }

  isNodeIndeterminate(node: TreeNode): boolean {
    const leafKeys = this.getAllLeafKeys(node);
    if (leafKeys.length === 0) return false;
    const selected = this.selectedRuleSetKeys();
    const count = leafKeys.filter((key) => selected.has(key)).length;
    return count > 0 && count < leafKeys.length;
  }

  onNodeToggle(node: TreeNode, event: Event): void {
    event.stopPropagation();
    const isChecked = (event.target as HTMLInputElement).checked;
    this.applyNodeCheckState(node, isChecked);
  }

  onLabelClick(node: TreeNode): void {
    const currentlyChecked = this.isNodeChecked(node);
    this.applyNodeCheckState(node, !currentlyChecked);
  }

  private applyNodeCheckState(node: TreeNode, check: boolean): void {
    const leafKeys = this.getAllLeafKeys(node);
    const next = new Set(this.selectedRuleSetKeys());
    if (check) {
      for (const key of leafKeys) {
        next.add(key);
      }
    } else {
      for (const key of leafKeys) {
        next.delete(key);
      }
    }
    this.selectionChange.emit(next);
  }

  clearSelection(): void {
    this.selectionChange.emit(new Set<string>());
  }

  visibleFlattenedNodes = computed<FlattenedItem[]>(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const roots = this.tree();

    const flatten = (nodes: readonly TreeNode[], parentId?: string): FlattenedItem[] => {
      const result: FlattenedItem[] = [];
      for (const node of nodes) {
        const matchesSelf = !search || node.label.toLowerCase().includes(search);
        const childMatches = node.children ? flatten(node.children, node.id) : [];

        if (matchesSelf || childMatches.length > 0) {
          result.push({ node, parentId });
          // If searching or node is expanded, include matched children
          const expanded = Boolean(search) || this.expandedNodeIds().has(node.id);
          if (expanded) {
            result.push(...childMatches);
          }
        }
      }
      return result;
    };

    return flatten(roots);
  });
}
