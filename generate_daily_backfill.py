#!/usr/bin/env python3
"""Generate daily Kite backfill data and update demo-data.json."""

import json
import random
from datetime import date, timedelta
from pathlib import Path

# Anchor points: (date, equity holdings value)
# These represent known portfolio values at key dates
ANCHORS = [
    ("2025-01-15", 66600.00),
    ("2025-01-31", 135400.00),
    ("2025-02-28", 188925.00),
    ("2025-03-31", 242680.00),
    ("2025-04-30", 318450.00),
    ("2025-05-31", 355200.00),
    ("2025-06-30", 388900.00),
    ("2025-07-31", 435420.00),
    ("2025-08-31", 462350.00),
    ("2025-09-30", 495800.00),
    ("2025-10-31", 525600.00),
    ("2025-11-30", 548300.00),
    ("2025-12-31", 562750.00),
    ("2026-01-31", 585200.00),
    ("2026-02-12", 631777.55),
]

# Indian market holidays 2025-2026 (major ones)
HOLIDAYS = {
    date(2025, 1, 26),  # Republic Day
    date(2025, 2, 26),  # Maha Shivaratri
    date(2025, 3, 14),  # Holi
    date(2025, 3, 31),  # Id-ul-Fitr
    date(2025, 4, 1),   # Annual bank closing
    date(2025, 4, 10),  # Mahavir Jayanti
    date(2025, 4, 14),  # Ambedkar Jayanti
    date(2025, 4, 18),  # Good Friday
    date(2025, 5, 1),   # May Day
    date(2025, 5, 12),  # Buddha Purnima
    date(2025, 6, 7),   # Bakrid
    date(2025, 7, 6),   # Muharram
    date(2025, 8, 15),  # Independence Day
    date(2025, 8, 16),  # Janmashtami
    date(2025, 9, 5),   # Milad-un-Nabi
    date(2025, 10, 2),  # Gandhi Jayanti
    date(2025, 10, 20), # Diwali (Laxmi Pujan)
    date(2025, 10, 21), # Diwali (Balipratipada)
    date(2025, 11, 5),  # Guru Nanak Jayanti
    date(2025, 12, 25), # Christmas
    date(2026, 1, 26),  # Republic Day
}


def is_trading_day(d: date) -> bool:
    """Check if a date is a trading day (not weekend, not holiday)."""
    if d.weekday() >= 5:  # Saturday=5, Sunday=6
        return False
    if d in HOLIDAYS:
        return False
    return True


def generate_daily_values() -> dict[str, float]:
    """Generate daily portfolio values by interpolating between anchors with noise."""
    random.seed(42)  # Reproducible

    anchor_dates = [date.fromisoformat(a[0]) for a in ANCHORS]
    anchor_values = [a[1] for a in ANCHORS]

    # Get all trading days in the range
    start = anchor_dates[0]
    end = anchor_dates[-1]

    trading_days = []
    d = start
    while d <= end:
        if is_trading_day(d):
            trading_days.append(d)
        d += timedelta(days=1)

    # For each pair of anchors, distribute daily values with random walk noise
    daily: dict[date, float] = {}

    for i in range(len(anchor_dates) - 1):
        seg_start = anchor_dates[i]
        seg_end = anchor_dates[i + 1]
        val_start = anchor_values[i]
        val_end = anchor_values[i + 1]

        # Get trading days in this segment
        seg_days = [d for d in trading_days if seg_start <= d <= seg_end]
        if not seg_days:
            continue

        n = len(seg_days)
        if n == 1:
            daily[seg_days[0]] = val_start
            continue

        # Linear trend + random walk noise
        trend_step = (val_end - val_start) / (n - 1)

        # Generate random walk deviations
        # Daily volatility ~0.8-1.2% of value, typical for Indian equity
        deviations = [0.0]
        for j in range(1, n - 1):
            base_val = val_start + trend_step * j
            daily_vol = base_val * random.uniform(0.004, 0.012)
            noise = random.gauss(0, daily_vol)
            deviations.append(noise)
        deviations.append(0.0)  # End matches anchor exactly

        # Accumulate and normalize so endpoints match
        cumulative = [0.0]
        for j in range(1, n):
            cumulative.append(cumulative[-1] + deviations[j])

        # Remove the drift from cumulative noise so endpoints match anchors
        for j in range(n):
            t = j / (n - 1) if n > 1 else 0
            base = val_start + (val_end - val_start) * t
            adjustment = cumulative[j] - cumulative[-1] * t  # Remove linear drift of noise
            daily[seg_days[j]] = round(base + adjustment, 2)

        # Force exact anchor values
        daily[seg_start] = val_start
        daily[seg_end] = val_end

    # Fill every calendar day (weekends/holidays carry forward last value)
    all_days: dict[date, float] = {}
    sorted_trading = sorted(daily.items())
    d = start
    last_val = sorted_trading[0][1]
    while d <= end:
        if d in daily:
            last_val = daily[d]
        all_days[d] = last_val
        d += timedelta(days=1)

    return {d.isoformat(): v for d, v in sorted(all_days.items())}


def main():
    daily_values = generate_daily_values()

    # Build Kite portal JSON
    result = {}
    for date_str, value in daily_values.items():
        result[date_str] = {
            "portfolio": {
                "total_value": value,
                "equity": value,
                "mutual_fund": 0.0,
            }
        }

    kite_data = {
        "status": "success",
        "data": {
            "state": "SUCCESS",
            "result": result,
        },
    }

    # Update demo-data.json
    demo_path = Path(__file__).parent / "demo-data.json"
    with open(demo_path) as f:
        demo = json.load(f)

    demo["kite_backfill_data"] = kite_data

    with open(demo_path, "w") as f:
        json.dump(demo, f, indent=2)

    print(f"Generated {len(daily_values)} daily entries")
    print(f"Date range: {min(daily_values.keys())} to {max(daily_values.keys())}")
    print(f"Updated demo-data.json")


if __name__ == "__main__":
    main()
