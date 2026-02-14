import datetime as dt

from sqlalchemy import Date, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PortfolioSnapshot(Base):
    __tablename__ = "portfolio_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[dt.date] = mapped_column(Date, nullable=False, unique=True)
    total_value: Mapped[float] = mapped_column(nullable=False)
    holdings_value: Mapped[float] = mapped_column(nullable=False)
    fd_value: Mapped[float] = mapped_column(nullable=False)
    breakdown: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )

    __table_args__ = (Index("idx_snapshot_date", "date"),)
