from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.holding import (
    HoldingCreate,
    HoldingResponse,
    HoldingUpdate,
    HoldingWithTags,
    TagAssign,
)
from app.services import holding_service

router = APIRouter(prefix="/holdings", tags=["Holdings"])


@router.get("", response_model=list[HoldingWithTags])
def list_holdings(
    source: str | None = None,
    instrument_type: str | None = None,
    tag_id: int | None = None,
    db: Session = Depends(get_db),
):
    holdings = holding_service.get_holdings(db, source, instrument_type, tag_id)
    return [_serialize_holding_with_tags(h) for h in holdings]


@router.get("/{holding_id}", response_model=HoldingWithTags)
def get_holding(holding_id: int, db: Session = Depends(get_db)):
    holding = holding_service.get_holding(db, holding_id)
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    return _serialize_holding_with_tags(holding)


@router.post("", response_model=HoldingResponse, status_code=201)
def create_holding(data: HoldingCreate, db: Session = Depends(get_db)):
    return holding_service.create_holding(db, data)


@router.put("/{holding_id}", response_model=HoldingResponse)
def update_holding(
    holding_id: int, data: HoldingUpdate, db: Session = Depends(get_db)
):
    holding = holding_service.get_holding(db, holding_id)
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    return holding_service.update_holding(db, holding, data)


@router.delete("/{holding_id}", status_code=204)
def delete_holding(holding_id: int, db: Session = Depends(get_db)):
    holding = holding_service.get_holding(db, holding_id)
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    holding_service.delete_holding(db, holding)


@router.post("/{holding_id}/tags", status_code=204)
def add_tags(holding_id: int, data: TagAssign, db: Session = Depends(get_db)):
    holding = holding_service.get_holding(db, holding_id)
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    holding_service.add_tags_to_holding(db, holding_id, data.tag_ids)


@router.delete("/{holding_id}/tags/{tag_id}", status_code=204)
def remove_tag(holding_id: int, tag_id: int, db: Session = Depends(get_db)):
    holding = holding_service.get_holding(db, holding_id)
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    if not holding_service.remove_tag_from_holding(db, holding_id, tag_id):
        raise HTTPException(status_code=404, detail="Tag not assigned to this holding")


def _serialize_holding_with_tags(holding) -> HoldingWithTags:
    data = {c.key: getattr(holding, c.key) for c in holding.__table__.columns}
    data["tags"] = [
        {"id": ht.tag.id, "name": ht.tag.name, "color": ht.tag.color}
        for ht in holding.tags
    ]
    return HoldingWithTags(**data)
