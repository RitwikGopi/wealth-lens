from datetime import date, datetime
from typing import Any

from pydantic import BaseModel


class PortfolioSummary(BaseModel):
    total_value: float
    holdings_value: float
    fd_value: float
    total_pnl: float
    holdings_count: int
    fd_count: int
    last_sync_at: datetime | None = None


class SnapshotResponse(BaseModel):
    id: int
    date: date
    total_value: float
    holdings_value: float
    fd_value: float
    breakdown: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SnapshotWithReturnResponse(BaseModel):
    id: int
    date: date
    total_value: float
    holdings_value: float
    fd_value: float
    breakdown: str | None = None
    total_return: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class LifetimeGainsResponse(BaseModel):
    total_invested: float
    total_withdrawn: float
    net_invested: float
    current_portfolio_value: float
    lifetime_gain: float
    lifetime_gain_pct: float | None = None
    unrealized_pnl: float
    holdings_pnl: float
    fd_interest: float
    realized_pnl: float
    withdrawal_count: int


class WithdrawalTimelineEntry(BaseModel):
    date: date
    amount: float
    cumulative: float
    notes: str | None = None


class BackfillRequest(BaseModel):
    kite_data: dict[str, Any]


class BackfillResponse(BaseModel):
    snapshots_created: int
    snapshots_updated: int
    message: str
    errors: list[str] = []
