from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.holding import Holding
from app.models.holding_tag import HoldingTag
from app.schemas.holding import HoldingCreate, HoldingUpdate


def get_holdings(
    db: Session,
    source: str | None = None,
    instrument_type: str | None = None,
    tag_id: int | None = None,
) -> list[Holding]:
    stmt = select(Holding).options(selectinload(Holding.tags).selectinload(HoldingTag.tag))

    if source:
        stmt = stmt.where(Holding.source == source)
    if instrument_type:
        stmt = stmt.where(Holding.instrument_type == instrument_type)
    if tag_id:
        stmt = stmt.join(HoldingTag, HoldingTag.holding_id == Holding.id).where(
            HoldingTag.tag_id == tag_id
        )

    return list(db.execute(stmt).scalars().all())


def get_holding(db: Session, holding_id: int) -> Holding | None:
    stmt = (
        select(Holding)
        .options(selectinload(Holding.tags).selectinload(HoldingTag.tag))
        .where(Holding.id == holding_id)
    )
    return db.execute(stmt).scalar_one_or_none()


def create_holding(db: Session, data: HoldingCreate) -> Holding:
    holding = Holding(**data.model_dump())
    _recalculate(holding)
    db.add(holding)
    db.commit()
    db.refresh(holding)
    return holding


def update_holding(db: Session, holding: Holding, data: HoldingUpdate) -> Holding:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(holding, key, value)
    _recalculate(holding)
    db.commit()
    db.refresh(holding)
    return holding


def delete_holding(db: Session, holding: Holding) -> None:
    db.delete(holding)
    db.commit()


def add_tags_to_holding(db: Session, holding_id: int, tag_ids: list[int]) -> None:
    for tag_id in tag_ids:
        existing = db.execute(
            select(HoldingTag).where(
                HoldingTag.holding_id == holding_id, HoldingTag.tag_id == tag_id
            )
        ).scalar_one_or_none()
        if not existing:
            db.add(HoldingTag(tag_id=tag_id, holding_id=holding_id))
    db.commit()


def remove_tag_from_holding(db: Session, holding_id: int, tag_id: int) -> bool:
    ht = db.execute(
        select(HoldingTag).where(
            HoldingTag.holding_id == holding_id, HoldingTag.tag_id == tag_id
        )
    ).scalar_one_or_none()
    if ht:
        db.delete(ht)
        db.commit()
        return True
    return False


def _recalculate(holding: Holding) -> None:
    if holding.current_price is not None and holding.quantity is not None:
        holding.current_value = holding.quantity * holding.current_price
        holding.pnl = holding.current_value - (
            holding.quantity * holding.average_price
        )
