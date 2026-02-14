from datetime import date, datetime

from pydantic import BaseModel


class FixedDepositBase(BaseModel):
    bank_name: str
    principal: float
    interest_rate: float
    compounding_frequency: str = "quarterly"
    start_date: date
    maturity_date: date
    maturity_amount: float | None = None
    is_cumulative: bool = True
    interest_payout_freq: str | None = None
    auto_renew: bool = False
    notes: str | None = None


class FixedDepositCreate(FixedDepositBase):
    pass


class FixedDepositUpdate(BaseModel):
    bank_name: str | None = None
    principal: float | None = None
    interest_rate: float | None = None
    compounding_frequency: str | None = None
    start_date: date | None = None
    maturity_date: date | None = None
    maturity_amount: float | None = None
    is_cumulative: bool | None = None
    interest_payout_freq: str | None = None
    auto_renew: bool | None = None
    notes: str | None = None


class FixedDepositResponse(FixedDepositBase):
    id: int
    current_value: float | None = None
    status: str = "active"
    closure_date: date | None = None
    closure_amount: float | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FixedDepositWithTags(FixedDepositResponse):
    tags: list["TagBrief"] = []


class TagBrief(BaseModel):
    id: int
    name: str
    color: str | None = None

    model_config = {"from_attributes": True}


class FDTagAssign(BaseModel):
    tag_ids: list[int]


class FDCloseRequest(BaseModel):
    closure_date: date
    closure_amount: float
    premature: bool = False
    notes: str | None = None


class FDRenewRequest(BaseModel):
    new_maturity_date: date
    new_principal: float | None = None
    new_interest_rate: float | None = None
    new_compounding_frequency: str | None = None
    new_bank_name: str | None = None
    new_is_cumulative: bool | None = None
    notes: str | None = None


class FDRenewResponse(BaseModel):
    closed_fd: FixedDepositResponse
    new_fd: FixedDepositResponse


FixedDepositWithTags.model_rebuild()
