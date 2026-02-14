import json
import logging
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fixed_deposit import FixedDeposit
from app.models.portfolio_snapshot import PortfolioSnapshot
from app.utils.calculations import calculate_fd_current_value

logger = logging.getLogger(__name__)


def backfill_from_kite_portal(
    db: Session,
    kite_data: dict,
) -> dict:
    """Parse Kite portal historical JSON and upsert portfolio snapshots.

    Returns {"snapshots_created": int, "snapshots_updated": int, "errors": list[str]}
    """
    # Validate top-level structure
    if kite_data.get("status") != "success":
        raise ValueError(
            f"Expected status 'success', got '{kite_data.get('status')}'"
        )

    data = kite_data.get("data")
    if not isinstance(data, dict):
        raise ValueError("Missing or invalid 'data' field")

    if data.get("state") != "SUCCESS":
        raise ValueError(
            f"Expected data.state 'SUCCESS', got '{data.get('state')}'"
        )

    result = data.get("result")
    if not isinstance(result, dict):
        raise ValueError("Missing or invalid 'data.result' field")

    errors: list[str] = []
    created = 0
    updated = 0

    # Load FDs once for calculating FD values per date
    fds = list(db.execute(select(FixedDeposit)).scalars().all())

    for date_str, day_data in result.items():
        try:
            snapshot_date = date.fromisoformat(date_str)
        except (ValueError, TypeError):
            errors.append(f"Invalid date key: {date_str}")
            continue

        try:
            portfolio = day_data.get("portfolio", {})
            holdings_value = portfolio.get("total_value", 0.0)

            kite_equity = portfolio.get("equity", 0.0)
            kite_mf = portfolio.get("mutual_fund", 0.0)

            # Calculate FD value as of this date
            fd_value = 0.0
            for fd in fds:
                if fd.start_date > snapshot_date:
                    continue
                if fd.maturity_date and fd.maturity_date < snapshot_date:
                    continue
                if fd.is_cumulative:
                    fd_value += calculate_fd_current_value(
                        principal=fd.principal,
                        annual_rate=fd.interest_rate,
                        compounding_frequency=fd.compounding_frequency,
                        start_date=fd.start_date,
                        as_of=snapshot_date,
                    )
                else:
                    fd_value += fd.principal

            total_value = holdings_value + fd_value

            breakdown = json.dumps({
                "holdings_value": holdings_value,
                "fd_value": fd_value,
                "kite_equity": kite_equity,
                "kite_mf": kite_mf,
            })

            existing = db.execute(
                select(PortfolioSnapshot).where(
                    PortfolioSnapshot.date == snapshot_date
                )
            ).scalar_one_or_none()

            if existing:
                existing.total_value = total_value
                existing.holdings_value = holdings_value
                existing.fd_value = fd_value
                existing.breakdown = breakdown
                updated += 1
            else:
                db.add(PortfolioSnapshot(
                    date=snapshot_date,
                    total_value=total_value,
                    holdings_value=holdings_value,
                    fd_value=fd_value,
                    breakdown=breakdown,
                ))
                created += 1

        except Exception as e:
            msg = f"Error processing {date_str}: {e}"
            logger.warning(msg)
            errors.append(msg)

    db.commit()
    return {
        "snapshots_created": created,
        "snapshots_updated": updated,
        "errors": errors,
    }
