/** Matches backend PortfolioSummary schema */
export interface PortfolioSummaryAPI {
  total_value: number;
  holdings_value: number;
  fd_value: number;
  total_pnl: number;
  holdings_count: number;
  fd_count: number;
  last_sync_at: string | null;
}

/** Extended summary used by the dashboard (enriched client-side) */
export interface PortfolioSummary {
  total_value: number;
  total_invested: number;
  total_pnl: number;
  pnl_percentage: number;
  holdings_value: number;
  fd_value: number;
  holdings_count: number;
  fd_count: number;
  last_synced: string | null;
  allocation_by_tag: AllocationByTag[];
  top_holdings: TopHolding[];
}

export interface AllocationByTag {
  tag_id: number | null;
  tag_name: string;
  tag_color: string | null;
  value: number;
  percentage: number;
}

export interface TopHolding {
  id: number;
  symbol: string;
  instrument_type: string;
  current_value: number;
  pnl_percentage: number;
  tags: { name: string; color: string | null }[];
}

/** Matches backend SnapshotWithReturnResponse schema */
export interface PortfolioSnapshot {
  id: number;
  date: string;
  total_value: number;
  holdings_value: number;
  fd_value: number;
  breakdown?: string | null;
  total_return?: number | null;
  created_at?: string;
}

/** Matches backend LifetimeGainsResponse schema */
export interface LifetimeGains {
  total_invested: number;
  total_withdrawn: number;
  net_invested: number;
  current_portfolio_value: number;
  lifetime_gain: number;
  lifetime_gain_pct: number | null;
  unrealized_pnl: number;
  holdings_pnl: number;
  fd_interest: number;
  realized_pnl: number;
  withdrawal_count: number;
}
