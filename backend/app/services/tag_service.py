from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload, subqueryload

from app.models.allocation_target import AllocationTarget
from app.models.fixed_deposit import FixedDeposit
from app.models.holding import Holding
from app.models.holding_tag import HoldingTag
from app.models.tag import Tag
from app.schemas.tag import AllocationTargetInfo, TagCreate, TagTree, TagUpdate
from app.utils.calculations import calculate_fd_current_value


def get_tags(db: Session, root_only: bool = False) -> list[Tag]:
    stmt = select(Tag)
    if root_only:
        stmt = stmt.where(Tag.parent_id.is_(None))
    return list(db.execute(stmt).scalars().all())


def _compute_tag_stats(
    db: Session, tag_ids: list[int]
) -> tuple[int, float]:
    """Compute investment count and total value for a set of tag IDs.

    Deduplicates by holding/FD so that an investment tagged with multiple
    tags in ``tag_ids`` is only counted once.
    """
    holding_tags = list(
        db.execute(
            select(HoldingTag).where(HoldingTag.tag_id.in_(tag_ids))
        ).scalars().all()
    )

    # Deduplicate: collect unique holding IDs and FD IDs
    unique_holding_ids: set[int] = set()
    unique_fd_ids: set[int] = set()
    for ht in holding_tags:
        if ht.holding_id is not None:
            unique_holding_ids.add(ht.holding_id)
        elif ht.fd_id is not None:
            unique_fd_ids.add(ht.fd_id)

    count = len(unique_holding_ids) + len(unique_fd_ids)
    total_value = 0.0

    for hid in unique_holding_ids:
        holding = db.get(Holding, hid)
        if holding:
            total_value += holding.current_value or 0.0

    for fid in unique_fd_ids:
        fd = db.get(FixedDeposit, fid)
        if fd:
            if fd.is_cumulative:
                total_value += calculate_fd_current_value(
                    principal=fd.principal,
                    annual_rate=fd.interest_rate,
                    compounding_frequency=fd.compounding_frequency,
                    start_date=fd.start_date,
                )
            else:
                total_value += fd.principal

    return count, total_value


def get_tag_tree(db: Session) -> list[TagTree]:
    all_tags = list(
        db.execute(
            select(Tag).options(
                selectinload(Tag.children),
                selectinload(Tag.allocation_targets).subqueryload(AllocationTarget.plan),
            )
        ).scalars().all()
    )

    tag_map: dict[int, Tag] = {t.id: t for t in all_tags}
    roots = [t for t in all_tags if t.parent_id is None]

    def get_all_ids(tag: Tag) -> list[int]:
        ids = [tag.id]
        for child in tag.children:
            ids.extend(get_all_ids(child))
        return ids

    def build_tree(tag: Tag) -> TagTree:
        children = [build_tree(c) for c in tag.children]

        all_ids = get_all_ids(tag)
        investment_count, total_value = _compute_tag_stats(db, all_ids)

        # Show primary plan's allocation target in the tag tree
        alloc = None
        if tag.allocation_targets:
            primary_target = next(
                (t for t in tag.allocation_targets if t.plan and t.plan.is_primary),
                None,
            )
            if primary_target:
                alloc = AllocationTargetInfo(
                    target_pct=primary_target.target_pct,
                    notes=primary_target.notes,
                )

        return TagTree(
            id=tag.id,
            name=tag.name,
            parent_id=tag.parent_id,
            description=tag.description,
            color=tag.color,
            created_at=tag.created_at,
            investment_count=investment_count,
            total_value=total_value,
            allocation_target=alloc,
            children=children,
        )

    return [build_tree(r) for r in roots]


def get_tag(db: Session, tag_id: int) -> Tag | None:
    return db.execute(
        select(Tag)
        .options(selectinload(Tag.children), selectinload(Tag.allocation_targets))
        .where(Tag.id == tag_id)
    ).scalar_one_or_none()


def create_tag(db: Session, data: TagCreate) -> Tag:
    tag = Tag(**data.model_dump())
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def update_tag(db: Session, tag: Tag, data: TagUpdate) -> Tag:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(tag, key, value)
    db.commit()
    db.refresh(tag)
    return tag


def delete_tag(db: Session, tag: Tag) -> None:
    db.delete(tag)
    db.commit()


def get_all_descendant_ids(db: Session, tag_id: int) -> list[int]:
    """Get all descendant tag IDs including the given tag_id."""
    result = [tag_id]
    children = list(
        db.execute(select(Tag.id).where(Tag.parent_id == tag_id)).scalars().all()
    )
    for child_id in children:
        result.extend(get_all_descendant_ids(db, child_id))
    return result
