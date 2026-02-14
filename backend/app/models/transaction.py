import datetime as dt

from sqlalchemy import Date, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(String, nullable=False)
    holding_id: Mapped[int | None] = mapped_column(
        ForeignKey("holdings.id", ondelete="SET NULL"), nullable=True
    )
    fd_id: Mapped[int | None] = mapped_column(
        ForeignKey("fixed_deposits.id", ondelete="SET NULL"), nullable=True
    )
    amount: Mapped[float] = mapped_column(nullable=False)
    quantity: Mapped[float | None] = mapped_column(nullable=True)
    price: Mapped[float | None] = mapped_column(nullable=True)
    date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    realized_pnl: Mapped[float | None] = mapped_column(nullable=True)
    source: Mapped[str] = mapped_column(String, nullable=False, server_default="manual")
    created_at: Mapped[dt.datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )

    holding: Mapped["Holding | None"] = relationship(  # noqa: F821
        back_populates="transactions"
    )
    fixed_deposit: Mapped["FixedDeposit | None"] = relationship(  # noqa: F821
        back_populates="transactions"
    )

    __table_args__ = (
        Index("idx_txn_type", "type"),
        Index("idx_txn_date", "date"),
        Index("idx_txn_holding", "holding_id"),
        Index("idx_txn_fd", "fd_id"),
    )
