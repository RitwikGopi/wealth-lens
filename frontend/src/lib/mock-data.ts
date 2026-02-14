import { PortfolioSummary, PortfolioSnapshot, LifetimeGains } from "@/types/portfolio";
import { HoldingResponse } from "@/types/holding";
import { FixedDeposit } from "@/types/fixed-deposit";
import { Transaction } from "@/types/transaction";
import { TagTreeNode } from "@/types/tag";
import { AllocationDrift } from "@/types/allocation";

export const mockPortfolioSummary: PortfolioSummary = {
  total_value: 1245678,
  total_invested: 1000000,
  total_pnl: 245678,
  pnl_percentage: 24.57,
  holdings_value: 945678,
  fd_value: 300000,
  holdings_count: 12,
  fd_count: 3,
  last_synced: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  allocation_by_tag: [
    { tag_id: 1, tag_name: "Equity", tag_color: "#3B82F6", value: 747405, percentage: 60 },
    { tag_id: 2, tag_name: "Debt", tag_color: "#10B981", value: 373703, percentage: 30 },
    { tag_id: 3, tag_name: "Gold", tag_color: "#F59E0B", value: 124570, percentage: 10 },
  ],
  top_holdings: [
    { id: 1, symbol: "INFY", instrument_type: "EQ", current_value: 250000, pnl_percentage: 12.5, tags: [{ name: "Equity", color: "#3B82F6" }] },
    { id: 2, symbol: "NIFTYBEES", instrument_type: "ETF", current_value: 180000, pnl_percentage: 8.3, tags: [{ name: "Equity", color: "#3B82F6" }] },
    { id: 3, symbol: "SBI FD #1234", instrument_type: "FD", current_value: 150000, pnl_percentage: 7.5, tags: [{ name: "Debt", color: "#10B981" }] },
    { id: 4, symbol: "RELIANCE", instrument_type: "EQ", current_value: 130000, pnl_percentage: 15.2, tags: [{ name: "Equity", color: "#3B82F6" }] },
    { id: 5, symbol: "HDFCBANK", instrument_type: "EQ", current_value: 120000, pnl_percentage: -2.1, tags: [{ name: "Equity", color: "#3B82F6" }] },
  ],
};

export const mockSnapshots: PortfolioSnapshot[] = Array.from({ length: 365 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (364 - i));
  const base = 800000;
  const growth = (i / 365) * 400000;
  const noise = Math.sin(i * 0.1) * 20000 + Math.random() * 10000;
  const totalValue = Math.round(base + growth + noise);
  // Simulate cumulative withdrawals growing over time
  const cumulativeWithdrawals = i > 180 ? Math.round((i - 180) * 200) : 0;
  return {
    id: i + 1,
    date: date.toISOString().split("T")[0],
    total_value: totalValue,
    holdings_value: Math.round(totalValue * 0.75),
    fd_value: Math.round(totalValue * 0.25),
    total_return: totalValue + cumulativeWithdrawals,
  };
});

export const mockLifetimeGains: LifetimeGains = {
  total_invested: 1000000,
  total_withdrawn: 150000,
  net_invested: 850000,
  current_portfolio_value: 1245678,
  lifetime_gain: 395678,
  lifetime_gain_pct: 39.57,
  unrealized_pnl: 245678,
  holdings_pnl: 220000,
  fd_interest: 25678,
  realized_pnl: 150000,
  withdrawal_count: 5,
};

export const mockHoldings: HoldingResponse[] = [
  {
    id: 1, symbol: "INFY", exchange: "NSE", instrument_type: "EQ", quantity: 100,
    average_price: 1500, current_price: 1800, current_value: 180000, pnl: 30000,
    source: "zerodha", zerodha_trading_symbol: "INFY", notes: null,
    created_at: "2025-06-15", updated_at: "2026-02-10",
  },
  {
    id: 2, symbol: "NIFTYBEES", exchange: "NSE", instrument_type: "ETF", quantity: 500,
    average_price: 180, current_price: 210, current_value: 105000, pnl: 15000,
    source: "zerodha", zerodha_trading_symbol: "NIFTYBEES", notes: null,
    created_at: "2025-08-01", updated_at: "2026-02-10",
  },
  {
    id: 3, symbol: "RELIANCE", exchange: "NSE", instrument_type: "EQ", quantity: 50,
    average_price: 2400, current_price: 2600, current_value: 130000, pnl: 10000,
    source: "zerodha", zerodha_trading_symbol: "RELIANCE", notes: null,
    created_at: "2025-09-10", updated_at: "2026-02-10",
  },
  {
    id: 4, symbol: "HDFCBANK", exchange: "NSE", instrument_type: "EQ", quantity: 75,
    average_price: 1600, current_price: 1560, current_value: 117000, pnl: -3000,
    source: "zerodha", zerodha_trading_symbol: "HDFCBANK", notes: null,
    created_at: "2025-07-20", updated_at: "2026-02-10",
  },
  {
    id: 5, symbol: "SGB2024", exchange: "NSE", instrument_type: "Bond", quantity: 10,
    average_price: 4800, current_price: 5200, current_value: 52000, pnl: 4000,
    source: "manual", zerodha_trading_symbol: null, notes: "Sovereign Gold Bond 2024",
    created_at: "2024-06-01", updated_at: "2026-02-10",
  },
];

export const mockFixedDeposits: FixedDeposit[] = [
  {
    id: 1, bank_name: "SBI", principal: 500000, interest_rate: 7.5,
    compounding_frequency: "quarterly", start_date: "2025-01-15", maturity_date: "2027-01-15",
    maturity_amount: 575000, current_value: 538450, is_cumulative: true,
    interest_payout_freq: null, auto_renew: false, notes: null,
    status: "active", closure_date: null, closure_amount: null,
    tags: [{ id: 2, name: "Debt", color: "#10B981" }],
    created_at: "2025-01-15", updated_at: "2026-02-10",
  },
  {
    id: 2, bank_name: "HDFC", principal: 300000, interest_rate: 7.1,
    compounding_frequency: "quarterly", start_date: "2025-03-01", maturity_date: "2026-03-01",
    maturity_amount: 321300, current_value: 315200, is_cumulative: true,
    interest_payout_freq: null, auto_renew: true, notes: null,
    status: "active", closure_date: null, closure_amount: null,
    tags: [{ id: 2, name: "Debt", color: "#10B981" }],
    created_at: "2025-03-01", updated_at: "2026-02-10",
  },
  {
    id: 3, bank_name: "ICICI", principal: 200000, interest_rate: 6.8,
    compounding_frequency: "quarterly", start_date: "2024-06-01", maturity_date: "2025-06-01",
    maturity_amount: 214200, current_value: 214200, is_cumulative: true,
    interest_payout_freq: null, auto_renew: false, notes: null,
    status: "active", closure_date: null, closure_amount: null,
    tags: [{ id: 2, name: "Debt", color: "#10B981" }],
    created_at: "2024-06-01", updated_at: "2026-02-10",
  },
];

export const mockTransactions: Transaction[] = [
  { id: 1, type: "deposit", holding_id: null, fd_id: null, amount: 50000, quantity: null, price: null, date: "2026-02-09", notes: "Monthly SIP deposit", created_at: "2026-02-09" },
  { id: 2, type: "buy", holding_id: 1, fd_id: null, amount: 25000, quantity: 15, price: 1667, date: "2026-02-05", notes: "INFY additional purchase", created_at: "2026-02-05" },
  { id: 3, type: "dividend", holding_id: 1, fd_id: null, amount: 1200, quantity: null, price: null, date: "2026-01-28", notes: "INFY Q3 dividend", created_at: "2026-01-28" },
  { id: 4, type: "fd_open", holding_id: null, fd_id: 1, amount: 500000, quantity: null, price: null, date: "2025-01-15", notes: "SBI FD opened", created_at: "2025-01-15" },
  { id: 5, type: "buy", holding_id: 2, fd_id: null, amount: 30000, quantity: 150, price: 200, date: "2026-01-10", notes: "NIFTYBEES SIP", created_at: "2026-01-10" },
  { id: 6, type: "deposit", holding_id: null, fd_id: null, amount: 75000, quantity: null, price: null, date: "2026-01-05", notes: "January deposit", created_at: "2026-01-05" },
  { id: 7, type: "withdrawal", holding_id: null, fd_id: null, amount: 20000, quantity: null, price: null, date: "2026-01-20", notes: "Emergency withdrawal", created_at: "2026-01-20" },
];

export const mockTagTree: TagTreeNode[] = [
  {
    id: 1, name: "Equity", parent_id: null, description: "Equity investments", color: "#3B82F6", created_at: "",
    allocation_target: { target_pct: 60, notes: null }, investment_count: 8, total_value: 747405,
    children: [
      { id: 4, name: "NIFTY50", parent_id: 1, description: null, color: "#6366F1", created_at: "", allocation_target: { target_pct: 50, notes: null }, investment_count: 3, total_value: 373000, children: [] },
      { id: 5, name: "NEXT50", parent_id: 1, description: null, color: "#8B5CF6", created_at: "", allocation_target: { target_pct: 30, notes: null }, investment_count: 3, total_value: 224000, children: [] },
      { id: 6, name: "MOM100", parent_id: 1, description: null, color: "#EC4899", created_at: "", allocation_target: { target_pct: 20, notes: null }, investment_count: 2, total_value: 150405, children: [] },
    ],
  },
  {
    id: 2, name: "Debt", parent_id: null, description: "Debt investments", color: "#10B981", created_at: "",
    allocation_target: { target_pct: 30, notes: null }, investment_count: 5, total_value: 373703,
    children: [
      { id: 7, name: "FD", parent_id: 2, description: null, color: "#14B8A6", created_at: "", allocation_target: { target_pct: 70, notes: null }, investment_count: 3, total_value: 261592, children: [] },
      { id: 8, name: "Bonds", parent_id: 2, description: null, color: "#059669", created_at: "", allocation_target: { target_pct: 30, notes: null }, investment_count: 2, total_value: 112111, children: [] },
    ],
  },
  {
    id: 3, name: "Gold", parent_id: null, description: "Gold investments", color: "#F59E0B", created_at: "",
    allocation_target: { target_pct: 10, notes: null }, investment_count: 2, total_value: 124570,
    children: [],
  },
];

export const mockAllocationDrift: AllocationDrift = {
  total_portfolio_value: 1245678,
  allocations: [
    {
      id: 1, tag_id: 1, tag_name: "Equity", tag_color: "#3B82F6",
      target_pct: 60, actual_pct: 63.2, actual_value: 787228, drift_pct: 3.2, drift_value: 39866,
      children: [
        { id: 4, tag_id: 4, tag_name: "NIFTY50", tag_color: "#6366F1", target_pct: 50, actual_pct: 52.1, actual_value: 410244, drift_pct: 2.1, drift_value: 16528 },
        { id: 5, tag_id: 5, tag_name: "NEXT50", tag_color: "#8B5CF6", target_pct: 30, actual_pct: 29.5, actual_value: 232232, drift_pct: -0.5, drift_value: -3936 },
        { id: 6, tag_id: 6, tag_name: "MOM100", tag_color: "#EC4899", target_pct: 20, actual_pct: 18.4, actual_value: 144752, drift_pct: -1.6, drift_value: -12592 },
      ],
    },
    {
      id: 2, tag_id: 2, tag_name: "Debt", tag_color: "#10B981",
      target_pct: 30, actual_pct: 27.8, actual_value: 346298, drift_pct: -2.2, drift_value: -27406,
      children: [
        { id: 7, tag_id: 7, tag_name: "FD", tag_color: "#14B8A6", target_pct: 70, actual_pct: 68.5, actual_value: 237214, drift_pct: -1.5, drift_value: -5188 },
        { id: 8, tag_id: 8, tag_name: "Bonds", tag_color: "#059669", target_pct: 30, actual_pct: 31.5, actual_value: 109084, drift_pct: 1.5, drift_value: 5188 },
      ],
    },
    {
      id: 3, tag_id: 3, tag_name: "Gold", tag_color: "#F59E0B",
      target_pct: 10, actual_pct: 9.0, actual_value: 112152, drift_pct: -1.0, drift_value: -12460,
    },
  ],
};
