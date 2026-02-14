from datetime import datetime

from sqlalchemy import Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Holding(Base):
    __tablename__ = "holdings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String, nullable=False)
    exchange: Mapped[str] = mapped_column(String, nullable=False, default="NSE")
    instrument_type: Mapped[str] = mapped_column(String, nullable=False, default="EQ")
    quantity: Mapped[float] = mapped_column(nullable=False)
    average_price: Mapped[float] = mapped_column(nullable=False)
    current_price: Mapped[float | None] = mapped_column(nullable=True)
    current_value: Mapped[float | None] = mapped_column(nullable=True)
    pnl: Mapped[float | None] = mapped_column(nullable=True)
    source: Mapped[str] = mapped_column(String, nullable=False, default="manual")
    zerodha_trading_symbol: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )

    tags: Mapped[list["HoldingTag"]] = relationship(  # noqa: F821
        back_populates="holding", cascade="all, delete-orphan"
    )
    transactions: Mapped[list["Transaction"]] = relationship(  # noqa: F821
        back_populates="holding"
    )

    __table_args__ = (
        Index("idx_holdings_symbol", "symbol"),
        Index("idx_holdings_source", "source"),
    )
