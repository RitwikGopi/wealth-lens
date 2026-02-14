from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tag import Tag
from app.schemas.allocation import (
    AllocationDrift,
    AllocationPlanCreate,
    AllocationPlanDetailResponse,
    AllocationPlanResponse,
    AllocationPlanUpdate,
    AllocationTargetResponse,
    AllocationTargetUpdate,
)
from app.services import allocation_service

router = APIRouter(prefix="/allocations", tags=["Allocations"])


# ---------------------------------------------------------------------------
# Backward-compat: primary-plan drift (used by dashboard & rebalancing)
# ---------------------------------------------------------------------------


@router.get("/drift", response_model=list[AllocationDrift])
def get_primary_drift(db: Session = Depends(get_db)):
    """Return drift for the primary plan (backward-compat for dashboard)."""
    primary = allocation_service.get_primary_plan(db)
    if not primary:
        return []
    return allocation_service.get_drift(db, primary.id)


# ---------------------------------------------------------------------------
# Plan CRUD
# ---------------------------------------------------------------------------


@router.get("/plans", response_model=list[AllocationPlanResponse])
def list_plans(db: Session = Depends(get_db)):
    plans = allocation_service.get_plans(db)
    return [
        AllocationPlanResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            is_primary=p.is_primary,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in plans
    ]


@router.post("/plans", response_model=AllocationPlanResponse, status_code=201)
def create_plan(data: AllocationPlanCreate, db: Session = Depends(get_db)):
    plan = allocation_service.create_plan(
        db, name=data.name, description=data.description, is_primary=data.is_primary
    )
    return AllocationPlanResponse(
        id=plan.id,
        name=plan.name,
        description=plan.description,
        is_primary=plan.is_primary,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


@router.get("/plans/{plan_id}", response_model=AllocationPlanDetailResponse)
def get_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = allocation_service.get_plan(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Allocation plan not found")
    targets = allocation_service.get_allocations(db, plan_id)
    total_pct = sum(t["target_pct"] for t in targets)
    return AllocationPlanDetailResponse(
        id=plan.id,
        name=plan.name,
        description=plan.description,
        is_primary=plan.is_primary,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        targets=[AllocationTargetResponse(**t) for t in targets],
        total_target_pct=round(total_pct, 2),
    )


@router.put("/plans/{plan_id}", response_model=AllocationPlanResponse)
def update_plan(plan_id: int, data: AllocationPlanUpdate, db: Session = Depends(get_db)):
    plan = allocation_service.get_plan(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Allocation plan not found")
    plan = allocation_service.update_plan(
        db,
        plan,
        name=data.name,
        description=data.description,
        is_primary=data.is_primary,
    )
    return AllocationPlanResponse(
        id=plan.id,
        name=plan.name,
        description=plan.description,
        is_primary=plan.is_primary,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


@router.delete("/plans/{plan_id}", status_code=204)
def delete_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = allocation_service.get_plan(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Allocation plan not found")
    allocation_service.delete_plan(db, plan)


# ---------------------------------------------------------------------------
# Plan-scoped drift
# ---------------------------------------------------------------------------


@router.get("/plans/{plan_id}/drift", response_model=list[AllocationDrift])
def get_plan_drift(plan_id: int, db: Session = Depends(get_db)):
    plan = allocation_service.get_plan(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Allocation plan not found")
    return allocation_service.get_drift(db, plan_id)


# ---------------------------------------------------------------------------
# Plan-scoped targets
# ---------------------------------------------------------------------------


@router.get("/plans/{plan_id}/targets", response_model=list[AllocationTargetResponse])
def list_plan_targets(plan_id: int, db: Session = Depends(get_db)):
    plan = allocation_service.get_plan(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Allocation plan not found")
    return allocation_service.get_allocations(db, plan_id)


@router.put(
    "/plans/{plan_id}/targets/{tag_id}",
    response_model=AllocationTargetResponse,
)
def set_plan_target(
    plan_id: int,
    tag_id: int,
    data: AllocationTargetUpdate,
    db: Session = Depends(get_db),
):
    plan = allocation_service.get_plan(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Allocation plan not found")

    from sqlalchemy import select

    tag = db.execute(select(Tag).where(Tag.id == tag_id)).scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    alloc = allocation_service.set_allocation(
        db, plan_id, tag_id, data.target_pct, data.notes
    )
    return AllocationTargetResponse(
        id=alloc.id,
        plan_id=alloc.plan_id,
        tag_id=alloc.tag_id,
        tag_name=tag.name,
        target_pct=alloc.target_pct,
        notes=alloc.notes,
        created_at=alloc.created_at,
        updated_at=alloc.updated_at,
    )


@router.delete("/plans/{plan_id}/targets/{tag_id}", status_code=204)
def delete_plan_target(plan_id: int, tag_id: int, db: Session = Depends(get_db)):
    alloc = allocation_service.get_allocation_by_plan_and_tag(db, plan_id, tag_id)
    if not alloc:
        raise HTTPException(
            status_code=404, detail="Allocation target not found"
        )
    allocation_service.delete_allocation(db, alloc)
