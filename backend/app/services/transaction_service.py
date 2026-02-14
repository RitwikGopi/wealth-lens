from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.holding import Holding
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionUpdate


def _compute_realized_pnl(
    db: Session, data: TransactionCreate
) -> float | None:
    """Compute realized P&L for sell transactions linked to a holding."""
    if data.type != "sell" or not data.holding_id:
        return None
    if not data.quantity or not data.price:
        return None
    holding = db.execute(
        select(Holding).where(Holding.id == data.holding_id)
    ).scalar_one_or_none()
    if not holding:
        return None
    return (data.price - holding.average_price) * data.quantity


def get_transactions(
    db: Session,
    type: str | None = None,
    holding_id: int | None = None,
    fd_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[Transaction]:
    stmt = select(Transaction).order_by(Transaction.date.desc())

    if type:
        stmt = stmt.where(Transaction.type == type)
    if holding_id is not None:
        stmt = stmt.where(Transaction.holding_id == holding_id)
    if fd_id is not None:
        stmt = stmt.where(Transaction.fd_id == fd_id)
    if date_from:
        stmt = stmt.where(Transaction.date >= date_from)
    if date_to:
        stmt = stmt.where(Transaction.date <= date_to)

    stmt = stmt.offset(offset).limit(limit)
    return list(db.execute(stmt).scalars().all())


def get_transaction(db: Session, txn_id: int) -> Transaction | None:
    return db.execute(
        select(Transaction).where(Transaction.id == txn_id)
    ).scalar_one_or_none()


def create_transaction(db: Session, data: TransactionCreate) -> Transaction:
    fields = data.model_dump()
    fields["realized_pnl"] = _compute_realized_pnl(db, data)
    txn = Transaction(**fields)
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


def update_transaction(
    db: Session, txn: Transaction, data: TransactionUpdate
) -> Transaction:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(txn, key, value)
    db.commit()
    db.refresh(txn)
    return txn


def delete_transaction(db: Session, txn: Transaction) -> None:
    db.delete(txn)
    db.commit()
