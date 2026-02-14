# PRD: Fixing Lifetime Gains for Rebalancing & Sell Scenarios

## Context

The original Lifetime Gains PRD defined:

```
Lifetime Gain = Current Portfolio Value + Total Withdrawn - Total Deposited
```

Where `Total Deposited = SUM(amount) WHERE type = 'deposit'`.

However, the **implementation deviated** from this formula. Since Zerodha sync creates `buy` transactions (not `deposit` transactions), there are no deposit records. The code fell back to:

```
Total Invested = SUM(qty * avg_price for current holdings) + SUM(fd_principal)
```

This is **cost basis of current holdings**, not total money deposited. The distinction matters enormously when holdings change composition (sells, rebalancing, partial exits).

## The Core Problem

Cost basis of current holdings **resets when you sell and rebuy**. Deposit-based tracking does not.

```
Cost Basis Approach:
  total_invested = cost_of(current_holdings) + fd_principals

Deposit Approach (PRD original):
  total_deposited = all_money_ever_put_into_portfolio
```

These are the same **only if the user never sells anything**. The moment a sell occurs, the cost basis drops (fewer holdings), but no new deposit occurs, so the two diverge.

---

## Scenario Analysis

### Scenario 1: Simple Buy & Hold (NO sells) — Both approaches work

```
Day 1: User deposits 10,00,000. Buys GOLDBETA at 82.40 (12,135 units)
Day N: GOLDBETA is now 130.85. Value = 15,87,362

Cost basis approach:
  total_invested = 12,135 * 82.40 = 10,00,000
  lifetime_gain  = 15,87,362 + 0 - 10,00,000 = +5,87,362 ✓

Deposit approach:
  total_deposited = 10,00,000
  lifetime_gain   = 15,87,362 + 0 - 10,00,000 = +5,87,362 ✓
```

Both give the same answer. This is the current state of the app.

---

### Scenario 2: Sell for profit, hold as cash — Cost basis BREAKS

```
Day 1: User deposits 10,00,000. Buys GOLDBETA at 82.40 (12,135 units)
Day N: GOLDBETA is now 130.85. User sells ALL (gets 15,87,362)
        Money sits in Zerodha trading account (not tracked by app).

Cost basis approach:
  holdings = empty → total_invested = 0
  current_value = 0 (no holdings, no FDs)
  lifetime_gain = 0 + 0 - 0 = 0    ← WRONG! User made 5,87,362 profit

Deposit approach:
  total_deposited = 10,00,000
  current_value = 0  (portfolio is empty)
  lifetime_gain = 0 + 0 - 10,00,000 = -10,00,000  ← ALSO WRONG without cash tracking
```

**Key insight:** Neither approach works if the sell proceeds (cash in brokerage) aren't tracked. The money exists but is invisible to the system.

---

### Scenario 3: Sell & withdraw — Cost basis BREAKS, deposits work

```
Day 1: User deposits 10,00,000. Buys GOLDBETA at 82.40 (12,135 units)
Day N: GOLDBETA is now 130.85. User sells ALL and withdraws 15,87,362 to bank.
        User records a withdrawal transaction of 15,87,362.

Cost basis approach:
  total_invested = 0 (empty portfolio)
  lifetime_gain = 0 + 15,87,362 - 0 = +15,87,362
  ← WRONG! Actual gain is 5,87,362, but 10L of original capital is counted as "gain"

Deposit approach:
  total_deposited = 10,00,000
  lifetime_gain = 0 + 15,87,362 - 10,00,000 = +5,87,362 ✓ CORRECT
```

The deposit approach handles this perfectly. The cost basis approach inflates gains because the original 10L investment vanished from `total_invested`.

---

### Scenario 4: Rebalance — sell A, buy B (core rebalancing case)

```
Day 1: Deposit 10,00,000.
        Buy GOLDBETA at 82.40 (6,067 units, cost 5,00,000)
        Buy MOM100   at 63.55 (7,869 units, cost 5,00,000)

Day N: GOLDBETA now 130.85 → value 7,93,868 (gain: 2,93,868)
       MOM100   now 65.33  → value 5,13,981 (gain: 13,981)
       Total value = 13,07,849

Rebalance: Sell 2,000 GOLDBETA at 130.85 = 2,61,700 proceeds
           Buy 4,005 MOM100 at 65.33 = 2,61,647 with proceeds

After rebalance:
  GOLDBETA: 4,067 units, avg still 82.40, value = 5,32,167
  MOM100: 11,874 units, avg = (7869*63.55 + 4005*65.33)/11874 = 64.15, value = 7,75,530
  Total value = 13,07,697 (tiny rounding change)

Cost basis approach:
  Before: total_invested = 6067*82.40 + 7869*63.55 = 5,00,000 + 5,00,000 = 10,00,000
  After:  total_invested = 4067*82.40 + 11874*64.15 = 3,35,121 + 7,61,717 = 10,96,838

  Before: lifetime_gain = 13,07,849 - 10,00,000 = +3,07,849
  After:  lifetime_gain = 13,07,697 - 10,96,838 = +2,10,859
  ← LOST 96,990 of gain! (≈ the realized gain on 2000 GOLDBETA)

Deposit approach:
  total_deposited = 10,00,000 (unchanged — rebalancing is internal)
  Before: lifetime_gain = 13,07,849 - 10,00,000 = +3,07,849
  After:  lifetime_gain = 13,07,697 - 10,00,000 = +3,07,697 ✓ (tiny rounding diff only)
```

The deposit approach is immune to rebalancing. The cost basis approach loses the realized gain.

---

### Scenario 5: Partial profit-taking — sell some, withdraw some, reinvest some

```
Day 1: Deposit 10,00,000. Buy GOLDBETA (12,135 units at 82.40)
Day N: GOLDBETA at 130.85. Value = 15,87,362.
       User sells 3,000 units at 130.85 = 3,92,550 proceeds.
         → Withdraws 2,00,000 to bank (personal use)
         → Buys 2,942 MOM100 at 65.33 = 1,92,200 with remaining

After:
  GOLDBETA: 9,135 units, avg 82.40, value = 11,95,320
  MOM100: 2,942 units, avg 65.33, value = 1,92,201
  Total value = 13,87,521

Cost basis approach:
  total_invested = 9135*82.40 + 2942*65.33 = 7,52,724 + 1,92,200 = 9,44,924
  lifetime_gain = 13,87,521 + 2,00,000 - 9,44,924 = +6,42,597
  ← Should be ≈ 5,87,521 (total growth on the 10L)

  The real answer: user put in 10L, portfolio is now 13,87,521 + took home 2,00,000
  True gain = 13,87,521 + 2,00,000 - 10,00,000 = 5,87,521

  ERROR: +55,076 over-counted (≈ realized gain on sold units minus what was withdrawn)

Deposit approach:
  total_deposited = 10,00,000
  lifetime_gain = 13,87,521 + 2,00,000 - 10,00,000 = +5,87,521 ✓ CORRECT
```

---

### Scenario 6: Multiple deposits over time

```
Month 1: Deposit 5,00,000. Buy GOLDBETA at 82.40 (6,067 units)
Month 6: Deposit 5,00,000. Buy more GOLDBETA at 110.00 (4,545 units)
         Zerodha updates avg_price = (6067*82.40 + 4545*110.00) / 10612 = 91.82

Month 12: GOLDBETA at 130.85. Value = 13,88,598

Cost basis approach:
  total_invested = 10,612 * 91.82 = 9,74,599
  ← WRONG! User invested 10,00,000 total (5L + 5L)
  ← The average_price * quantity doesn't reconstruct the original deposits due to rounding

  lifetime_gain = 13,88,598 - 9,74,599 = +4,13,999 ← inflated

Deposit approach:
  total_deposited = 5,00,000 + 5,00,000 = 10,00,000
  lifetime_gain = 13,88,598 - 10,00,000 = +3,88,598 ✓ CORRECT
```

**Note:** Even without sells, cost basis has precision issues. Zerodha rounds `average_price` and the quantity-weighted reconstruction doesn't exactly match the sum of deposits. The error is small but compounds with many transactions.

---

### Scenario 7: FDs mature and are reinvested

```
Day 1: Deposit 10,00,000. Put in FD at 8% for 1 year.
Day 365: FD matures. Value = 10,83,000 (83K interest earned).
         User reinvests 10,83,000 into a new FD at 7%.

Cost basis approach:
  Before maturity: total_invested = 10,00,000 (fd_principal)
  After reinvestment (new FD): total_invested = 10,83,000 (new fd_principal includes earned interest!)
  ← The earned interest is now treated as "invested" capital
  lifetime_gain = 10,83,000 + 0 - 10,83,000 = 0
  ← WRONG! The user earned 83K

Deposit approach:
  total_deposited = 10,00,000 (never changed — interest isn't a deposit)
  lifetime_gain = 10,83,000 - 10,00,000 = +83,000 ✓ CORRECT
```

This scenario is very realistic — FDs auto-renew with interest rolled into principal.

---

## Summary: When Each Approach Fails

| Scenario | Cost Basis | Deposit-Based | Notes |
|----------|:----------:|:-------------:|-------|
| Buy & hold | ✅ | ✅ | Both equivalent |
| Sell & hold cash | ❌ (gain=0) | ❌ (no cash tracking) | Neither works without cash ledger |
| Sell & withdraw | ❌ (inflated) | ✅ | Cost basis loses track of original investment |
| Rebalance (sell A, buy B) | ❌ (loses realized gain) | ✅ | Core rebalancing flaw |
| Partial profit-taking | ❌ (miscounted) | ✅ | Mix of withdraw + reinvest |
| Multiple deposits | ❌ (rounding) | ✅ | avg_price rounding introduces drift |
| FD matures & renews | ❌ (interest = invested) | ✅ | Rolled interest inflates principal |
| Sell, cash sits in broker | ❌ | ❌ | Cash balance invisible to both |

**Verdict:** The deposit-based approach (as the original PRD intended) is strictly superior. The cost-basis approach only works for simple buy-and-hold.

---

## Proposed Solution

### The Missing Piece: Deposit Transactions

The original PRD had the right formula but the implementation couldn't use it because **there are no deposit transactions**. Zerodha sync creates `buy` transactions, not `deposit` transactions.

The fix: **auto-generate deposit transactions from buy transactions during Zerodha sync, and track FD deposits when FDs are created.**

### Option A: Infer deposits from initial sync (Recommended)

**Concept:** When Zerodha syncs holdings for the first time, the total cost of those holdings represents the money the user deposited into the brokerage. Create a single `deposit` transaction for this amount.

**Rules:**
1. **First Zerodha sync:** Create a `deposit` transaction for `SUM(qty * avg_price)` of all new holdings. This represents all historical capital that entered the brokerage.
2. **Subsequent syncs — new holdings appear:** A new holding means the user either deposited fresh capital or used existing cash (from sells). Since we can't distinguish these, create a deposit for new holdings only (this is conservative — it might overcount if funded from sells, but combined with the approach below, it can be reconciled).
3. **Subsequent syncs — quantity increases on existing holdings:** Create a deposit for the incremental cost `(new_qty - old_qty) * new_avg_price`. Same caveat as above.
4. **Quantity decreases (sell detected):** Do NOT create a withdrawal automatically. Selling is internal — the cash may be reinvested. Only user-initiated withdrawals create withdrawal transactions.
5. **FD creation:** Create a `deposit` transaction for the FD principal amount.
6. **FD maturity + renewal:** Do NOT create a new deposit for the maturity amount. The original deposit covers the principal, and interest is portfolio growth, not fresh capital. If the user adds more capital to the renewal, that delta is a new deposit.

**Handling retroactive data (existing users):**
- Run a one-time migration: create deposit transactions from existing buy transactions where `source = 'auto_sync'` and no corresponding deposit exists.
- For FDs: create deposit transactions from existing FDs matching their principal amounts.

**Tradeoff:** This approach slightly over-counts deposits when a sell's proceeds fund a new buy (the system sees a new deposit but the capital was internal). However, this is a smaller error than the current system, and can be improved over time by:
- Tracking a "cash balance" in the brokerage (see Option C)
- Or letting users manually adjust deposit amounts

### Option B: Cumulative realized P&L approach

**Concept:** Instead of tracking deposits, fix the cost-basis formula by adding back cumulative realized gains:

```
Lifetime Gain = Unrealized P&L + Cumulative Realized P&L (from sell transactions)
```

**Requires:**
1. Fix auto-sync sell transactions to record actual sell price (currently uses `average_price`, making `realized_pnl = 0`)
2. Use cumulative `SUM(realized_pnl)` from all sell transactions in the lifetime gains formula
3. Handle FD interest separately: when FD matures, record the interest as realized gain

**Pros:** No new transaction types needed, works with existing data model.
**Cons:** Depends entirely on `realized_pnl` being accurate for every sell transaction. If any sell is recorded without proper P&L (e.g., manual transactions, missing holding link), the numbers drift permanently.

### Option C: Full cash ledger (most accurate, most complex)

**Concept:** Track a virtual "cash balance" in the brokerage account:

```
Cash balance = deposits - withdrawals - buys + sells + dividends + interest_payouts
```

Portfolio total = holdings_value + fd_value + cash_balance

**Pros:** Handles every scenario perfectly, including cash sitting in brokerage.
**Cons:** Requires significant rework. Every transaction affects the cash ledger. Zerodha doesn't provide cash balance via API, so it would need to be inferred.

---

## Recommendation

**Option A (Infer deposits)** is the best balance of accuracy and implementation effort.

### Why not Option B?
- The Zerodha auto-sync sell price bug (uses `average_price` instead of actual sell price) means all historical sell P&L is wrong. Fixing this going forward is easy, but retroactive data is unrecoverable — we don't know the actual sell prices.
- FD maturity/renewal needs special handling that doesn't fit naturally.

### Why not Option C?
- Over-engineered for current needs. The app tracks long-term portfolio composition, not day-trading cash flows. A full cash ledger adds complexity (dividends, corporate actions, STT, brokerage fees) with diminishing returns.

### Implementation plan for Option A

#### Phase 1: Backend — Deposit transaction infrastructure
1. Create deposit transactions for existing holdings: one-time migration calculates `SUM(qty * avg_price)` per source and creates deposits dated at the earliest buy transaction date.
2. Create deposit transactions for existing FDs: one deposit per FD matching the principal, dated at `start_date`.
3. Modify Zerodha sync (`sync_holdings`): when a new holding is created, also create a `deposit` transaction for `qty * avg_price`. When an existing holding's quantity increases, create a deposit for the delta cost.
4. Modify FD creation router: auto-create a `deposit` transaction when an FD is added.

#### Phase 2: Backend — Fix lifetime gains formula
5. Change `get_lifetime_gains()` to use `SUM(amount) WHERE type = 'deposit'` instead of `holdings_cost + fd_principal`.
6. This matches the original PRD formula exactly.

#### Phase 3: Backend — Fix auto-sync sell price
7. In `sync_holdings()`, when quantity decreases, use `last_price` (current market price) as the sell price instead of `average_price`. This makes `realized_pnl` meaningful.

#### Phase 4: Frontend — Fix summary card
8. Use `total_invested` from the `/portfolio/lifetime-gains` API for the "Invested" field (instead of computing `total_value - total_pnl`).
9. Remove or clearly label the orphan percentage at bottom of card.
10. Decide whether "Unrealized P&L" should include FD interest or stay as holdings-only (with a label change).

#### Phase 5: Handle FD maturity edge cases
11. Cap FD value calculation at maturity date in `get_summary()`.
12. When an FD is deleted (matured and closed), if the user re-creates a new FD with the maturity amount, only create a deposit for the original principal portion (or let the user adjust).

---

## Open Questions

1. **Should the first-sync deposit be one lump sum or per-holding?** Per-holding is more auditable. Lump sum is cleaner.

2. **How to handle the "sell A, buy B" rebalancing double-counting?** When a user sells GOLDBETA and buys MOM100, the buy creates a deposit. But the capital didn't come from outside — it came from the sell. Options:
   - Let users manually delete/adjust auto-created deposits
   - Add a `source = 'rebalancing'` flag to exclude internal moves
   - Track whether there were sells on the same sync that could fund the buys, and net them

3. **Should deposits be editable?** Users might want to correct auto-inferred deposit amounts. The manual transaction CRUD already supports this.

4. **FD auto-renew scenario:** When an FD auto-renews with interest rolled into principal, the new FD has a higher principal. Should the system detect this and only create a deposit for the original principal? This requires linking old and new FDs, which doesn't exist today.

5. **XIRR calculation (future):** Once deposits are properly tracked with dates, XIRR (time-weighted annualized return) becomes possible. Worth designing the deposit data model with this in mind.
