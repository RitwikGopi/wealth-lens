from datetime import date


COMPOUNDING_MAP = {
    "monthly": 12,
    "quarterly": 4,
    "half_yearly": 2,
    "yearly": 1,
}


def calculate_fd_current_value(
    principal: float,
    annual_rate: float,
    compounding_frequency: str,
    start_date: date,
    as_of: date | None = None,
) -> float:
    """Calculate current FD value using compound interest formula: A = P * (1 + r/n)^(n*t)"""
    if as_of is None:
        as_of = date.today()

    if as_of <= start_date:
        return principal

    n = COMPOUNDING_MAP.get(compounding_frequency, 4)
    r = annual_rate / 100.0
    days_elapsed = (as_of - start_date).days
    t = days_elapsed / 365.25

    return principal * (1 + r / n) ** (n * t)
