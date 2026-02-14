# Portfolio Tracker

A personal portfolio tracking application that aggregates Zerodha holdings, fixed deposits, and other assets into a single dashboard with allocation planning, rebalancing, and historical growth charts.

## Tech Stack

| Layer    | Technology                                      |
| -------- | ----------------------------------------------- |
| Backend  | Python 3.13, FastAPI, SQLAlchemy 2.0, SQLite    |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Broker   | Zerodha Kite Connect API                        |
| Scheduler| APScheduler (in-process, runs inside the backend)|

## Prerequisites

- Python 3.11+
- Node.js 18+
- A [Kite Connect](https://kite.trade/) app (for Zerodha integration)

## Quick Start (with uv)

[uv](https://docs.astral.sh/uv/) is the recommended way to manage Python dependencies.

```bash
# 1. Clone and enter the project
cd portfolio_app

# 2. Setup backend
cd backend
cp .env.example .env            # Edit with your keys if needed
uv sync                         # Creates .venv and installs all deps
uv run alembic upgrade head     # Create/migrate database
uv run uvicorn app.main:app --reload   # Starts on http://localhost:8998

# 3. Setup frontend (new terminal)
cd frontend
npm install
npm run dev                     # Starts on http://localhost:3333
```

### Without uv (manual venv)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

### Makefile shortcuts

```bash
make install-backend    # pip install -r requirements.txt
make install-frontend   # npm install
make migrate            # alembic upgrade head
make backend            # start backend server
make frontend           # start frontend dev server
```

## Connecting Zerodha

1. Go to **Settings** in the app
2. Enter your Kite Connect **API Key** and **API Secret**, click **Save Credentials**
3. Click **Authenticate with Zerodha** — you'll be redirected to Zerodha's login
4. After login, you're redirected back with a "Connected" status
5. Go to **Dashboard** and click **Sync Zerodha** to pull your holdings

## Features

### Dashboard
- Portfolio summary with total value, invested amount, P&L
- Allocation breakdown pie chart (by tags)
- Portfolio growth line chart (with 1M/3M/6M/1Y/All filters)
- Top 5 holdings by value
- Recent transactions
- **Last synced** timestamp with stale data warning (>24 hours)
- Quick actions: Add Holding, Add FD, Sync Zerodha

### Holdings
- All holdings with current value, P&L, tags
- Bulk-tagging: select multiple holdings and assign tags at once
- Add/edit manual holdings

### Fixed Deposits
- Track FDs with principal, interest rate, compounding frequency
- Current value calculated in real-time using compound interest formula
- Maturity tracking

### Transactions
- Record deposits, withdrawals, buy/sell, dividends, interest, FD open/close
- Auto-generated buy/sell transactions during Zerodha sync
- Source tracking (Manual vs Auto)
- Filter by type and date range

### Tags & Allocation Planning
- Hierarchical tag tree (parent/child tags)
- Investment count and total value per tag
- Set target allocation percentages per tag
- Drift analysis: current vs target allocation
- Untagged holdings warning

### Rebalancing
- Create rebalancing operations with buy/sell moves
- Record-keeping only (does not execute trades)
- History of past rebalancing operations

### Settings & Data Management
- Zerodha connection management
- Manual portfolio snapshot trigger
- **Historical data backfill**: Generate past portfolio snapshots using Zerodha price data and FD calculations. Populates the growth chart with historical data.

## Architecture

```
portfolio_app/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + scheduler lifespan
│   │   ├── config.py            # Settings (env vars)
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/            # Business logic layer
│   │   │   ├── backfill_service.py   # Historical data backfill
│   │   │   ├── portfolio_service.py  # Portfolio summary + snapshots
│   │   │   ├── scheduler.py          # Daily auto-snapshot (APScheduler)
│   │   │   ├── zerodha_service.py    # Kite API integration
│   │   │   └── ...
│   │   ├── routers/             # FastAPI route handlers
│   │   └── utils/               # Helpers (FD calculations, etc.)
│   ├── alembic/                 # Database migrations
│   ├── requirements.txt
│   └── portfolio.db             # SQLite database (auto-created)
│
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── holdings/page.tsx
│   │   │   ├── fixed-deposits/page.tsx
│   │   │   ├── transactions/page.tsx
│   │   │   ├── tags/page.tsx
│   │   │   ├── allocations/page.tsx
│   │   │   ├── rebalancing/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── components/          # React components
│   │   │   ├── dashboard/       # Dashboard-specific components
│   │   │   ├── layout/          # Sidebar, layout
│   │   │   ├── shared/          # Reusable (CurrencyDisplay, TagBadge, etc.)
│   │   │   └── ui/              # shadcn/ui primitives
│   │   ├── lib/                 # Utilities (api client, formatters, mock data)
│   │   └── types/               # TypeScript type definitions
│   └── package.json
│
├── Makefile
└── README.md
```

## Background Scheduler

The backend includes an **in-process APScheduler** that automatically takes a portfolio snapshot at **midnight daily**. This ensures the growth chart has consistent data points even if you don't manually sync.

- Starts automatically when the backend starts (via FastAPI lifespan)
- Stops gracefully when the backend stops
- No separate cron service or worker needed
- One snapshot per day maximum (overwrites if triggered multiple times on the same day)

## API Documentation

Once the backend is running, visit http://localhost:8998/docs for the interactive Swagger UI.

### Key Endpoints

| Method | Endpoint                    | Description                          |
| ------ | --------------------------- | ------------------------------------ |
| GET    | `/api/v1/portfolio/summary` | Portfolio summary with last_sync_at  |
| GET    | `/api/v1/portfolio/snapshots` | Historical portfolio snapshots     |
| POST   | `/api/v1/portfolio/backfill`| Backfill historical snapshots        |
| POST   | `/api/v1/zerodha/sync`      | Sync holdings + auto-snapshot        |
| GET    | `/api/v1/holdings`          | List all holdings                    |
| GET    | `/api/v1/fixed-deposits`    | List all FDs                         |
| GET    | `/api/v1/transactions`      | List transactions (filterable)       |
| GET    | `/api/v1/tags/tree`         | Tag tree with investment counts      |
| GET    | `/api/v1/allocations/drift` | Allocation drift analysis            |

## Environment Variables

Configure in `backend/.env`:

```env
DATABASE_URL=sqlite:///./portfolio.db    # Database path
ZERODHA_API_KEY=your_api_key             # Kite Connect API key
ZERODHA_API_SECRET=your_api_secret       # Kite Connect API secret
```

Zerodha credentials can also be configured via the Settings page in the UI.
