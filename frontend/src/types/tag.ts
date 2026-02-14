export interface Tag {
  id: number;
  name: string;
  parent_id: number | null;
  description: string | null;
  color: string | null;
  created_at: string;
}

export interface AllocationTargetInfo {
  target_pct: number;
  notes: string | null;
}

export interface TagTreeNode extends Tag {
  children: TagTreeNode[];
  allocation_target?: AllocationTargetInfo | null;
  investment_count?: number;
  total_value?: number;
}

export interface TagCreate {
  name: string;
  parent_id?: number | null;
  description?: string;
  color?: string;
}

export interface TagUpdate {
  name?: string;
  parent_id?: number | null;
  description?: string;
  color?: string;
}
