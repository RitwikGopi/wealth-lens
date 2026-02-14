from datetime import datetime

from sqlalchemy import ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RebalancingOperation(Base):
    __tablename__ = "rebalancing_operations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(nullable=False)
    date: Mapped[str] = mapped_column(nullable=False)  # YYYY-MM-DD
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(nullable=False, default="executed")
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )

    moves: Mapped[list["RebalancingMove"]] = relationship(
        back_populates="operation", cascade="all, delete-orphan"
    )


class RebalancingMove(Base):
    __tablename__ = "rebalancing_moves"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    operation_id: Mapped[int] = mapped_column(
        ForeignKey("rebalancing_operations.id", ondelete="CASCADE"), nullable=False
    )
    action: Mapped[str] = mapped_column(nullable=False)  # "buy" or "sell"
    investment: Mapped[str] = mapped_column(nullable=False)
    amount: Mapped[float] = mapped_column(nullable=False)

    operation: Mapped["RebalancingOperation"] = relationship(back_populates="moves")
