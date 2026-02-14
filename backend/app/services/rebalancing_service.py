from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.rebalancing import RebalancingMove, RebalancingOperation
from app.schemas.rebalancing import RebalancingCreate, RebalancingResponse


def create_operation(db: Session, data: RebalancingCreate) -> RebalancingOperation:
    op = RebalancingOperation(
        name=data.name,
        date=data.date,
        notes=data.notes,
        status="executed",
    )
    db.add(op)
    db.flush()

    for m in data.moves:
        move = RebalancingMove(
            operation_id=op.id,
            action=m.action,
            investment=m.investment,
            amount=m.amount,
        )
        db.add(move)

    db.commit()
    db.refresh(op)
    return op


def list_operations(db: Session) -> list[RebalancingResponse]:
    ops = list(
        db.execute(
            select(RebalancingOperation).order_by(
                RebalancingOperation.created_at.desc()
            )
        )
        .scalars()
        .all()
    )

    return [_to_response(op) for op in ops]


def get_operation(db: Session, op_id: int) -> RebalancingOperation | None:
    return db.execute(
        select(RebalancingOperation).where(RebalancingOperation.id == op_id)
    ).scalar_one_or_none()


def delete_operation(db: Session, op: RebalancingOperation) -> None:
    db.delete(op)
    db.commit()


def _to_response(op: RebalancingOperation) -> RebalancingResponse:
    moves = op.moves or []
    return RebalancingResponse(
        id=op.id,
        name=op.name,
        date=op.date,
        notes=op.notes,
        status=op.status,
        created_at=op.created_at,
        moves=[
            {"id": m.id, "action": m.action, "investment": m.investment, "amount": m.amount}
            for m in moves
        ],
        total_sells=sum(m.amount for m in moves if m.action == "sell"),
        total_buys=sum(m.amount for m in moves if m.action == "buy"),
    )
