from datetime import datetime

from pydantic import BaseModel


class RebalancingMoveCreate(BaseModel):
    action: str  # "buy" or "sell"
    investment: str
    amount: float


class RebalancingMoveResponse(BaseModel):
    id: int
    action: str
    investment: str
    amount: float


class RebalancingCreate(BaseModel):
    name: str
    date: str
    notes: str | None = None
    moves: list[RebalancingMoveCreate]


class RebalancingResponse(BaseModel):
    id: int
    name: str
    date: str
    notes: str | None = None
    status: str
    created_at: datetime
    moves: list[RebalancingMoveResponse]
    total_sells: float
    total_buys: float
