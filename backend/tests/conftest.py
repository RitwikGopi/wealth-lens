import datetime as dt

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.allocation_target import AllocationTarget
from app.models.fixed_deposit import FixedDeposit
from app.models.holding import Holding
from app.models.holding_tag import HoldingTag
from app.models.portfolio_snapshot import PortfolioSnapshot
from app.models.tag import Tag
from app.models.transaction import Transaction

SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def db_session():
    """Create tables before each test, drop after. Provides a clean session."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def override_get_db(db_session):
    """Override FastAPI dependency to use the test database session."""

    def _override():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    """FastAPI TestClient."""
    return TestClient(app)


# --------------- Sample data fixtures ---------------


@pytest.fixture
def sample_holding(db_session):
    """A single holding with current_price set so current_value and pnl are computed."""
    h = Holding(
        symbol="INFY",
        exchange="NSE",
        instrument_type="EQ",
        quantity=10,
        average_price=1500.0,
        current_price=1600.0,
        current_value=16000.0,
        pnl=1000.0,
        source="manual",
    )
    db_session.add(h)
    db_session.commit()
    db_session.refresh(h)
    return h


@pytest.fixture
def sample_holding_no_price(db_session):
    """Holding without a current price."""
    h = Holding(
        symbol="TCS",
        exchange="NSE",
        instrument_type="EQ",
        quantity=5,
        average_price=3000.0,
        source="manual",
    )
    db_session.add(h)
    db_session.commit()
    db_session.refresh(h)
    return h


@pytest.fixture
def sample_fd(db_session):
    """A cumulative FD started 1 year ago."""
    fd = FixedDeposit(
        bank_name="SBI",
        principal=100000.0,
        interest_rate=7.0,
        compounding_frequency="quarterly",
        start_date=dt.date.today() - dt.timedelta(days=365),
        maturity_date=dt.date.today() + dt.timedelta(days=365),
        is_cumulative=True,
    )
    db_session.add(fd)
    db_session.commit()
    db_session.refresh(fd)
    return fd


@pytest.fixture
def sample_tag(db_session):
    """A root-level tag."""
    t = Tag(name="Equity", description="Equity investments", color="#3B82F6")
    db_session.add(t)
    db_session.commit()
    db_session.refresh(t)
    return t


@pytest.fixture
def sample_tag_with_children(db_session):
    """A root tag with two child tags."""
    parent = Tag(name="Equity", description="All equity", color="#3B82F6")
    db_session.add(parent)
    db_session.commit()
    db_session.refresh(parent)

    child1 = Tag(name="Large Cap", parent_id=parent.id, color="#10B981")
    child2 = Tag(name="Mid Cap", parent_id=parent.id, color="#F59E0B")
    db_session.add_all([child1, child2])
    db_session.commit()
    db_session.refresh(child1)
    db_session.refresh(child2)
    return parent, child1, child2


@pytest.fixture
def sample_transaction(db_session, sample_holding):
    """A buy transaction linked to sample_holding."""
    txn = Transaction(
        type="buy",
        holding_id=sample_holding.id,
        amount=15000.0,
        quantity=10,
        price=1500.0,
        date=dt.date.today(),
        notes="Initial purchase",
    )
    db_session.add(txn)
    db_session.commit()
    db_session.refresh(txn)
    return txn
