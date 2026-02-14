from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.fixed_deposit import (
    FDCloseRequest,
    FDRenewRequest,
    FDRenewResponse,
    FDTagAssign,
    FixedDepositCreate,
    FixedDepositResponse,
    FixedDepositUpdate,
    FixedDepositWithTags,
)
from app.services import fd_service
from app.services.portfolio_service import backfill_fd_snapshots, recalculate_fd_in_snapshots

router = APIRouter(prefix="/fixed-deposits", tags=["Fixed Deposits"])


@router.get("", response_model=list[FixedDepositWithTags])
def list_fixed_deposits(
    bank_name: str | None = None,
    tag_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    fds = fd_service.get_fixed_deposits(db, bank_name, tag_id, status)
    return [_serialize_fd_with_tags(fd) for fd in fds]


@router.get("/{fd_id}", response_model=FixedDepositWithTags)
def get_fixed_deposit(fd_id: int, db: Session = Depends(get_db)):
    fd = fd_service.get_fixed_deposit(db, fd_id)
    if not fd:
        raise HTTPException(status_code=404, detail="Fixed deposit not found")
    return _serialize_fd_with_tags(fd)


@router.post("", response_model=FixedDepositResponse, status_code=201)
def create_fixed_deposit(data: FixedDepositCreate, db: Session = Depends(get_db)):
    fd = fd_service.create_fixed_deposit(db, data)
    backfill_fd_snapshots(db)
    recalculate_fd_in_snapshots(db)
    return fd


@router.put("/{fd_id}", response_model=FixedDepositResponse)
def update_fixed_deposit(
    fd_id: int, data: FixedDepositUpdate, db: Session = Depends(get_db)
):
    fd = fd_service.get_fixed_deposit(db, fd_id)
    if not fd:
        raise HTTPException(status_code=404, detail="Fixed deposit not found")
    updated = fd_service.update_fixed_deposit(db, fd, data)
    backfill_fd_snapshots(db)
    recalculate_fd_in_snapshots(db)
    return updated


@router.delete("/{fd_id}", status_code=204)
def delete_fixed_deposit(fd_id: int, db: Session = Depends(get_db)):
    fd = fd_service.get_fixed_deposit(db, fd_id)
    if not fd:
        raise HTTPException(status_code=404, detail="Fixed deposit not found")
    fd_service.delete_fixed_deposit(db, fd)
    recalculate_fd_in_snapshots(db)


@router.post("/{fd_id}/close", response_model=FixedDepositResponse)
def close_fixed_deposit(fd_id: int, data: FDCloseRequest, db: Session = Depends(get_db)):
    fd = fd_service.get_fixed_deposit(db, fd_id)
    if not fd:
        raise HTTPException(status_code=404, detail="Fixed deposit not found")
    if fd.status == "closed":
        raise HTTPException(status_code=400, detail="Fixed deposit is already closed")

    try:
        closed_fd = fd_service.close_fixed_deposit(
            db,
            fd,
            closure_date=data.closure_date,
            closure_amount=data.closure_amount,
            premature=data.premature,
            notes=data.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    recalculate_fd_in_snapshots(db)
    return closed_fd


@router.post("/{fd_id}/renew", response_model=FDRenewResponse)
def renew_fixed_deposit(fd_id: int, data: FDRenewRequest, db: Session = Depends(get_db)):
    fd = fd_service.get_fixed_deposit(db, fd_id)
    if not fd:
        raise HTTPException(status_code=404, detail="Fixed deposit not found")
    if fd.status == "closed":
        raise HTTPException(status_code=400, detail="Fixed deposit is already closed")

    try:
        closed_fd, new_fd = fd_service.renew_fixed_deposit(
            db,
            fd,
            new_maturity_date=data.new_maturity_date,
            new_principal=data.new_principal,
            new_interest_rate=data.new_interest_rate,
            new_compounding_frequency=data.new_compounding_frequency,
            new_bank_name=data.new_bank_name,
            new_is_cumulative=data.new_is_cumulative,
            notes=data.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    backfill_fd_snapshots(db)
    recalculate_fd_in_snapshots(db)
    return FDRenewResponse(closed_fd=closed_fd, new_fd=new_fd)


@router.post("/{fd_id}/tags", status_code=204)
def add_tags(fd_id: int, data: FDTagAssign, db: Session = Depends(get_db)):
    fd = fd_service.get_fixed_deposit(db, fd_id)
    if not fd:
        raise HTTPException(status_code=404, detail="Fixed deposit not found")
    fd_service.add_tags_to_fd(db, fd_id, data.tag_ids)


@router.delete("/{fd_id}/tags/{tag_id}", status_code=204)
def remove_tag(fd_id: int, tag_id: int, db: Session = Depends(get_db)):
    fd = fd_service.get_fixed_deposit(db, fd_id)
    if not fd:
        raise HTTPException(status_code=404, detail="Fixed deposit not found")
    if not fd_service.remove_tag_from_fd(db, fd_id, tag_id):
        raise HTTPException(status_code=404, detail="Tag not assigned to this FD")


def _serialize_fd_with_tags(fd) -> FixedDepositWithTags:
    data = {c.key: getattr(fd, c.key) for c in fd.__table__.columns}
    data["tags"] = [
        {"id": ht.tag.id, "name": ht.tag.name, "color": ht.tag.color}
        for ht in fd.tags
    ]
    return FixedDepositWithTags(**data)
