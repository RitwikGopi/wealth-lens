from datetime import datetime

from pydantic import BaseModel


class TagBase(BaseModel):
    name: str
    parent_id: int | None = None
    description: str | None = None
    color: str | None = None


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: str | None = None
    parent_id: int | None = None
    description: str | None = None
    color: str | None = None


class TagResponse(TagBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AllocationTargetInfo(BaseModel):
    target_pct: float
    notes: str | None = None

    model_config = {"from_attributes": True}


class TagTree(TagResponse):
    investment_count: int = 0
    total_value: float = 0.0
    allocation_target: AllocationTargetInfo | None = None
    children: list["TagTree"] = []


class TagWithAllocation(TagResponse):
    target_pct: float | None = None
    children: list["TagWithAllocation"] = []


TagTree.model_rebuild()
TagWithAllocation.model_rebuild()
