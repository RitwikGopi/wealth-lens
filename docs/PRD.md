# Portfolio Tracking App - Product Requirements Document (PRD)

**Version**: 1.0 (MVP)
**Date**: 2026-02-10
**Author**: Product Manager

---

## 1. Product Vision

A simple, self-hosted personal portfolio tracking application that aggregates investment holdings from Zerodha with manually entered investments (FDs, other assets), provides a hierarchical tagging system for categorization, tracks transactions, supports rebalancing operations, and visualizes portfolio growth and allocation planning.

The app is designed for a single user (the portfolio owner) and intended to be open-sourced so others can self-host and adapt it.

### 1.1 Problem Statement

Individual investors using Zerodha alongside other investment vehicles (fixed deposits, gold, etc.) lack a unified view of their entire portfolio. Existing tools either focus solely on broker-linked equities or require expensive subscriptions. There is no simple, self-hostable solution that lets a user:

- See all investments in one place
- Categorize them with flexible, hierarchical tags
- Plan and track asset allocation against targets
- Record and visualize portfolio growth over time

### 1.2 Target User

A single individual investor who:
- Uses Zerodha as their primary broker
- Has other investments (FDs, gold, etc.) outside Zerodha
- Wants a unified portfolio view with allocation planning
- Is comfortable self-hosting a web application

---

## 2. MVP Scope

### 2.1 Features IN Scope

| # | Feature | Priority |
|---|---------|----------|
| F1 | Zerodha integration to fetch and display holdings | P0 |
| F2 | Hierarchical tagging system for investments | P0 |
| F3 | Manual FD entry with interest calculation | P0 |
| F4 | Other manual investment entries | P0 |
| F5 | Transaction recording (deposits, withdrawals, investments) | P0 |
| F6 | Rebalancing operation tracking | P1 |
| F7 | Portfolio growth visualization | P1 |
| F8 | Allocation planning (planned vs actual by tag groups) | P1 |

### 2.2 Features EXPLICITLY Out of MVP Scope

| Feature | Reason |
|---------|--------|
| Multi-user support | MVP is single-user; no auth/user management needed |
| Other broker integrations | Only Zerodha for MVP; architecture should allow future brokers |
| Tax calculation | Complex regulatory domain; defer to post-MVP |
| Real-time price streaming | Periodic refresh is sufficient for portfolio tracking |
| Mobile app | Web-only for MVP; responsive design is acceptable |
| Notifications/alerts | No price alerts, rebalancing reminders, or maturity notifications |
| Automated transaction import | Transactions are manually entered in MVP |
| PDF/CSV export | Defer to post-MVP |
| Goal-based planning | Defer to post-MVP |
| Benchmarking against indices | Defer to post-MVP |

---

## 3. User Stories and Acceptance Criteria

### F1: Zerodha Integration

#### US-1.1: Connect Zerodha Account
**As a** user, **I want to** connect my Zerodha account via API credentials, **so that** I can automatically fetch my holdings.

**Acceptance Criteria:**
- User can enter Zerodha API key and API secret on a settings page
- The app stores these credentials securely (encrypted at rest)
- User can initiate the Kite Connect login flow (redirect to Zerodha, get request token, exchange for access token)
- Access token is stored and used for subsequent API calls
- User can see connection status (connected/disconnected) on the settings page
- User can disconnect (remove credentials) at any time

#### US-1.2: Fetch and Display Zerodha Holdings
**As a** user, **I want to** see my current Zerodha holdings, **so that** I can track my broker-linked investments.

**Acceptance Criteria:**
- A "Sync Holdings" action fetches the latest holdings from Zerodha Kite API
- Holdings are displayed in a table with columns: Trading Symbol, Exchange, Quantity, Average Price, Last Price, Current Value, Day P&L, Total P&L, P&L %
- Last synced timestamp is displayed
- If API call fails (e.g., expired token), a clear error message is shown with a prompt to re-authenticate
- Holdings data is persisted locally so the app works even when Zerodha API is unavailable
- Each holding row shows its assigned tags (if any)

#### US-1.3: Refresh Holdings
**As a** user, **I want to** refresh my holdings on demand, **so that** I see up-to-date values.

**Acceptance Criteria:**
- A "Refresh" button triggers a fresh API call to Zerodha
- The display updates with new prices and values
- The last synced timestamp updates
- If a holding previously existed but is no longer in the API response (fully sold), it is removed from the active holdings list (but historical records in transactions are preserved)

---

### F2: Hierarchical Tagging System

#### US-2.1: Create Tags with Hierarchy
**As a** user, **I want to** create tags organized in a hierarchy, **so that** I can categorize investments at multiple levels.

**Acceptance Criteria:**
- User can create a top-level tag (e.g., "Equity", "Debt", "Gold", "Real Estate")
- User can create child tags under a parent (e.g., "Equity > NIFTY50", "Equity > NEXT50", "Equity > MOM100", "Debt > FD", "Debt > Bonds")
- Tags can be nested to at least 3 levels (e.g., "Equity > Index > NIFTY50")
- Each tag has a name and an optional color for display purposes
- Tag names must be unique within the same parent
- User can rename, re-parent, or delete tags
- Deleting a parent tag prompts to either delete or re-parent children
- Tags are displayed as a tree in the tag management UI

#### US-2.2: Assign Tags to Investments
**As a** user, **I want to** assign one or more tags to any investment, **so that** I can categorize and filter my portfolio.

**Acceptance Criteria:**
- Each investment (Zerodha holding, FD, or manual entry) can be assigned one or more tags
- Tags can be assigned/removed from the investment detail view
- Tags are shown as chips/badges on holdings list rows
- User can filter the holdings view by tag (show only investments with a specific tag)
- When filtering by a parent tag, investments tagged with any child tag are also included
- Bulk tag assignment: user can select multiple investments and assign a tag to all of them

---

### F3: Manual FD Entry with Interest Calculation

#### US-3.1: Add a Fixed Deposit
**As a** user, **I want to** manually add FD details, **so that** FDs appear in my unified portfolio.

**Acceptance Criteria:**
- User can add an FD with the following fields:
  - Bank/Institution name (required)
  - FD number/reference (optional)
  - Principal amount (required, positive number)
  - Interest rate (required, annual percentage)
  - Compounding frequency (quarterly, half-yearly, yearly, or on maturity)
  - Start date (required)
  - Maturity date (required, must be after start date)
  - Auto-renewal (yes/no)
  - Notes (optional free text)
- User can edit any FD detail after creation
- User can delete an FD (with confirmation)
- FDs appear in the unified holdings list alongside Zerodha holdings

#### US-3.2: FD Interest Calculation
**As a** user, **I want to** see the current value of my FDs with accrued interest, **so that** I know what each FD is worth today.

**Acceptance Criteria:**
- Current value is calculated based on: principal, interest rate, compounding frequency, and time elapsed since start date
- For quarterly compounding: A = P(1 + r/4)^(4t) where t is time in years
- For half-yearly: A = P(1 + r/2)^(2t)
- For yearly: A = P(1 + r)^t
- For on-maturity (simple interest during term): A = P(1 + r*t)
- If current date is past maturity date and auto-renewal is off, current value = maturity value (no further interest)
- If auto-renewal is on and past maturity, calculate as if a new FD started at maturity date with the same terms
- Interest earned (current value - principal) is displayed alongside current value
- Maturity value (value at maturity date) is shown

#### US-3.3: FD Maturity Status
**As a** user, **I want to** see which FDs are maturing soon or have matured, **so that** I can take action.

**Acceptance Criteria:**
- Each FD shows a status: Active, Maturing Soon (within 30 days), Matured
- FDs can be sorted/filtered by status
- Matured FDs without auto-renewal are visually distinct (e.g., highlighted or badged)

---

### F4: Other Manual Investment Entries

#### US-4.1: Add Manual Investment
**As a** user, **I want to** add non-Zerodha, non-FD investments, **so that** my portfolio view is complete.

**Acceptance Criteria:**
- User can add a manual investment with:
  - Name (required, e.g., "Sovereign Gold Bond 2024", "PPF")
  - Type (required, dropdown: Gold, Bond, PPF, NPS, Real Estate, Crypto, Other)
  - Purchase date (required)
  - Purchase price / cost basis (required)
  - Quantity (required, default 1; supports fractional for gold grams etc.)
  - Current value per unit (required; user-entered, manually updated)
  - Currency (INR, default)
  - Notes (optional)
- Current total value = quantity * current value per unit
- User can edit the "current value per unit" field at any time to reflect manual valuation
- User can delete a manual investment (with confirmation)
- Manual investments appear in the unified holdings list

#### US-4.2: Update Manual Investment Value
**As a** user, **I want to** update the current value of manual investments, **so that** my portfolio reflects current market conditions.

**Acceptance Criteria:**
- Each manual investment has an "Update Value" action
- User enters the new current value per unit and the date of valuation
- Historical valuations are stored (so growth can be charted)
- The last updated date is shown on the investment row

---

### F5: Transaction Recording

#### US-5.1: Record a Transaction
**As a** user, **I want to** record financial transactions, **so that** I can track money flow into and out of my portfolio.

**Acceptance Criteria:**
- User can create a transaction with:
  - Date (required, defaults to today)
  - Type (required): Deposit, Withdrawal, Investment, Redemption, Dividend, Interest
  - Amount (required, positive number)
  - Description (optional)
  - Linked investment (optional; links to a specific holding, FD, or manual investment)
  - Tags (optional; one or more tags)
- Transactions are stored and displayed in a chronological list
- User can filter transactions by: date range, type, linked investment, tag
- User can edit or delete a transaction (with confirmation)

#### US-5.2: Transaction Summary
**As a** user, **I want to** see a summary of my transactions, **so that** I understand my cash flow.

**Acceptance Criteria:**
- Summary view shows: total deposited, total withdrawn, total invested, total redeemed, net invested (deposited - withdrawn)
- Summary can be filtered by date range
- Monthly breakdown table showing deposits, withdrawals, and net for each month

---

### F6: Rebalancing Operation Tracking

#### US-6.1: Create a Rebalancing Operation
**As a** user, **I want to** record a rebalancing operation, **so that** I can track portfolio adjustments as a single logical event.

**Acceptance Criteria:**
- User can create a rebalancing operation with:
  - Date (required)
  - Name/description (required, e.g., "Q1 2026 Rebalance")
  - Notes (optional)
- A rebalancing operation is a container for multiple related transactions
- User can add individual "moves" to a rebalancing operation:
  - Sell action: investment being sold/redeemed, quantity/amount
  - Buy action: investment being bought, quantity/amount
- Each move auto-creates the corresponding transaction records
- User can view the rebalancing operation as a summary: what was sold, what was bought, net effect

#### US-6.2: View Rebalancing History
**As a** user, **I want to** see past rebalancing operations, **so that** I can review my portfolio adjustment history.

**Acceptance Criteria:**
- List of all rebalancing operations sorted by date (most recent first)
- Each operation shows: date, name, number of moves, total sell value, total buy value
- Clicking an operation shows the detailed list of moves
- Operations can be filtered by date range

---

### F7: Portfolio Growth Visualization

#### US-7.1: Portfolio Value Over Time Chart
**As a** user, **I want to** see a chart of my portfolio value over time, **so that** I can visualize growth.

**Acceptance Criteria:**
- A line chart shows total portfolio value over time
- Data points are generated from: periodic Zerodha holding snapshots, FD calculated values at each point, manual investment valuations
- Time range selector: 1M, 3M, 6M, 1Y, 3Y, 5Y, All
- The chart shows the total portfolio value line
- Hovering/clicking a data point shows the exact value and date
- Portfolio value snapshots are taken/calculated daily (or on each sync)

#### US-7.2: Portfolio Breakdown View
**As a** user, **I want to** see my portfolio broken down by tags, **so that** I understand my asset allocation.

**Acceptance Criteria:**
- A pie/donut chart shows allocation by top-level tag (e.g., Equity 60%, Debt 30%, Gold 10%)
- A table below shows each tag with: total value, percentage of portfolio, number of investments
- Clicking a top-level tag drills down to show child tag breakdown
- Untagged investments are shown as a separate "Untagged" category

---

### F8: Allocation Planning

#### US-8.1: Define Target Allocation
**As a** user, **I want to** set target allocation percentages for tag groups, **so that** I can plan my ideal portfolio distribution.

**Acceptance Criteria:**
- User can create an allocation plan
- For each top-level tag, user sets a target percentage (all must sum to 100%)
- For child tags within a parent, user can optionally set sub-allocation percentages (must sum to 100% of parent's allocation)
- Example:
  - Equity: 60% target
    - NIFTY50: 50% of Equity (= 30% of total)
    - NEXT50: 30% of Equity (= 18% of total)
    - MOM100: 20% of Equity (= 12% of total)
  - Debt: 30% target
    - FD: 70% of Debt (= 21% of total)
    - Bonds: 30% of Debt (= 9% of total)
  - Gold: 10% target
- User can edit target percentages at any time
- Validation ensures percentages sum to 100% at each level

#### US-8.2: Planned vs Actual Allocation View
**As a** user, **I want to** compare my actual allocation against my plan, **so that** I know where I need to rebalance.

**Acceptance Criteria:**
- A side-by-side or overlay view shows:
  - Target % for each tag
  - Actual % for each tag (computed from current portfolio values)
  - Deviation (actual - target) as both percentage points and absolute value (INR)
- Deviations beyond a threshold (e.g., +/- 5 percentage points) are highlighted
- At each hierarchy level, the comparison is shown
- A summary shows the total amount that needs to move to achieve target allocation
- This view updates automatically when portfolio values change

---

## 4. Data Model Overview

### 4.1 Core Entities

```
User Settings
  - zerodha_api_key (encrypted)
  - zerodha_api_secret (encrypted)
  - zerodha_access_token (encrypted)
  - last_zerodha_sync timestamp

Tag
  - id (PK)
  - name
  - color (optional)
  - parent_tag_id (FK, nullable - for hierarchy)
  - created_at
  - updated_at

Holding (Zerodha-sourced)
  - id (PK)
  - trading_symbol
  - exchange
  - isin
  - quantity
  - average_price
  - last_price
  - pnl
  - last_synced_at
  - created_at
  - updated_at

FixedDeposit
  - id (PK)
  - bank_name
  - fd_reference (optional)
  - principal
  - interest_rate
  - compounding_frequency (enum: quarterly, half_yearly, yearly, on_maturity)
  - start_date
  - maturity_date
  - auto_renewal (boolean)
  - notes (optional)
  - created_at
  - updated_at

ManualInvestment
  - id (PK)
  - name
  - type (enum: gold, bond, ppf, nps, real_estate, crypto, other)
  - purchase_date
  - purchase_price
  - quantity
  - current_value_per_unit
  - last_valued_at
  - notes (optional)
  - created_at
  - updated_at

ManualInvestmentValuation (historical values)
  - id (PK)
  - manual_investment_id (FK)
  - value_per_unit
  - valued_at (date)
  - created_at

InvestmentTag (join table)
  - id (PK)
  - tag_id (FK)
  - investment_type (enum: holding, fd, manual)
  - investment_id
  - created_at

Transaction
  - id (PK)
  - date
  - type (enum: deposit, withdrawal, investment, redemption, dividend, interest)
  - amount
  - description (optional)
  - linked_investment_type (enum, nullable)
  - linked_investment_id (nullable)
  - rebalancing_operation_id (FK, nullable)
  - created_at
  - updated_at

TransactionTag (join table)
  - id (PK)
  - transaction_id (FK)
  - tag_id (FK)

RebalancingOperation
  - id (PK)
  - date
  - name
  - notes (optional)
  - created_at
  - updated_at

PortfolioSnapshot (for growth chart)
  - id (PK)
  - date
  - total_value
  - zerodha_value
  - fd_value
  - manual_investment_value
  - snapshot_data (JSON - detailed breakdown)
  - created_at

AllocationPlan
  - id (PK)
  - name (e.g., "My Target Allocation")
  - is_active (boolean)
  - created_at
  - updated_at

AllocationTarget
  - id (PK)
  - allocation_plan_id (FK)
  - tag_id (FK)
  - target_percentage
  - created_at
  - updated_at
```

### 4.2 Key Relationships

- **Tag** has a self-referential parent relationship (tree structure)
- **InvestmentTag** is a polymorphic join table linking tags to Holdings, FDs, or ManualInvestments
- **Transaction** can optionally link to any investment type and optionally belong to a RebalancingOperation
- **PortfolioSnapshot** stores periodic portfolio value snapshots for the growth chart
- **AllocationTarget** links tags to target percentages within an AllocationPlan

---

## 5. Non-Functional Requirements

### 5.1 Performance
- Holdings page should load within 2 seconds (excluding Zerodha API sync time)
- Portfolio growth chart should render within 3 seconds for up to 5 years of daily data
- All CRUD operations should complete within 500ms

### 5.2 Security
- Zerodha API credentials stored encrypted at rest
- No sensitive data in client-side local storage
- HTTPS for all communication (expected to run behind a reverse proxy)
- No user authentication in MVP (single-user; network-level access control assumed)

### 5.3 Data Integrity
- All financial amounts stored with 2 decimal precision
- Quantities support up to 6 decimal places (for fractional units like gold grams)
- Interest rate stored as percentage with up to 3 decimal places
- All dates stored in ISO 8601 format
- Database transactions for multi-step operations (e.g., rebalancing moves)

### 5.4 Usability
- Responsive web design (usable on tablet and desktop browsers)
- Clear error messages for validation failures and API errors
- Confirmation dialogs for destructive actions (delete)

---

## 6. Assumptions and Dependencies

### 6.1 Assumptions
- User has a valid Zerodha account with Kite Connect API access
- User will manually update values for manual investments
- Application runs on a single machine (no distributed deployment)
- Daily portfolio snapshots are sufficient (no intraday tracking)

### 6.2 External Dependencies
- **Zerodha Kite Connect API**: For fetching holdings. Requires API subscription from Zerodha. Rate limits apply.
- The app should gracefully handle Zerodha API downtime by showing last-synced data.

---

## 7. Success Metrics (MVP)

- User can see 100% of their investments (Zerodha + manual) in a single view
- All FDs show accurate calculated current values (within 1 INR of manual calculation)
- Allocation plan vs actual deviation is clearly visible and accurate
- Portfolio growth chart renders historical data correctly
- All CRUD operations work without data loss

---

## 8. Glossary

| Term | Definition |
|------|-----------|
| Holding | An equity/mutual fund position from Zerodha |
| FD | Fixed Deposit - a bank deposit with guaranteed interest |
| Manual Investment | Any investment not from Zerodha and not an FD (gold, bonds, PPF, etc.) |
| Tag | A label assigned to investments for categorization; supports hierarchy |
| Allocation Plan | A set of target percentages for each tag group |
| Rebalancing | The act of selling/buying investments to match target allocation |
| Portfolio Snapshot | A point-in-time record of total portfolio value for charting |
