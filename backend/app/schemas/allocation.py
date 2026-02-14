from datetime import datetime

from pydantic import BaseModel


# --- Plan schemas ---


class AllocationPlanCreate(BaseModel):
    name: str
    description: str | None = None
    is_primary: bool = False


class AllocationPlanUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_primary: bool | None = None


class AllocationPlanResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    is_primary: bool
    created_at: datetime
    updated_at: datetime


class AllocationPlanDetailResponse(AllocationPlanResponse):
    targets: list["AllocationTargetResponse"]
    total_target_pct: float


# --- Target schemas ---


class AllocationTargetUpdate(BaseModel):
    target_pct: float
    notes: str | None = None


class AllocationTargetResponse(BaseModel):
    id: int
    plan_id: int
    tag_id: int
    tag_name: str
    target_pct: float
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


# --- Drift schemas ---


class AllocationDrift(BaseModel):
    tag_id: int
    tag_name: str
    tag_color: str | None = None
    target_pct: float
    current_pct: float
    current_value: float
    drift: float
