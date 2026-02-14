export interface Transaction {
  id: number;
  type: TransactionType;
  holding_id: number | null;
  fd_id: number | null;
  amount: number;
  quantity: number | null;
  price: number | null;
  date: string;
  notes: string | null;
  source?: string;
  created_at: string;
}

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "buy"
  | "sell"
  | "dividend"
  | "interest"
  | "fd_open"
  | "fd_close"
  | "rebalance";

export interface TransactionCreate {
  type: TransactionType;
  amount: number;
  date: string;
  holding_id?: number;
  fd_id?: number;
  quantity?: number;
  price?: number;
  notes?: string;
}

export interface TransactionFilters {
  type?: string;
  holding_id?: string;
  fd_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: string;
  offset?: string;
}
