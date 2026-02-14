from datetime import datetime

from sqlalchemy import ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("tags.id", ondelete="CASCADE"), nullable=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )

    parent: Mapped["Tag | None"] = relationship(
        back_populates="children", remote_side=[id]
    )
    children: Mapped[list["Tag"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan"
    )
    holding_tags: Mapped[list["HoldingTag"]] = relationship(  # noqa: F821
        back_populates="tag", cascade="all, delete-orphan"
    )
    allocation_targets: Mapped[list["AllocationTarget"]] = relationship(  # noqa: F821
        back_populates="tag", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("name", "parent_id", name="uq_tag_name_parent"),
        Index("idx_tags_parent", "parent_id"),
    )
