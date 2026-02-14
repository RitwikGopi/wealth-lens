/** Matches backend HoldingResponse (list endpoint, no tags) */
export interface HoldingResponse {
  id: number;
  symbol: string;
  exchange: string;
  instrument_type: string;
  quantity: number;
  average_price: number;
  current_price: number | null;
  current_value: number | null;
  pnl: number | null;
  source: string;
  zerodha_trading_symbol: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Matches backend HoldingWithTags (detail endpoint, includes tags) */
export interface Holding extends HoldingResponse {
  tags: TagBrief[];
}

export interface TagBrief {
  id: number;
  name: string;
  color: string | null;
}

export interface HoldingCreate {
  symbol: string;
  exchange: string;
  instrument_type: string;
  quantity: number;
  average_price: number;
  current_price?: number;
  notes?: string;
}

export interface HoldingUpdate {
  symbol?: string;
  exchange?: string;
  instrument_type?: string;
  quantity?: number;
  average_price?: number;
  current_price?: number;
  notes?: string;
}
