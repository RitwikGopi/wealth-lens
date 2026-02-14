from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from app.models.allocation_plan import AllocationPlan
from app.models.allocation_target import AllocationTarget
from app.models.fixed_deposit import FixedDeposit
from app.models.holding import Holding
from app.models.holding_tag import HoldingTag
from app.models.tag import Tag
from app.schemas.allocation import AllocationDrift
from app.services.tag_service import get_all_descendant_ids
from app.utils.calculations import calculate_fd_current_value


# ---------------------------------------------------------------------------
# Plan CRUD
# ---------------------------------------------------------------------------


def get_plans(db: Session) -> list[AllocationPlan]:
    return list(
        db.execute(
            select(AllocationPlan).order_by(AllocationPlan.id)
        ).scalars().all()
    )


def get_plan(db: Session, plan_id: int) -> AllocationPlan | None:
    return db.execute(
        select(AllocationPlan)
        .options(selectinload(AllocationPlan.targets))
        .where(AllocationPlan.id == plan_id)
    ).scalar_one_or_none()


def get_primary_plan(db: Session) -> AllocationPlan | None:
    return db.execute(
        select(AllocationPlan).where(AllocationPlan.is_primary.is_(True))
    ).scalar_one_or_none()


def create_plan(db: Session, name: str, description: str | None = None, is_primary: bool = False) -> AllocationPlan:
    if is_primary:
        _clear_primary(db)
    plan = AllocationPlan(name=name, description=description, is_primary=is_primary)
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


def update_plan(db: Session, plan: AllocationPlan, name: str | None = None, description: str | None = None, is_primary: bool | None = None) -> AllocationPlan:
    if name is not None:
        plan.name = name
    if description is not None:
        plan.description = description
    if is_primary is not None:
        if is_primary:
            _clear_primary(db)
        plan.is_primary = is_primary
    db.commit()
    db.refresh(plan)
    return plan


def delete_plan(db: Session, plan: AllocationPlan) -> None:
    db.delete(plan)
    db.commit()


def _clear_primary(db: Session) -> None:
    """Set is_primary=False on all plans."""
    db.execute(
        update(AllocationPlan).where(AllocationPlan.is_primary.is_(True)).values(is_primary=False)
    )


# ---------------------------------------------------------------------------
# Target CRUD (plan-scoped)
# ---------------------------------------------------------------------------


def get_allocations(db: Session, plan_id: int) -> list[dict]:
    targets = list(
        db.execute(
            select(AllocationTarget, Tag.name)
            .join(Tag, AllocationTarget.tag_id == Tag.id)
            .where(AllocationTarget.plan_id == plan_id)
        ).all()
    )
    return [
        {
            "id": at.id,
            "plan_id": at.plan_id,
            "tag_id": at.tag_id,
            "tag_name": name,
            "target_pct": at.target_pct,
            "notes": at.notes,
            "created_at": at.created_at,
            "updated_at": at.updated_at,
        }
        for at, name in targets
    ]


def get_allocation_by_plan_and_tag(
    db: Session, plan_id: int, tag_id: int
) -> AllocationTarget | None:
    return db.execute(
        select(AllocationTarget).where(
            AllocationTarget.plan_id == plan_id,
            AllocationTarget.tag_id == tag_id,
        )
    ).scalar_one_or_none()


def set_allocation(
    db: Session,
    plan_id: int,
    tag_id: int,
    target_pct: float,
    notes: str | None = None,
) -> AllocationTarget:
    existing = get_allocation_by_plan_and_tag(db, plan_id, tag_id)
    if existing:
        existing.target_pct = target_pct
        existing.notes = notes
    else:
        existing = AllocationTarget(
            plan_id=plan_id, tag_id=tag_id, target_pct=target_pct, notes=notes
        )
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return existing


def delete_allocation(db: Session, allocation: AllocationTarget) -> None:
    db.delete(allocation)
    db.commit()


# ---------------------------------------------------------------------------
# Drift calculation (plan-scoped)
# ---------------------------------------------------------------------------


def get_drift(db: Session, plan_id: int) -> list[AllocationDrift]:
    targets = list(
        db.execute(
            select(AllocationTarget, Tag.name, Tag.color)
            .join(Tag, AllocationTarget.tag_id == Tag.id)
            .where(AllocationTarget.plan_id == plan_id)
        ).all()
    )

    if not targets:
        return []

    # Compute each tag's value first, then use plan-scoped total as denominator
    # so actual percentages reflect allocation within this plan only (no "Untagged").
    tag_values: list[tuple[AllocationTarget, str, str | None, float]] = []
    for at, tag_name, tag_color in targets:
        tag_ids = get_all_descendant_ids(db, at.tag_id)
        tag_value = _get_value_for_tags(db, tag_ids)
        tag_values.append((at, tag_name, tag_color, tag_value))

    plan_total = sum(v for _, _, _, v in tag_values)

    result = []
    for at, tag_name, tag_color, tag_value in tag_values:
        current_pct = (tag_value / plan_total * 100) if plan_total > 0 else 0

        result.append(
            AllocationDrift(
                tag_id=at.tag_id,
                tag_name=tag_name,
                tag_color=tag_color,
                target_pct=at.target_pct,
                current_pct=round(current_pct, 2),
                current_value=round(tag_value, 2),
                drift=round(current_pct - at.target_pct, 2),
            )
        )

    return result


# ---------------------------------------------------------------------------
# Portfolio value helpers (unchanged, plan-independent)
# ---------------------------------------------------------------------------


def _get_total_portfolio_value(db: Session) -> float:
    holdings_value = sum(
        h.current_value or 0
        for h in db.execute(select(Holding)).scalars().all()
    )

    fd_value = 0.0
    for fd in db.execute(select(FixedDeposit)).scalars().all():
        if fd.is_cumulative:
            fd_value += calculate_fd_current_value(
                principal=fd.principal,
                annual_rate=fd.interest_rate,
                compounding_frequency=fd.compounding_frequency,
                start_date=fd.start_date,
            )
        else:
            fd_value += fd.principal

    return holdings_value + fd_value


def _get_value_for_tags(db: Session, tag_ids: list[int]) -> float:
    # Use DISTINCT to avoid double-counting investments tagged with multiple
    # tags from the same tag_ids list.
    holding_ids = list(
        db.execute(
            select(HoldingTag.holding_id.distinct())
            .where(HoldingTag.tag_id.in_(tag_ids), HoldingTag.holding_id.is_not(None))
        ).scalars().all()
    )
    fd_ids = list(
        db.execute(
            select(HoldingTag.fd_id.distinct())
            .where(HoldingTag.tag_id.in_(tag_ids), HoldingTag.fd_id.is_not(None))
        ).scalars().all()
    )

    holdings_value = 0.0
    if holding_ids:
        holdings = list(
            db.execute(
                select(Holding).where(Holding.id.in_(holding_ids))
            ).scalars().all()
        )
        holdings_value = sum(h.current_value or 0 for h in holdings)

    fd_value = 0.0
    if fd_ids:
        fds = list(
            db.execute(
                select(FixedDeposit).where(FixedDeposit.id.in_(fd_ids))
            ).scalars().all()
        )
        for fd in fds:
            if fd.is_cumulative:
                fd_value += calculate_fd_current_value(
                    principal=fd.principal,
                    annual_rate=fd.interest_rate,
                    compounding_frequency=fd.compounding_frequency,
                    start_date=fd.start_date,
                )
            else:
                fd_value += fd.principal

    return holdings_value + fd_value
