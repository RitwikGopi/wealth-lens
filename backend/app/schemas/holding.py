from datetime import datetime

from pydantic import BaseModel


class HoldingBase(BaseModel):
    symbol: str
    exchange: str = "NSE"
    instrument_type: str = "EQ"
    quantity: float
    average_price: float
    current_price: float | None = None
    notes: str | None = None


class HoldingCreate(HoldingBase):
    pass


class HoldingUpdate(BaseModel):
    symbol: str | None = None
    exchange: str | None = None
    instrument_type: str | None = None
    quantity: float | None = None
    average_price: float | None = None
    current_price: float | None = None
    notes: str | None = None


class HoldingResponse(HoldingBase):
    id: int
    current_value: float | None = None
    pnl: float | None = None
    source: str = "manual"
    zerodha_trading_symbol: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class HoldingWithTags(HoldingResponse):
    tags: list["TagBrief"] = []


class TagBrief(BaseModel):
    id: int
    name: str
    color: str | None = None

    model_config = {"from_attributes": True}


class TagAssign(BaseModel):
    tag_ids: list[int]


HoldingWithTags.model_rebuild()
