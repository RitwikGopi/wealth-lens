# PRD: Retrospective Portfolio Snapshots for Fixed Deposits

## Problem Statement

When a user adds a Fixed Deposit with a past `start_date`, the Portfolio Growth chart remains empty because no historical snapshots exist. The existing `recalculate_fd_in_snapshots()` function only updates snapshots that already exist — it doesn't create new ones. This means FD-only users or users adding their first FD see no growth chart until the daily scheduler accumulates snapshots over many days.

## User Story

As a user who just added an FD with a start date 6 months ago, I want to immediately see the FD's compound interest growth on the Portfolio Growth chart, so I can visualize how my investment has grown.

## Proposed Solution

After creating (or updating) a Fixed Deposit, generate weekly historical snapshots from the earliest FD start_date to today for any dates that don't already have a snapshot. This fills in the growth chart retroactively.

### Behavior

1. After `create_fixed_deposit()` or `update_fixed_deposit()`, call a new function `backfill_fd_snapshots(db)`.
2. The function:
   - Finds the earliest `start_date` across all active FDs.
   - Generates one snapshot per week (every 7 days) from that date to yesterday.
   - Skips dates that already have a snapshot (respects unique constraint).
   - For each new snapshot: calculates FD values using existing `calculate_fd_current_value(..., as_of=date)`, sets `holdings_value=0` for dates before any holdings existed (or uses existing snapshot's holdings_value if one exists nearby).
   - Also runs the existing `recalculate_fd_in_snapshots()` after to ensure all snapshots are consistent.

### Granularity

- Daily snapshots — one per day from earliest FD start_date to yesterday.
- Consistent with the daily scheduler that creates one snapshot per day going forward.

### Edge Cases

- **Multiple FDs with different start dates:** Uses the earliest start_date across all FDs.
- **FD deleted:** Don't delete snapshots (they may contain holdings data). Just recalculate via existing `recalculate_fd_in_snapshots()`.
- **FD updated (dates changed):** Re-run backfill — new snapshots generated for the new date range, existing ones updated.
- **Snapshots already exist (e.g., from Kite backfill):** Skipped — no duplicates.
- **Holdings exist in some snapshots:** Their `holdings_value` is preserved; only `fd_value` and `total_value` are updated.

## Acceptance Criteria

1. Adding an FD with a past start_date immediately populates the growth chart.
2. Snapshots are generated weekly from earliest FD start_date to yesterday.
3. Existing snapshots are not duplicated or overwritten.
4. FD values at each date are calculated using compound interest formula.
5. Growth chart shows a smooth upward curve for cumulative FDs.
6. No impact on non-FD snapshots (holdings values preserved).

## Implementation

- Backend only — no frontend changes needed.
- New function in `portfolio_service.py`: `backfill_fd_snapshots(db)`.
- Called from `fixed_deposits.py` router after create/update (alongside existing `recalculate_fd_in_snapshots`).
