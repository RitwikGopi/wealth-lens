# PRD: Onboarding & Contextual Help

## Problem Statement

First-time users of the Portfolio Tracker have no guidance on how to set up and use the system. The app has complex features (Zerodha OAuth, allocation drift, lifetime gains, historical backfill) but no in-app help explaining what they are or how to use them. The existing empty dashboard shows a basic 3-step text block that disappears once data exists and provides no actionable links or tracking.

## User Stories

1. As a first-time user, I want a step-by-step checklist so I know what to set up and in what order.
2. As a user looking at financial metrics, I want to understand what terms like "Allocation Drift" and "Lifetime Gain" mean without leaving the page.
3. As a user on an empty page, I want clear guidance on why this feature matters and how to get started.

## Proposed Solution

Three components, all frontend-only (no new backend APIs):

### 1. Getting Started Checklist

A card on the dashboard that tracks setup progress. Persisted in `localStorage` so it survives page refreshes and can be dismissed permanently.

**Location:** Dashboard page, rendered above the existing content when visible.

**Steps:**

| # | Label | Completion Check | Link |
|---|-------|-----------------|------|
| 1 | Connect your Zerodha account | Checked when Zerodha config returns `connected: true` | `/settings` |
| 2 | Sync your holdings | Checked when holdings API returns `length > 0` with source `zerodha` | Inline sync button |
| 3 | Add Fixed Deposits | Checked when FD count > 0 | `/fixed-deposits` |
| 4 | Create tags to organize investments | Checked when tags count > 0 | `/tags` |
| 5 | Set up an allocation plan | Checked when plans count > 0 | `/allocations` |
| 6 | Record a deposit transaction | Checked when deposit transactions exist | `/transactions` |

**Behavior:**
- Auto-checks steps based on real data (fetched alongside existing dashboard data)
- User can manually dismiss the entire checklist via an "X" or "Dismiss" button
- Dismissal stored in `localStorage` key `onboarding_dismissed`
- Once dismissed, never shows again (unless localStorage is cleared)
- Each incomplete step has a brief helper line and a link/button to the relevant page

**UI:**
- Card component matching existing dashboard card style
- Checklist with checkboxes (read-only, auto-computed)
- Completed steps show with strikethrough or muted styling
- Progress indicator: "3 of 6 complete"

### 2. Contextual Help Tooltips

Add `(i)` info icons next to key financial terms throughout the app. On click/hover, show a popover with a plain-English explanation.

**Tooltips to add:**

| Location | Term | Explanation |
|----------|------|-------------|
| Dashboard summary card | Lifetime Gain | "Total profit across your entire investment journey. Formula: Current Value + Withdrawals - Deposits" |
| Dashboard summary card | Unrealized P&L | "Profit/loss on holdings you still own. This changes with market prices." |
| Allocations page | Allocation Drift | "How far your actual investment mix has drifted from your target percentages." |
| Holdings page header | Source: Zerodha | "Holdings synced automatically from your Zerodha account via Kite API." |
| Settings - Historical Import | Historical Backfill | "Populate your growth chart with past data. In Kite web: open DevTools → Network tab → find the portfolio API call → copy the JSON response." |
| Fixed Deposits summary | Accrued Interest | "Interest earned so far, calculated using compound interest based on your FD terms." |
| Transactions summary | Net Invested | "Total deposits minus total withdrawals. This is the actual money you've put in." |

**Implementation:** Use the existing `Popover` + `Info` icon pattern already established in `portfolio-summary-card.tsx`.

### 3. Enhanced Empty States

Improve existing empty state messages with:
- A one-line "why this matters" explanation
- Better action buttons (already mostly present)
- Where applicable, an expandable "Learn more" hint

**Pages to enhance:**

| Page | Current Message | Enhanced Message |
|------|----------------|-----------------|
| Holdings | "No holdings yet" | "No holdings yet. Track your stocks, ETFs, and mutual funds — synced from Zerodha or added manually." |
| Tags | "No tags created yet" | "No tags yet. Tags let you categorize investments (e.g., Equity, Debt, Gold) to track allocation." |
| Allocations | "No allocation plans yet" | "No allocation plans yet. Set target percentages for each category and track how your portfolio drifts over time." |
| Fixed Deposits | "No fixed deposits yet" | "No fixed deposits yet. Add your FDs to track maturity dates and see accrued interest in real-time." |
| Transactions | (table just empty) | "No transactions recorded. Transactions track deposits, withdrawals, buys, sells, and dividends for lifetime gain calculations." |

## Edge Cases

- **Returning user clears localStorage:** Checklist reappears but auto-checks all completed steps → user sees "6/6 complete" and can dismiss immediately.
- **User hasn't connected Zerodha but added manual holdings:** Step 1 remains unchecked, step 2 checks based on any holdings existing (not just Zerodha source). Actually — step 2 should check for *any* holdings, since manual-only users should also pass.
- **Slow API responses on dashboard:** Checklist shows skeleton/loading state while data fetches, same as existing dashboard behavior.

## Acceptance Criteria

1. Dashboard shows Getting Started checklist for new users (no `onboarding_dismissed` in localStorage)
2. Checklist steps auto-check based on real API data
3. Checklist can be permanently dismissed
4. Progress indicator shows "X of 6 complete"
5. Each step links to the relevant page
6. Info tooltips appear on all listed terms with correct explanations
7. Empty states on all 5 pages show enhanced messages
8. All changes are frontend-only — no backend modifications needed
9. Matches existing design patterns (Card, Popover, Info icon, etc.)

## Out of Scope

- Backend API for persisting onboarding state (localStorage is sufficient for a personal app)
- Video tutorials
- Standalone help/docs page
- Guided tour / overlay walkthrough
