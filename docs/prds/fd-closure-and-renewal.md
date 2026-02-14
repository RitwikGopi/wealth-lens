# PRD: FD Closure & Renewal

## Problem Statement

When an FD matures or a user wants to close early, there's no proper workflow. Matured FDs silently disappear from portfolio value, deleting an FD doesn't record a withdrawal transaction (breaking lifetime gains), and there's no way to renew an FD.

## User Stories

1. As a user whose FD matured, I want to close it and record the payout so my lifetime gains are accurate.
2. As a user who needs cash, I want to close an FD early and record the actual amount received (after penalty).
3. As a user renewing an FD, I want a single action that closes the old FD and creates a new one with the accumulated principal.

## Design Decisions

- **Premature penalty**: User enters actual amount received (flexible for different bank policies).
- **Renewal**: Single action — atomically closes old FD + creates new one.
- **Auto-renewal scheduler**: Deferred — `auto_renew` remains a display flag only.

## Solution

### Backend

**Model** — 3 new columns on `fixed_deposits`:
- `status` (String, NOT NULL, default "active") — "active" or "closed"
- `closure_date` (Date, nullable)
- `closure_amount` (Float, nullable)

**API Endpoints**:
- `POST /fixed-deposits/{id}/close` — closes FD, creates withdrawal transaction
- `POST /fixed-deposits/{id}/renew` — closes old FD + creates new FD atomically
- `GET /fixed-deposits?status=active|closed` — filter by status

**Portfolio Value Fix**:
- Closed FDs excluded from portfolio value after closure_date
- Matured-but-not-closed FDs show at maturity value (capped, not excluded)

### Frontend

- Close dialog: closure_date, closure_amount, premature checkbox, notes
- Renew dialog: new terms pre-filled from old FD, new_maturity_date required
- Detail page: Close/Renew/Edit buttons hidden when closed; Closure Details card shown
- List page: Status filter tabs (All/Active/Closed); summary cards use active FDs only

## Acceptance Criteria

1. Closing an FD sets status="closed" and creates a withdrawal transaction.
2. Closing an already-closed FD returns 400.
3. Renewing creates a new FD with principal = old FD's maturity amount by default.
4. Closed FDs are excluded from portfolio value; matured-but-not-closed show at maturity value.
5. Growth chart reflects closure (value drops to 0 after closure_date for that FD).
6. Frontend shows Close/Renew buttons only on active FDs.
7. Closure Details card visible on closed FD detail page.
