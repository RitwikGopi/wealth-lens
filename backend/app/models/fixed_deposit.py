import datetime as dt

from sqlalchemy import Boolean, Date, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class FixedDeposit(Base):
    __tablename__ = "fixed_deposits"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    bank_name: Mapped[str] = mapped_column(String, nullable=False)
    principal: Mapped[float] = mapped_column(nullable=False)
    interest_rate: Mapped[float] = mapped_column(nullable=False)
    compounding_frequency: Mapped[str] = mapped_column(
        String, nullable=False, default="quarterly"
    )
    start_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    maturity_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    maturity_amount: Mapped[float | None] = mapped_column(nullable=True)
    current_value: Mapped[float | None] = mapped_column(nullable=True)
    is_cumulative: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    interest_payout_freq: Mapped[str | None] = mapped_column(String, nullable=True)
    auto_renew: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    funded_externally: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="1"
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String, nullable=False, server_default="active"
    )
    closure_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    closure_amount: Mapped[float | None] = mapped_column(nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )

    tags: Mapped[list["HoldingTag"]] = relationship(  # noqa: F821
        back_populates="fixed_deposit", cascade="all, delete-orphan"
    )
    transactions: Mapped[list["Transaction"]] = relationship(  # noqa: F821
        back_populates="fixed_deposit"
    )

    __table_args__ = (
        Index("idx_fd_bank", "bank_name"),
        Index("idx_fd_maturity", "maturity_date"),
        Index("idx_fd_status", "status"),
    )
