# Portfolio Tracking App - Architecture Document

## 1. Overview

A personal portfolio tracking application that aggregates investment holdings (via Zerodha), fixed deposits, and other assets into a single dashboard. Supports hierarchical tagging, target allocation planning, and historical portfolio tracking.

This is a single-user, personal-use application designed for simplicity and ease of self-hosting.

---

## 2. Tech Stack

### Backend
| Component | Choice | Rationale |
|---|---|---|
| Language | Python 3.11+ | Rich financial ecosystem, Zerodha SDK support |
| Framework | FastAPI | Async-ready, auto-generated OpenAPI docs, type-safe with Pydantic |
| ORM | SQLAlchemy 2.0 | Mature, well-documented, supports SQLite natively |
| Migrations | Alembic | Standard companion to SQLAlchemy |
| Database | SQLite | Zero-config, single-file, perfect for personal use |
| Zerodha SDK | kiteconnect | Official Python SDK for Zerodha Kite API |
| Package Mgmt | pip + venv | Simple, no extra tooling needed |

### Frontend
| Component | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14+ (App Router) | Server components, file-based routing, excellent DX |
| Language | TypeScript | Type safety across the frontend |
| Styling | Tailwind CSS | Utility-first, fast iteration |
| UI Components | shadcn/ui | Copy-paste components, no vendor lock-in, Tailwind-native |
| Charts | Recharts | React-native charting, good for financial data |
| Package Mgmt | npm | Standard Node.js package manager |

### Communication
- Frontend communicates with backend via REST API (JSON)
- Backend serves API on `localhost:8998`
- Frontend dev server on `localhost:3333`, proxied to backend

### Authentication
- Simple API key or environment-based token for personal use
- No OAuth/SSO complexity needed - single user app
- Backend checks `X-API-Key` header or allows unauthenticated local access (configurable)

---

## 3. Database Schema

SQLite database file stored at `backend/portfolio.db`.

### 3.1 `holdings`

Tracks investment holdings - stocks, mutual funds, ETFs. Populated from Zerodha sync or manual entry.

```sql
CREATE TABLE holdings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol          TEXT NOT NULL,                       -- e.g., "INFY", "NIFTYBEES"
    exchange        TEXT NOT NULL DEFAULT 'NSE',         -- NSE, BSE
    instrument_type TEXT NOT NULL DEFAULT 'EQ',          -- EQ, MF, ETF
    quantity        REAL NOT NULL,                       -- supports fractional (MF units)
    average_price   REAL NOT NULL,                       -- weighted average buy price
    current_price   REAL,                                -- last fetched market price
    current_value   REAL,                                -- quantity * current_price
    pnl             REAL,                                -- current_value - (quantity * average_price)
    source          TEXT NOT NULL DEFAULT 'manual',      -- 'zerodha' or 'manual'
    zerodha_trading_symbol TEXT,                         -- raw symbol from Zerodha API
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_holdings_symbol ON holdings(symbol);
CREATE INDEX idx_holdings_source ON holdings(source);
```

### 3.2 `fixed_deposits`

Tracks fixed deposit investments with interest calculation parameters.

```sql
CREATE TABLE fixed_deposits (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_name           TEXT NOT NULL,                   -- e.g., "SBI", "HDFC"
    principal           REAL NOT NULL,                   -- deposited amount
    interest_rate       REAL NOT NULL,                   -- annual rate as percentage (e.g., 7.5)
    compounding_frequency TEXT NOT NULL DEFAULT 'quarterly', -- monthly, quarterly, half_yearly, yearly
    start_date          DATE NOT NULL,
    maturity_date       DATE NOT NULL,
    maturity_amount     REAL,                            -- pre-calculated or user-entered
    current_value       REAL,                            -- accrued value as of last calculation
    is_cumulative       BOOLEAN NOT NULL DEFAULT 1,      -- 1 = cumulative, 0 = non-cumulative (pay interest)
    interest_payout_freq TEXT,                           -- for non-cumulative: monthly, quarterly, etc.
    auto_renew          BOOLEAN NOT NULL DEFAULT 0,
    notes               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fd_bank ON fixed_deposits(bank_name);
CREATE INDEX idx_fd_maturity ON fixed_deposits(maturity_date);
```

### 3.3 `transactions`

Records all financial transactions for audit trail and history.

```sql
CREATE TABLE transactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    type            TEXT NOT NULL,                       -- 'deposit', 'withdrawal', 'buy', 'sell', 'dividend', 'interest', 'fd_open', 'fd_close', 'rebalance'
    holding_id      INTEGER,                             -- FK to holdings (nullable for FD/cash transactions)
    fd_id           INTEGER,                             -- FK to fixed_deposits (nullable)
    amount          REAL NOT NULL,                       -- transaction amount in INR
    quantity        REAL,                                -- number of units (for buy/sell)
    price           REAL,                                -- price per unit (for buy/sell)
    date            DATE NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (holding_id) REFERENCES holdings(id) ON DELETE SET NULL,
    FOREIGN KEY (fd_id) REFERENCES fixed_deposits(id) ON DELETE SET NULL
);

CREATE INDEX idx_txn_type ON transactions(type);
CREATE INDEX idx_txn_date ON transactions(date);
CREATE INDEX idx_txn_holding ON transactions(holding_id);
CREATE INDEX idx_txn_fd ON transactions(fd_id);
```

### 3.4 `tags`

Hierarchical tagging system. Tags can nest (e.g., Equity > Large Cap > IT Sector).

```sql
CREATE TABLE tags (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    parent_id   INTEGER,                                -- self-referencing for hierarchy
    description TEXT,
    color       TEXT,                                    -- hex color for UI display (e.g., "#3B82F6")
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (parent_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(name, parent_id)                             -- unique name within same parent
);

CREATE INDEX idx_tags_parent ON tags(parent_id);
```

### 3.5 `holding_tags`

Many-to-many junction between holdings/FDs and tags.

```sql
CREATE TABLE holding_tags (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_id      INTEGER NOT NULL,
    holding_id  INTEGER,                                 -- FK to holdings (one of holding_id or fd_id must be set)
    fd_id       INTEGER,                                 -- FK to fixed_deposits

    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    FOREIGN KEY (holding_id) REFERENCES holdings(id) ON DELETE CASCADE,
    FOREIGN KEY (fd_id) REFERENCES fixed_deposits(id) ON DELETE CASCADE,

    CHECK (
        (holding_id IS NOT NULL AND fd_id IS NULL) OR
        (holding_id IS NULL AND fd_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX idx_ht_tag_holding ON holding_tags(tag_id, holding_id) WHERE holding_id IS NOT NULL;
CREATE UNIQUE INDEX idx_ht_tag_fd ON holding_tags(tag_id, fd_id) WHERE fd_id IS NOT NULL;
```

### 3.6 `allocation_targets`

Target allocation percentages per tag. Supports hierarchical allocation (e.g., Equity=60%, within Equity: Large Cap=40%, Mid Cap=30%, Small Cap=30%).

```sql
CREATE TABLE allocation_targets (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_id          INTEGER NOT NULL UNIQUE,             -- one target per tag
    target_pct      REAL NOT NULL,                       -- target percentage (e.g., 60.0 for 60%)
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

### 3.7 `portfolio_snapshots`

Daily or on-demand snapshots of total portfolio value for historical tracking.

```sql
CREATE TABLE portfolio_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    date            DATE NOT NULL UNIQUE,
    total_value     REAL NOT NULL,                       -- total portfolio value
    holdings_value  REAL NOT NULL,                       -- sum of all holdings current_value
    fd_value        REAL NOT NULL,                       -- sum of all FDs current_value
    breakdown       TEXT,                                -- JSON blob: per-tag breakdown
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_snapshot_date ON portfolio_snapshots(date);
```

### 3.8 `zerodha_config`

Stores Zerodha API credentials and session tokens.

```sql
CREATE TABLE zerodha_config (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key         TEXT NOT NULL,
    api_secret      TEXT NOT NULL,
    access_token    TEXT,                                -- session token (expires daily)
    request_token   TEXT,                                -- used during login flow
    token_expiry    TIMESTAMP,
    last_sync_at    TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Entity Relationship Summary

```
tags (self-referencing: parent_id -> id)
  |
  |-- allocation_targets (1:1 tag -> target)
  |
  |-- holding_tags (M:N junction)
       |
       |-- holdings
       |-- fixed_deposits

holdings --> transactions (1:N)
fixed_deposits --> transactions (1:N)

portfolio_snapshots (standalone, daily records)
zerodha_config (standalone, singleton)
```

---

## 4. API Endpoints

Base URL: `http://localhost:8998/api/v1`

### 4.1 Holdings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/holdings` | List all holdings (query params: `source`, `instrument_type`, `tag_id`) |
| GET | `/holdings/{id}` | Get single holding with tags |
| POST | `/holdings` | Create manual holding |
| PUT | `/holdings/{id}` | Update holding details |
| DELETE | `/holdings/{id}` | Delete holding |
| POST | `/holdings/{id}/tags` | Add tags to a holding (body: `{ "tag_ids": [1, 2] }`) |
| DELETE | `/holdings/{id}/tags/{tag_id}` | Remove tag from holding |

### 4.2 Fixed Deposits

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/fixed-deposits` | List all FDs (query params: `bank_name`, `tag_id`) |
| GET | `/fixed-deposits/{id}` | Get single FD with tags and accrued value |
| POST | `/fixed-deposits` | Create FD |
| PUT | `/fixed-deposits/{id}` | Update FD details |
| DELETE | `/fixed-deposits/{id}` | Delete FD |
| POST | `/fixed-deposits/{id}/tags` | Add tags to an FD |
| DELETE | `/fixed-deposits/{id}/tags/{tag_id}` | Remove tag from FD |

### 4.3 Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transactions` | List transactions (query params: `type`, `holding_id`, `fd_id`, `date_from`, `date_to`, `limit`, `offset`) |
| GET | `/transactions/{id}` | Get single transaction |
| POST | `/transactions` | Record a transaction |
| PUT | `/transactions/{id}` | Update transaction |
| DELETE | `/transactions/{id}` | Delete transaction |

### 4.4 Tags

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tags` | List all tags as flat list (query param: `root_only=true` for top-level) |
| GET | `/tags/tree` | Get full tag hierarchy as nested tree |
| GET | `/tags/{id}` | Get tag with children and allocation target |
| POST | `/tags` | Create tag (body includes optional `parent_id`) |
| PUT | `/tags/{id}` | Update tag |
| DELETE | `/tags/{id}` | Delete tag (cascades to children) |

### 4.5 Allocation Targets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/allocations` | List all allocation targets with current vs target comparison |
| GET | `/allocations/{tag_id}` | Get allocation for a specific tag |
| PUT | `/allocations/{tag_id}` | Set/update target percentage for a tag |
| DELETE | `/allocations/{tag_id}` | Remove allocation target |
| GET | `/allocations/drift` | Get allocation drift report (current% vs target% for all tags) |

### 4.6 Portfolio

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/portfolio/summary` | Current portfolio summary (total value, breakdown by asset type) |
| GET | `/portfolio/snapshots` | Historical snapshots (query params: `date_from`, `date_to`) |
| POST | `/portfolio/snapshots` | Take a snapshot now |
| GET | `/portfolio/performance` | Portfolio performance metrics (returns, XIRR) |

### 4.7 Zerodha Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/zerodha/config` | Get Zerodha config status (connected, last sync) |
| PUT | `/zerodha/config` | Save/update API key and secret |
| GET | `/zerodha/login-url` | Get Zerodha login URL for OAuth flow |
| POST | `/zerodha/callback` | Handle OAuth callback with request_token |
| POST | `/zerodha/sync` | Sync holdings from Zerodha |
| GET | `/zerodha/prices` | Fetch latest prices for all Zerodha holdings |

### 4.8 Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check endpoint |

---

## 5. Key Business Logic

### 5.1 FD Current Value Calculation

For cumulative FDs, the accrued value at any point is calculated using compound interest:

```
A = P * (1 + r/n)^(n*t)
```

Where:
- `P` = principal
- `r` = annual interest rate (as decimal)
- `n` = compounding frequency per year (12=monthly, 4=quarterly, 2=half-yearly, 1=yearly)
- `t` = time elapsed in years (fractional)

This calculation runs on-demand when FD data is requested.

### 5.2 Portfolio Value

Total portfolio value = sum of:
- All holdings `current_value` (quantity * current_price)
- All FDs `current_value` (accrued compound interest)

### 5.3 Allocation Drift

For each tag with a target allocation:
1. Sum the `current_value` of all holdings and FDs tagged with that tag (or its children)
2. Calculate `current_pct = tag_value / total_portfolio_value * 100`
3. Drift = `current_pct - target_pct`

Child tag allocations are relative to their parent. For example:
- Tag "Equity" target = 60% of total portfolio
- Tag "Large Cap" (child of Equity) target = 40% of Equity allocation

### 5.4 Zerodha Sync Flow

1. User saves API key + secret via `/zerodha/config`
2. User visits login URL from `/zerodha/login-url` and authenticates on Zerodha
3. Zerodha redirects back with `request_token`
4. Backend exchanges `request_token` for `access_token` via `/zerodha/callback`
5. `/zerodha/sync` fetches holdings from Kite API and upserts into `holdings` table (source='zerodha')
6. `/zerodha/prices` refreshes `current_price` for all Zerodha holdings

Access tokens expire daily; user re-authenticates as needed.

---

## 6. Project Structure

```
portfolio_app/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app entry point, CORS, lifespan
│   │   ├── config.py                # Settings via pydantic-settings (env vars)
│   │   ├── database.py              # SQLAlchemy engine, session, Base
│   │   │
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── holding.py
│   │   │   ├── fixed_deposit.py
│   │   │   ├── transaction.py
│   │   │   ├── tag.py
│   │   │   ├── holding_tag.py
│   │   │   ├── allocation_target.py
│   │   │   ├── portfolio_snapshot.py
│   │   │   └── zerodha_config.py
│   │   │
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── holding.py
│   │   │   ├── fixed_deposit.py
│   │   │   ├── transaction.py
│   │   │   ├── tag.py
│   │   │   ├── allocation.py
│   │   │   ├── portfolio.py
│   │   │   └── zerodha.py
│   │   │
│   │   ├── routers/                 # FastAPI route handlers
│   │   │   ├── __init__.py
│   │   │   ├── holdings.py
│   │   │   ├── fixed_deposits.py
│   │   │   ├── transactions.py
│   │   │   ├── tags.py
│   │   │   ├── allocations.py
│   │   │   ├── portfolio.py
│   │   │   └── zerodha.py
│   │   │
│   │   ├── services/                # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── holding_service.py
│   │   │   ├── fd_service.py        # FD interest calculations
│   │   │   ├── transaction_service.py
│   │   │   ├── tag_service.py       # Tag tree operations
│   │   │   ├── allocation_service.py # Drift calculation
│   │   │   ├── portfolio_service.py  # Aggregation, snapshots
│   │   │   └── zerodha_service.py    # Kite API integration
│   │   │
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── calculations.py      # Shared financial math helpers
│   │
│   ├── alembic/
│   │   ├── alembic.ini
│   │   ├── env.py
│   │   └── versions/                # Migration scripts
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py              # Fixtures, test DB setup
│   │   ├── test_holdings.py
│   │   ├── test_fixed_deposits.py
│   │   ├── test_transactions.py
│   │   ├── test_tags.py
│   │   ├── test_allocations.py
│   │   ├── test_portfolio.py
│   │   └── test_zerodha.py
│   │
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/                     # Next.js App Router pages
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx             # Dashboard / home
│   │   │   ├── holdings/
│   │   │   │   ├── page.tsx         # Holdings list
│   │   │   │   └── [id]/page.tsx    # Holding detail
│   │   │   ├── fixed-deposits/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── transactions/
│   │   │   │   └── page.tsx
│   │   │   ├── tags/
│   │   │   │   └── page.tsx
│   │   │   ├── allocations/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx         # Zerodha config, app settings
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui components (auto-generated)
│   │   │   ├── layout/
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── header.tsx
│   │   │   │   └── nav.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── portfolio-summary-card.tsx
│   │   │   │   ├── allocation-pie-chart.tsx
│   │   │   │   ├── portfolio-history-chart.tsx
│   │   │   │   └── holdings-table.tsx
│   │   │   ├── holdings/
│   │   │   │   ├── holding-form.tsx
│   │   │   │   ├── holding-card.tsx
│   │   │   │   └── tag-selector.tsx
│   │   │   ├── fixed-deposits/
│   │   │   │   ├── fd-form.tsx
│   │   │   │   └── fd-card.tsx
│   │   │   ├── tags/
│   │   │   │   ├── tag-tree.tsx
│   │   │   │   └── tag-form.tsx
│   │   │   └── allocations/
│   │   │       ├── allocation-table.tsx
│   │   │       └── drift-indicator.tsx
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts               # API client (fetch wrapper)
│   │   │   ├── utils.ts             # Formatting helpers (currency, %)
│   │   │   └── constants.ts
│   │   │
│   │   └── types/
│   │       ├── holding.ts
│   │       ├── fixed-deposit.ts
│   │       ├── transaction.ts
│   │       ├── tag.ts
│   │       ├── allocation.ts
│   │       └── portfolio.ts
│   │
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── .env.example
│
├── docs/
│   └── ARCHITECTURE.md              # This document
│
└── README.md
```

---

## 7. Development Workflow

### Running Locally

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head          # run migrations
uvicorn app.main:app --reload # start dev server on :8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev                   # start dev server on :3000
```

### Environment Variables

**Backend (`backend/.env`):**
```
DATABASE_URL=sqlite:///./portfolio.db
API_KEY=your-secret-key       # optional, for auth
ZERODHA_API_KEY=              # set via UI or env
ZERODHA_API_SECRET=           # set via UI or env
```

**Frontend (`frontend/.env.local`):**
```
NEXT_PUBLIC_API_URL=http://localhost:8998/api/v1
```

---

## 8. Design Decisions and Trade-offs

1. **SQLite over PostgreSQL**: For a single-user personal app, SQLite eliminates deployment complexity. The entire database is a single file, easy to back up. Can migrate to PostgreSQL later if needed (SQLAlchemy abstracts the difference).

2. **Separate backend and frontend**: Allows the API to be used independently (e.g., scripts, mobile app in the future). Also keeps concerns cleanly separated.

3. **Calculated fields on holdings (`current_value`, `pnl`)**: These are stored for snapshot purposes but recalculated on price updates. This avoids stale data while keeping queries fast.

4. **FD value calculated on-demand**: Rather than storing accrued FD values on a schedule, the service layer computes them when requested. This ensures accuracy without background jobs.

5. **Hierarchical tags with self-referencing**: Using `parent_id` on the same `tags` table keeps the schema simple. Tree operations (getting all descendants) are handled in the service layer with recursive queries.

6. **Junction table for holding-tags**: Supports tagging both holdings and FDs. The CHECK constraint ensures each row links to exactly one asset type.

7. **Portfolio snapshots as denormalized records**: Snapshots store the calculated total rather than referencing live data. This provides accurate historical tracking even as holdings change.

8. **No background scheduler**: The app does not run background jobs. Price updates and snapshots are triggered manually or on page load. This keeps the architecture simple for personal use.
