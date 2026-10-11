export interface TreeNode {
  readonly id: string;
  readonly label: string;
  readonly depth: number;
  readonly ruleCount?: number;
  readonly children?: readonly TreeNode[];
  checked?: boolean;
  indeterminate?: boolean;
  expanded?: boolean;
}
