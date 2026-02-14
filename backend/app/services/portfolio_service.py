import json
import logging
from datetime import date, timedelta

from sqlalchemy import func as sa_func
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.sql.functions import coalesce

from app.models.fixed_deposit import FixedDeposit
from app.models.holding import Holding
from app.models.portfolio_snapshot import PortfolioSnapshot
from app.models.transaction import Transaction
from app.models.zerodha_config import ZerodhaConfig
from app.schemas.portfolio import (
    LifetimeGainsResponse,
    PortfolioSummary,
    WithdrawalTimelineEntry,
)
from app.utils.calculations import calculate_fd_current_value

logger = logging.getLogger(__name__)


def get_summary(db: Session) -> PortfolioSummary:
    holdings = list(db.execute(select(Holding)).scalars().all())
    fds = list(db.execute(select(FixedDeposit)).scalars().all())

    holdings_value = sum(h.current_value or 0 for h in holdings)
    holdings_pnl = sum(h.pnl or 0 for h in holdings)

    fd_value = 0.0
    fd_principal = 0.0
    for fd in fds:
        # Closed FDs are excluded (money already withdrawn)
        if fd.status == "closed":
            continue
        if fd.is_cumulative:
            # Cap at maturity_date for matured-but-not-closed FDs
            as_of = date.today()
            if fd.maturity_date and fd.maturity_date < as_of:
                as_of = fd.maturity_date
            fd_value += calculate_fd_current_value(
                principal=fd.principal,
                annual_rate=fd.interest_rate,
                compounding_frequency=fd.compounding_frequency,
                start_date=fd.start_date,
                as_of=as_of,
            )
            fd_principal += fd.principal
        else:
            fd_value += fd.principal

    fd_interest = fd_value - fd_principal
    total_pnl = holdings_pnl + fd_interest

    config = db.execute(select(ZerodhaConfig)).scalar_one_or_none()
    last_sync_at = config.last_sync_at if config else None

    return PortfolioSummary(
        total_value=holdings_value + fd_value,
        holdings_value=holdings_value,
        fd_value=fd_value,
        total_pnl=total_pnl,
        holdings_count=len(holdings),
        fd_count=len(fds),
        last_sync_at=last_sync_at,
    )


def get_snapshots(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[PortfolioSnapshot]:
    stmt = select(PortfolioSnapshot).order_by(PortfolioSnapshot.date.desc())

    if date_from:
        stmt = stmt.where(PortfolioSnapshot.date >= date_from)
    if date_to:
        stmt = stmt.where(PortfolioSnapshot.date <= date_to)

    return list(db.execute(stmt).scalars().all())


def take_snapshot(db: Session) -> PortfolioSnapshot:
    summary = get_summary(db)
    today = date.today()

    existing = db.execute(
        select(PortfolioSnapshot).where(PortfolioSnapshot.date == today)
    ).scalar_one_or_none()

    breakdown = json.dumps(
        {
            "holdings_value": summary.holdings_value,
            "fd_value": summary.fd_value,
            "total_pnl": summary.total_pnl,
        }
    )

    if existing:
        existing.total_value = summary.total_value
        existing.holdings_value = summary.holdings_value
        existing.fd_value = summary.fd_value
        existing.breakdown = breakdown
    else:
        existing = PortfolioSnapshot(
            date=today,
            total_value=summary.total_value,
            holdings_value=summary.holdings_value,
            fd_value=summary.fd_value,
            breakdown=breakdown,
        )
        db.add(existing)

    db.commit()
    db.refresh(existing)
    return existing


def recalculate_fd_in_snapshots(db: Session) -> int:
    """Recalculate fd_value and total_value for all existing snapshots.

    Called after FD create/update/delete so historical chart data stays accurate.
    Returns the number of snapshots updated.
    """
    fds = list(db.execute(select(FixedDeposit)).scalars().all())
    snapshots = list(db.execute(select(PortfolioSnapshot)).scalars().all())

    count = 0
    for snap in snapshots:
        fd_value = 0.0
        for fd in fds:
            if fd.start_date > snap.date:
                continue
            # Closed FD: exclude from snapshots after closure_date
            if fd.status == "closed" and fd.closure_date and fd.closure_date <= snap.date:
                continue
            if fd.is_cumulative:
                # Cap at maturity for snapshots after maturity
                effective_date = snap.date
                if fd.maturity_date and snap.date > fd.maturity_date:
                    effective_date = fd.maturity_date
                fd_value += calculate_fd_current_value(
                    principal=fd.principal,
                    annual_rate=fd.interest_rate,
                    compounding_frequency=fd.compounding_frequency,
                    start_date=fd.start_date,
                    as_of=effective_date,
                )
            else:
                fd_value += fd.principal

        snap.fd_value = fd_value
        snap.total_value = snap.holdings_value + fd_value

        # Update breakdown JSON if it exists
        if snap.breakdown:
            try:
                bd = json.loads(snap.breakdown)
                bd["fd_value"] = fd_value
                snap.breakdown = json.dumps(bd)
            except (json.JSONDecodeError, TypeError):
                pass

        count += 1

    db.commit()
    return count


def backfill_fd_snapshots(db: Session) -> int:
    """Generate daily historical snapshots from earliest FD start_date to yesterday.

    Only creates snapshots for dates that don't already have one.
    Called after FD create/update so the growth chart is immediately populated.
    Returns the number of new snapshots created.
    """
    fds = list(db.execute(select(FixedDeposit)).scalars().all())
    if not fds:
        return 0

    # Only consider active FDs for backfill (closed FDs don't need new snapshots)
    active_fds = [fd for fd in fds if fd.status != "closed"]
    if not active_fds:
        return 0

    # Find earliest start_date across all active FDs
    earliest = min(fd.start_date for fd in active_fds)
    yesterday = date.today() - timedelta(days=1)

    if earliest > yesterday:
        return 0

    # Get all existing snapshot dates for fast lookup
    existing_dates = set(
        db.execute(select(PortfolioSnapshot.date)).scalars().all()
    )

    # Generate daily snapshots for missing dates
    created = 0
    current = earliest
    while current <= yesterday:
        if current not in existing_dates:
            # Calculate FD value as of this date (use all FDs, not just active)
            fd_value = 0.0
            for fd in fds:
                if fd.start_date > current:
                    continue
                # Closed FD: exclude after closure_date
                if fd.status == "closed" and fd.closure_date and fd.closure_date <= current:
                    continue
                if fd.is_cumulative:
                    # Cap at maturity for dates after maturity
                    effective_date = current
                    if fd.maturity_date and current > fd.maturity_date:
                        effective_date = fd.maturity_date
                    fd_value += calculate_fd_current_value(
                        principal=fd.principal,
                        annual_rate=fd.interest_rate,
                        compounding_frequency=fd.compounding_frequency,
                        start_date=fd.start_date,
                        as_of=effective_date,
                    )
                else:
                    fd_value += fd.principal

            active_principal = sum(
                fd.principal
                for fd in fds
                if fd.start_date <= current
                and not (fd.status == "closed" and fd.closure_date and fd.closure_date <= current)
            )
            breakdown = json.dumps(
                {
                    "holdings_value": 0.0,
                    "fd_value": fd_value,
                    "total_pnl": fd_value - active_principal,
                }
            )

            db.add(
                PortfolioSnapshot(
                    date=current,
                    total_value=fd_value,
                    holdings_value=0.0,
                    fd_value=fd_value,
                    breakdown=breakdown,
                )
            )
            created += 1

        current += timedelta(days=1)

    if created > 0:
        db.commit()
        logger.info("Backfilled %d daily FD snapshots from %s to %s", created, earliest, yesterday)

    return created


def get_lifetime_gains(db: Session) -> LifetimeGainsResponse:
    """Compute lifetime gains including withdrawals.

    Uses deposit transactions as the source of truth for total invested,
    following the formula: Lifetime Gain = Current Value + Withdrawn - Deposited.
    """
    summary = get_summary(db)

    # Total invested = sum of all deposit transactions
    total_invested = db.execute(
        select(coalesce(sa_func.sum(Transaction.amount), 0.0)).where(
            Transaction.type == "deposit"
        )
    ).scalar_one()

    total_withdrawn = db.execute(
        select(coalesce(sa_func.sum(Transaction.amount), 0.0)).where(
            Transaction.type == "withdrawal"
        )
    ).scalar_one()

    withdrawal_count = db.execute(
        select(sa_func.count()).where(Transaction.type == "withdrawal")
    ).scalar_one()

    current_value = summary.total_value
    net_invested = total_invested - total_withdrawn
    lifetime_gain = current_value + total_withdrawn - total_invested
    lifetime_gain_pct = (
        (lifetime_gain / total_invested) * 100 if total_invested > 0 else None
    )

    # summary.total_pnl already includes holdings P&L + FD interest.
    # Decompose to get the separate parts.
    holdings = list(db.execute(select(Holding)).scalars().all())
    holdings_pnl = sum(h.pnl or 0 for h in holdings)
    fd_interest = summary.total_pnl - holdings_pnl

    unrealized_pnl = summary.total_pnl
    realized_pnl = lifetime_gain - unrealized_pnl

    return LifetimeGainsResponse(
        total_invested=total_invested,
        total_withdrawn=total_withdrawn,
        net_invested=net_invested,
        current_portfolio_value=current_value,
        lifetime_gain=lifetime_gain,
        lifetime_gain_pct=lifetime_gain_pct,
        unrealized_pnl=unrealized_pnl,
        holdings_pnl=holdings_pnl,
        fd_interest=fd_interest,
        realized_pnl=realized_pnl,
        withdrawal_count=withdrawal_count,
    )


def get_withdrawal_timeline(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[WithdrawalTimelineEntry]:
    """Return chronological withdrawal transactions with running cumulative total."""
    stmt = (
        select(Transaction)
        .where(Transaction.type == "withdrawal")
        .order_by(Transaction.date.asc())
    )
    if date_from:
        stmt = stmt.where(Transaction.date >= date_from)
    if date_to:
        stmt = stmt.where(Transaction.date <= date_to)

    withdrawals = list(db.execute(stmt).scalars().all())

    result: list[WithdrawalTimelineEntry] = []
    cumulative = 0.0
    for w in withdrawals:
        cumulative += w.amount
        result.append(
            WithdrawalTimelineEntry(
                date=w.date,
                amount=w.amount,
                cumulative=cumulative,
                notes=w.notes,
            )
        )
    return result


def get_snapshots_with_returns(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict]:
    """Get snapshots enriched with total_return (value + cumulative withdrawals)."""
    snapshots = get_snapshots(db, date_from, date_to)

    # Fetch all withdrawals sorted by date
    all_withdrawals = list(
        db.execute(
            select(Transaction)
            .where(Transaction.type == "withdrawal")
            .order_by(Transaction.date.asc())
        )
        .scalars()
        .all()
    )

    # Build cumulative withdrawal amounts by date
    cumulative_by_date: list[tuple[date, float]] = []
    cumulative = 0.0
    for w in all_withdrawals:
        cumulative += w.amount
        cumulative_by_date.append((w.date, cumulative))

    def _cumulative_withdrawn_as_of(as_of: date) -> float:
        """Binary-search for cumulative withdrawal total up to a given date."""
        result = 0.0
        for d, c in cumulative_by_date:
            if d <= as_of:
                result = c
            else:
                break
        return result

    enriched = []
    for snap in snapshots:
        cum_withdrawn = _cumulative_withdrawn_as_of(snap.date)
        enriched.append(
            {
                "id": snap.id,
                "date": snap.date,
                "total_value": snap.total_value,
                "holdings_value": snap.holdings_value,
                "fd_value": snap.fd_value,
                "breakdown": snap.breakdown,
                "total_return": snap.total_value + cum_withdrawn,
                "created_at": snap.created_at,
            }
        )
    return enriched
