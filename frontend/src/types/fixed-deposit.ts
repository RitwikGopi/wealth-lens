/** Matches backend FixedDepositResponse (no tags) */
export interface FixedDepositResponse {
  id: number;
  bank_name: string;
  principal: number;
  interest_rate: number;
  compounding_frequency: string;
  start_date: string;
  maturity_date: string;
  maturity_amount: number | null;
  current_value: number | null;
  is_cumulative: boolean;
  interest_payout_freq: string | null;
  auto_renew: boolean;
  funded_externally: boolean;
  notes: string | null;
  status: "active" | "closed";
  closure_date: string | null;
  closure_amount: number | null;
  created_at: string;
  updated_at: string;
}

/** Matches backend FixedDepositWithTags (list/detail endpoint, includes tags) */
export interface FixedDeposit extends FixedDepositResponse {
  tags: FDTagBrief[];
}

export interface FDTagBrief {
  id: number;
  name: string;
  color: string | null;
}

export interface FixedDepositCreate {
  bank_name: string;
  principal: number;
  interest_rate: number;
  compounding_frequency: string;
  start_date: string;
  maturity_date: string;
  maturity_amount?: number;
  is_cumulative?: boolean;
  interest_payout_freq?: string;
  auto_renew?: boolean;
  funded_externally?: boolean;
  notes?: string;
}

export interface FixedDepositUpdate {
  bank_name?: string;
  principal?: number;
  interest_rate?: number;
  compounding_frequency?: string;
  start_date?: string;
  maturity_date?: string;
  maturity_amount?: number;
  is_cumulative?: boolean;
  interest_payout_freq?: string;
  auto_renew?: boolean;
  notes?: string;
}

export type FDStatus = "active" | "maturing_soon" | "matured" | "closed";

export function getFDStatus(fd: FixedDeposit): FDStatus {
  if (fd.status === "closed") return "closed";

  const now = new Date();
  const maturity = new Date(fd.maturity_date);
  const daysToMaturity = Math.ceil(
    (maturity.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysToMaturity <= 0) return "matured";
  if (daysToMaturity <= 30) return "maturing_soon";
  return "active";
}

export interface FDCloseRequest {
  closure_date: string;
  closure_amount: number;
  premature: boolean;
  reinvesting?: boolean;
  notes?: string;
}

export interface FDRenewRequest {
  new_maturity_date: string;
  new_principal?: number;
  new_interest_rate?: number;
  new_compounding_frequency?: string;
  new_bank_name?: string;
  new_is_cumulative?: boolean;
  notes?: string;
}

export interface FDRenewResponse {
  closed_fd: FixedDepositResponse;
  new_fd: FixedDepositResponse;
}
