from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.portfolio import (
    BackfillRequest,
    BackfillResponse,
    LifetimeGainsResponse,
    PortfolioSummary,
    SnapshotResponse,
    SnapshotWithReturnResponse,
    WithdrawalTimelineEntry,
)
from app.services import backfill_service, portfolio_service

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


@router.get("/summary", response_model=PortfolioSummary)
def get_summary(db: Session = Depends(get_db)):
    return portfolio_service.get_summary(db)


@router.get("/lifetime-gains", response_model=LifetimeGainsResponse)
def get_lifetime_gains(db: Session = Depends(get_db)):
    return portfolio_service.get_lifetime_gains(db)


@router.get(
    "/withdrawal-timeline", response_model=list[WithdrawalTimelineEntry]
)
def get_withdrawal_timeline(
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
):
    return portfolio_service.get_withdrawal_timeline(db, date_from, date_to)


@router.get("/snapshots", response_model=list[SnapshotWithReturnResponse])
def get_snapshots(
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
):
    return portfolio_service.get_snapshots_with_returns(db, date_from, date_to)


@router.post("/snapshots", response_model=SnapshotResponse, status_code=201)
def take_snapshot(db: Session = Depends(get_db)):
    return portfolio_service.take_snapshot(db)


@router.post("/backfill", response_model=BackfillResponse)
def backfill_snapshots(
    data: BackfillRequest,
    db: Session = Depends(get_db),
):
    try:
        result = backfill_service.backfill_from_kite_portal(db, data.kite_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backfill failed: {str(e)}")

    created = result["snapshots_created"]
    updated = result["snapshots_updated"]
    errors = result.get("errors", [])

    parts = []
    if created:
        parts.append(f"Created {created} snapshots")
    if updated:
        parts.append(f"Updated {updated} snapshots")
    msg = ", ".join(parts) if parts else "No snapshots processed"

    return BackfillResponse(
        snapshots_created=created,
        snapshots_updated=updated,
        message=msg,
        errors=errors,
    )
