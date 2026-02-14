/** Matches backend AllocationDrift schema */
export interface AllocationDriftAPI {
  tag_id: number;
  tag_name: string;
  tag_color: string | null;
  target_pct: number;
  current_pct: number;
  current_value: number;
  drift: number;
}

/** Matches backend AllocationTargetResponse schema */
export interface AllocationTargetAPI {
  id: number;
  plan_id: number;
  tag_id: number;
  tag_name: string;
  target_pct: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Frontend enriched allocation target (used by UI) */
export interface AllocationTarget {
  id: number;
  tag_id: number;
  tag_name: string;
  tag_color: string | null;
  target_pct: number;
  actual_pct: number;
  actual_value: number;
  drift_pct: number;
  drift_value: number;
  children?: AllocationTarget[];
}

export interface AllocationDrift {
  total_portfolio_value: number;
  allocations: AllocationTarget[];
}

export interface AllocationTargetUpdate {
  target_pct: number;
  notes?: string | null;
}

// --- Plan types ---

/** Matches backend AllocationPlanResponse schema */
export interface AllocationPlanAPI {
  id: number;
  name: string;
  description: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

/** Matches backend AllocationPlanDetailResponse schema */
export interface AllocationPlanDetailAPI extends AllocationPlanAPI {
  targets: AllocationTargetAPI[];
  total_target_pct: number;
}

export interface AllocationPlanCreate {
  name: string;
  description?: string | null;
  is_primary?: boolean;
}

export interface AllocationPlanUpdate {
  name?: string;
  description?: string | null;
  is_primary?: boolean;
}
