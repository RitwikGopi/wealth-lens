from sqlalchemy import CheckConstraint, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class HoldingTag(Base):
    __tablename__ = "holding_tags"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    tag_id: Mapped[int] = mapped_column(
        ForeignKey("tags.id", ondelete="CASCADE"), nullable=False
    )
    holding_id: Mapped[int | None] = mapped_column(
        ForeignKey("holdings.id", ondelete="CASCADE"), nullable=True
    )
    fd_id: Mapped[int | None] = mapped_column(
        ForeignKey("fixed_deposits.id", ondelete="CASCADE"), nullable=True
    )

    tag: Mapped["Tag"] = relationship(back_populates="holding_tags")  # noqa: F821
    holding: Mapped["Holding | None"] = relationship(  # noqa: F821
        back_populates="tags"
    )
    fixed_deposit: Mapped["FixedDeposit | None"] = relationship(  # noqa: F821
        back_populates="tags"
    )

    __table_args__ = (
        CheckConstraint(
            "(holding_id IS NOT NULL AND fd_id IS NULL) OR "
            "(holding_id IS NULL AND fd_id IS NOT NULL)",
            name="ck_holding_or_fd",
        ),
        UniqueConstraint("tag_id", "holding_id", name="uq_tag_holding"),
        UniqueConstraint("tag_id", "fd_id", name="uq_tag_fd"),
        Index("idx_ht_tag_holding", "tag_id", "holding_id"),
        Index("idx_ht_tag_fd", "tag_id", "fd_id"),
    )
