import logging

from apscheduler.schedulers.background import BackgroundScheduler

from app.database import SessionLocal

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def _take_daily_snapshot():
    from app.services import portfolio_service, zerodha_service

    db = SessionLocal()
    try:
        # Sync holdings from Zerodha first to get latest prices
        config = zerodha_service.get_config(db)
        if config and config.access_token:
            try:
                eq = zerodha_service.sync_holdings(db, config)
                mf = zerodha_service.sync_mf_holdings(db, config)
                logger.info("Pre-snapshot sync: %d equity, %d MF holdings synced", eq, mf)
            except Exception:
                logger.exception("Pre-snapshot Zerodha sync failed, continuing with snapshot")

        snapshot = portfolio_service.take_snapshot(db)
        logger.info("Daily snapshot taken: date=%s total_value=%.2f", snapshot.date, snapshot.total_value)
    except Exception:
        logger.exception("Failed to take daily snapshot")
    finally:
        db.close()


def start():
    global _scheduler
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        _take_daily_snapshot,
        trigger="cron",
        hour=0,
        minute=0,
        id="daily_snapshot",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Scheduler started — daily snapshot job scheduled at 00:00")


def shutdown():
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler shut down")
        _scheduler = None
