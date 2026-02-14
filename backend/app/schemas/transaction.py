import datetime as dt

from pydantic import BaseModel


class TransactionBase(BaseModel):
    type: str
    holding_id: int | None = None
    fd_id: int | None = None
    amount: float
    quantity: float | None = None
    price: float | None = None
    date: dt.date
    notes: str | None = None


class TransactionCreate(TransactionBase):
    source: str = "manual"


class TransactionUpdate(BaseModel):
    type: str | None = None
    holding_id: int | None = None
    fd_id: int | None = None
    amount: float | None = None
    quantity: float | None = None
    price: float | None = None
    date: dt.date | None = None
    notes: str | None = None


class TransactionResponse(TransactionBase):
    id: int
    realized_pnl: float | None = None
    source: str
    created_at: dt.datetime

    model_config = {"from_attributes": True}
