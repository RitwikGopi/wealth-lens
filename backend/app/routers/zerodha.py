from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.zerodha import (
    ZerodhaCallback,
    ZerodhaConfigResponse,
    ZerodhaConfigUpdate,
    ZerodhaLoginUrl,
    ZerodhaSyncResponse,
)
from app.config import settings
from app.services import portfolio_service, zerodha_service

router = APIRouter(prefix="/zerodha", tags=["Zerodha"])

FRONTEND_SETTINGS_URL = f"{settings.frontend_url}/settings"


@router.get("/config", response_model=ZerodhaConfigResponse)
def get_config(db: Session = Depends(get_db)):
    config = zerodha_service.get_config(db)
    if not config:
        return ZerodhaConfigResponse(connected=False)
    return ZerodhaConfigResponse(
        connected=config.access_token is not None,
        api_key=config.api_key,
        last_sync_at=config.last_sync_at,
        token_expiry=config.token_expiry,
    )


@router.put("/config", response_model=ZerodhaConfigResponse)
def update_config(data: ZerodhaConfigUpdate, db: Session = Depends(get_db)):
    config = zerodha_service.save_config(db, data.api_key, data.api_secret)
    return ZerodhaConfigResponse(
        connected=config.access_token is not None,
        api_key=config.api_key,
        last_sync_at=config.last_sync_at,
        token_expiry=config.token_expiry,
    )


@router.get("/login-url", response_model=ZerodhaLoginUrl)
def get_login_url(db: Session = Depends(get_db)):
    config = zerodha_service.get_config(db)
    if not config:
        raise HTTPException(
            status_code=400, detail="Zerodha API key not configured"
        )
    url = zerodha_service.get_login_url(config)
    return ZerodhaLoginUrl(login_url=url)


@router.get("/callback")
def handle_callback(
    request_token: str = Query(None),
    action: str = Query(None),
    status: str = Query(None),
    db: Session = Depends(get_db),
):
    """Zerodha redirects here after login with request_token as query param."""
    if not request_token:
        return RedirectResponse(
            url=f"{FRONTEND_SETTINGS_URL}?zerodha_error=missing_token"
        )
    config = zerodha_service.get_config(db)
    if not config:
        return RedirectResponse(
            url=f"{FRONTEND_SETTINGS_URL}?zerodha_error=not_configured"
        )
    try:
        zerodha_service.handle_callback(db, config, request_token)
        return RedirectResponse(
            url=f"{FRONTEND_SETTINGS_URL}?zerodha_auth=success"
        )
    except Exception as e:
        return RedirectResponse(
            url=f"{FRONTEND_SETTINGS_URL}?zerodha_error={str(e)[:100]}"
        )


@router.post("/sync", response_model=ZerodhaSyncResponse)
def sync_holdings(db: Session = Depends(get_db)):
    config = zerodha_service.get_config(db)
    if not config or not config.access_token:
        raise HTTPException(
            status_code=400,
            detail="Zerodha not connected. Complete authentication first.",
        )
    count = zerodha_service.sync_holdings(db, config)
    mf_count = zerodha_service.sync_mf_holdings(db, config)
    portfolio_service.take_snapshot(db)
    return ZerodhaSyncResponse(
        synced_count=count + mf_count,
        message=f"Synced {count} holdings and {mf_count} mutual funds from Zerodha",
        snapshot_taken=True,
    )


@router.get("/prices")
def fetch_prices(db: Session = Depends(get_db)):
    config = zerodha_service.get_config(db)
    if not config or not config.access_token:
        raise HTTPException(
            status_code=400,
            detail="Zerodha not connected. Complete authentication first.",
        )
    count = zerodha_service.fetch_prices(db, config)
    return {"updated_count": count, "message": f"Updated prices for {count} holdings"}
