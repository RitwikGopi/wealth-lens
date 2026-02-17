import logging
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.models.holding import Holding
from app.models.transaction import Transaction
from app.models.zerodha_config import ZerodhaConfig


def get_config(db: Session) -> ZerodhaConfig | None:
    return db.execute(select(ZerodhaConfig)).scalar_one_or_none()


def save_config(db: Session, api_key: str, api_secret: str) -> ZerodhaConfig:
    config = get_config(db)
    if config:
        config.api_key = api_key
        config.api_secret = api_secret
    else:
        config = ZerodhaConfig(api_key=api_key, api_secret=api_secret)
        db.add(config)
    db.commit()
    db.refresh(config)
    return config


def get_login_url(config: ZerodhaConfig) -> str:
    try:
        from kiteconnect import KiteConnect

        kite = KiteConnect(api_key=config.api_key)
        return kite.login_url()
    except ImportError:
        return f"https://kite.zerodha.com/connect/login?v=3&api_key={config.api_key}"


def handle_callback(db: Session, config: ZerodhaConfig, request_token: str) -> None:
    from datetime import datetime, timedelta

    try:
        from kiteconnect import KiteConnect

        kite = KiteConnect(api_key=config.api_key)
        data = kite.generate_session(request_token, api_secret=config.api_secret)
        config.access_token = data["access_token"]
        config.request_token = request_token
        config.token_expiry = datetime.now() + timedelta(hours=24)
    except ImportError:
        config.request_token = request_token
        config.token_expiry = datetime.now() + timedelta(hours=24)

    db.commit()
    db.refresh(config)


def sync_holdings(db: Session, config: ZerodhaConfig) -> int:
    from datetime import datetime

    try:
        from kiteconnect import KiteConnect
        from kiteconnect import exceptions as kite_exceptions

        kite = KiteConnect(api_key=config.api_key)
        kite.set_access_token(config.access_token)
        kite_holdings = kite.holdings()
    except ImportError:
        logger.error("kiteconnect not installed, skipping equity sync")
        return 0
    except kite_exceptions.TokenException:
        raise
    except Exception as e:
        logger.error("Failed to fetch holdings from Zerodha: %s", e)
        return 0

    logger.info("Fetched %d equity holdings from Zerodha", len(kite_holdings))

    count = 0
    total_buys = 0.0
    total_sells = 0.0

    for h in kite_holdings:
        existing = db.execute(
            select(Holding).where(
                Holding.zerodha_trading_symbol == h["tradingsymbol"],
                Holding.source == "zerodha",
            )
        ).scalar_one_or_none()

        if existing:
            old_quantity = existing.quantity
            old_price = existing.current_price
            old_avg = existing.average_price
            existing.quantity = h.get("quantity", existing.quantity)
            existing.average_price = h.get("average_price", existing.average_price)
            existing.current_price = h.get("last_price", existing.current_price)
            logger.info(
                "UPDATE %s: qty %s->%s, avg_price %s->%s, current_price %s->%s",
                h["tradingsymbol"],
                old_quantity, existing.quantity,
                old_avg, existing.average_price,
                old_price, existing.current_price,
            )
            if existing.current_price and existing.quantity:
                existing.current_value = existing.quantity * existing.current_price
                existing.pnl = existing.current_value - (
                    existing.quantity * existing.average_price
                )
                logger.info(
                    "  -> current_value=%.2f, pnl=%.2f",
                    existing.current_value, existing.pnl,
                )

            qty_diff = existing.quantity - old_quantity
            if qty_diff > 0:
                buy_price = h.get("average_price", 0)
                buy_amount = abs(qty_diff) * buy_price
                total_buys += buy_amount
                txn = Transaction(
                    type="buy",
                    holding_id=existing.id,
                    amount=buy_amount,
                    quantity=abs(qty_diff),
                    price=buy_price,
                    date=date.today(),
                    source="auto_sync",
                )
                db.add(txn)
            elif qty_diff < 0:
                last_price = h.get("last_price", 0)
                avg_price = h.get("average_price", 0)
                sell_amount = abs(qty_diff) * last_price
                realized_pnl = (last_price - avg_price) * abs(qty_diff)
                total_sells += sell_amount
                txn = Transaction(
                    type="sell",
                    holding_id=existing.id,
                    amount=sell_amount,
                    quantity=abs(qty_diff),
                    price=last_price,
                    realized_pnl=realized_pnl,
                    date=date.today(),
                    source="auto_sync",
                )
                db.add(txn)
        else:
            logger.info(
                "NEW %s: qty=%s, avg_price=%s, current_price=%s",
                h.get("tradingsymbol"),
                h.get("quantity"), h.get("average_price"), h.get("last_price"),
            )
            holding = Holding(
                symbol=h.get("tradingsymbol", ""),
                exchange=h.get("exchange", "NSE"),
                instrument_type=h.get("instrument_type", "EQ"),
                quantity=h.get("quantity", 0),
                average_price=h.get("average_price", 0),
                current_price=h.get("last_price"),
                source="zerodha",
                zerodha_trading_symbol=h.get("tradingsymbol"),
            )
            if holding.current_price and holding.quantity:
                holding.current_value = holding.quantity * holding.current_price
                holding.pnl = holding.current_value - (
                    holding.quantity * holding.average_price
                )
            db.add(holding)
            db.flush()

            price = h.get("average_price", 0)
            qty = h.get("quantity", 0)
            buy_amount = qty * price
            total_buys += buy_amount
            txn = Transaction(
                type="buy",
                holding_id=holding.id,
                amount=buy_amount,
                quantity=qty,
                price=price,
                date=date.today(),
                source="auto_sync",
            )
            db.add(txn)
        count += 1

    # Create a deposit transaction for net inflow (buys minus sells)
    net_inflow = total_buys - total_sells
    logger.info(
        "Equity sync complete: %d holdings, total_buys=%.2f, total_sells=%.2f, net_inflow=%.2f",
        count, total_buys, total_sells, net_inflow,
    )
    if net_inflow > 0:
        deposit_txn = Transaction(
            type="deposit",
            amount=net_inflow,
            date=date.today(),
            source="auto_sync",
            notes="Auto-deposit for net inflow from Zerodha equity sync",
        )
        db.add(deposit_txn)

    config.last_sync_at = datetime.now()
    db.commit()
    return count


def sync_mf_holdings(db: Session, config: ZerodhaConfig) -> int:
    try:
        from kiteconnect import KiteConnect
        from kiteconnect import exceptions as kite_exceptions

        kite = KiteConnect(api_key=config.api_key)
        kite.set_access_token(config.access_token)
        kite_mf_holdings = kite.mf_holdings()
    except ImportError:
        logger.error("kiteconnect not installed, skipping MF sync")
        return 0
    except kite_exceptions.TokenException:
        raise
    except Exception as e:
        logger.error("Failed to fetch MF holdings from Zerodha: %s", e)
        return 0

    logger.info("Fetched %d MF holdings from Zerodha", len(kite_mf_holdings))

    count = 0
    total_buys = 0.0
    total_sells = 0.0

    for h in kite_mf_holdings:
        existing = db.execute(
            select(Holding).where(
                Holding.zerodha_trading_symbol == h["tradingsymbol"],
                Holding.source == "zerodha",
            )
        ).scalar_one_or_none()

        if existing:
            old_quantity = existing.quantity
            old_price = existing.current_price
            old_avg = existing.average_price
            existing.quantity = h.get("quantity", existing.quantity)
            existing.average_price = h.get("average_price", existing.average_price)
            existing.current_price = h.get("last_price", existing.current_price)
            logger.info(
                "UPDATE MF %s: qty %s->%s, avg_price %s->%s, current_price %s->%s",
                h["tradingsymbol"],
                old_quantity, existing.quantity,
                old_avg, existing.average_price,
                old_price, existing.current_price,
            )
            if existing.current_price and existing.quantity:
                existing.current_value = existing.quantity * existing.current_price
                existing.pnl = existing.current_value - (
                    existing.quantity * existing.average_price
                )
                logger.info(
                    "  -> current_value=%.2f, pnl=%.2f",
                    existing.current_value, existing.pnl,
                )

            qty_diff = existing.quantity - old_quantity
            if qty_diff > 0:
                buy_price = h.get("average_price", 0)
                buy_amount = abs(qty_diff) * buy_price
                total_buys += buy_amount
                txn = Transaction(
                    type="buy",
                    holding_id=existing.id,
                    amount=buy_amount,
                    quantity=abs(qty_diff),
                    price=buy_price,
                    date=date.today(),
                    source="auto_sync",
                )
                db.add(txn)
            elif qty_diff < 0:
                last_price = h.get("last_price", 0)
                avg_price = h.get("average_price", 0)
                sell_amount = abs(qty_diff) * last_price
                realized_pnl = (last_price - avg_price) * abs(qty_diff)
                total_sells += sell_amount
                txn = Transaction(
                    type="sell",
                    holding_id=existing.id,
                    amount=sell_amount,
                    quantity=abs(qty_diff),
                    price=last_price,
                    realized_pnl=realized_pnl,
                    date=date.today(),
                    source="auto_sync",
                )
                db.add(txn)
        else:
            logger.info(
                "NEW MF %s: qty=%s, avg_price=%s, current_price=%s",
                h.get("tradingsymbol"),
                h.get("quantity"), h.get("average_price"), h.get("last_price"),
            )
            holding = Holding(
                symbol=h.get("fund", ""),
                exchange="MF",
                instrument_type="MF",
                quantity=h.get("quantity", 0),
                average_price=h.get("average_price", 0),
                current_price=h.get("last_price"),
                source="zerodha",
                zerodha_trading_symbol=h.get("tradingsymbol"),
            )
            if holding.current_price and holding.quantity:
                holding.current_value = holding.quantity * holding.current_price
                holding.pnl = holding.current_value - (
                    holding.quantity * holding.average_price
                )
            db.add(holding)
            db.flush()

            price = h.get("average_price", 0)
            qty = h.get("quantity", 0)
            buy_amount = qty * price
            total_buys += buy_amount
            txn = Transaction(
                type="buy",
                holding_id=holding.id,
                amount=buy_amount,
                quantity=qty,
                price=price,
                date=date.today(),
                source="auto_sync",
            )
            db.add(txn)
        count += 1

    # Create a deposit transaction for net inflow (buys minus sells)
    net_inflow = total_buys - total_sells
    logger.info(
        "MF sync complete: %d holdings, total_buys=%.2f, total_sells=%.2f, net_inflow=%.2f",
        count, total_buys, total_sells, net_inflow,
    )
    if net_inflow > 0:
        deposit_txn = Transaction(
            type="deposit",
            amount=net_inflow,
            date=date.today(),
            source="auto_sync",
            notes="Auto-deposit for net inflow from Zerodha MF sync",
        )
        db.add(deposit_txn)

    return count


def fetch_prices(db: Session, config: ZerodhaConfig) -> int:
    try:
        from kiteconnect import KiteConnect

        kite = KiteConnect(api_key=config.api_key)
        kite.set_access_token(config.access_token)
    except ImportError:
        logger.error("kiteconnect not installed, skipping price fetch")
        return 0
    except Exception as e:
        logger.error("Failed to init Kite for price fetch: %s", e)
        return 0

    holdings = list(
        db.execute(
            select(Holding).where(Holding.source == "zerodha")
        ).scalars().all()
    )

    if not holdings:
        logger.info("No zerodha holdings found, skipping price fetch")
        return 0

    instruments = []
    for h in holdings:
        if h.zerodha_trading_symbol:
            instruments.append(f"{h.exchange}:{h.zerodha_trading_symbol}")

    if not instruments:
        return 0

    logger.info("Fetching prices for %d instruments", len(instruments))

    try:
        quotes = kite.quote(instruments)
    except Exception as e:
        logger.error("Failed to fetch quotes: %s", e)
        return 0

    count = 0
    for h in holdings:
        key = f"{h.exchange}:{h.zerodha_trading_symbol}"
        if key in quotes:
            old_price = h.current_price
            h.current_price = quotes[key].get("last_price", h.current_price)
            if h.current_price and h.quantity:
                h.current_value = h.quantity * h.current_price
                h.pnl = h.current_value - (h.quantity * h.average_price)
            logger.info(
                "PRICE %s: %s -> %s (value=%.2f, pnl=%.2f)",
                h.symbol, old_price, h.current_price,
                h.current_value or 0, h.pnl or 0,
            )
            count += 1

    logger.info("Price fetch complete: updated %d holdings", count)
    db.commit()
    return count
