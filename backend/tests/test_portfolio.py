import datetime as dt

import pytest


class TestPortfolioSummary:
    def test_empty_portfolio(self, client):
        resp = client.get("/api/v1/portfolio/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_value"] == 0.0
        assert data["holdings_value"] == 0.0
        assert data["fd_value"] == 0.0
        assert data["total_pnl"] == 0.0
        assert data["holdings_count"] == 0
        assert data["fd_count"] == 0

    def test_summary_with_holding(self, client, sample_holding):
        resp = client.get("/api/v1/portfolio/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["holdings_value"] == pytest.approx(16000.0)
        assert data["total_pnl"] == pytest.approx(1000.0)
        assert data["holdings_count"] == 1
        assert data["fd_count"] == 0
        assert data["total_value"] == pytest.approx(16000.0)

    def test_summary_with_fd(self, client, sample_fd):
        resp = client.get("/api/v1/portfolio/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["fd_value"] > 100000.0  # FD has accrued interest
        assert data["fd_count"] == 1
        assert data["holdings_count"] == 0
        assert data["total_value"] == data["fd_value"]

    def test_summary_with_both(self, client, sample_holding, sample_fd):
        resp = client.get("/api/v1/portfolio/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["holdings_count"] == 1
        assert data["fd_count"] == 1
        assert data["total_value"] == pytest.approx(
            data["holdings_value"] + data["fd_value"]
        )

    def test_summary_holding_no_price(self, client, sample_holding_no_price):
        """Holdings without a current_price contribute 0 to portfolio value."""
        resp = client.get("/api/v1/portfolio/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["holdings_value"] == 0.0
        assert data["holdings_count"] == 1


class TestPortfolioSnapshots:
    def test_list_empty(self, client):
        resp = client.get("/api/v1/portfolio/snapshots")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_take_snapshot(self, client, sample_holding):
        resp = client.post("/api/v1/portfolio/snapshots")
        assert resp.status_code == 201
        data = resp.json()
        assert data["date"] == dt.date.today().isoformat()
        assert data["total_value"] == pytest.approx(16000.0)
        assert data["holdings_value"] == pytest.approx(16000.0)
        assert data["fd_value"] == 0.0

    def test_take_snapshot_updates_existing(self, client, sample_holding):
        """Taking a snapshot on the same day should update the existing snapshot."""
        client.post("/api/v1/portfolio/snapshots")
        resp = client.post("/api/v1/portfolio/snapshots")
        assert resp.status_code == 201

        # Should still have only one snapshot for today
        resp = client.get("/api/v1/portfolio/snapshots")
        data = resp.json()
        assert len(data) == 1

    def test_snapshot_date_filter(self, client, db_session):
        from app.models.portfolio_snapshot import PortfolioSnapshot

        snap1 = PortfolioSnapshot(
            date=dt.date(2025, 1, 1),
            total_value=100000.0,
            holdings_value=80000.0,
            fd_value=20000.0,
        )
        snap2 = PortfolioSnapshot(
            date=dt.date(2025, 6, 1),
            total_value=120000.0,
            holdings_value=90000.0,
            fd_value=30000.0,
        )
        db_session.add_all([snap1, snap2])
        db_session.commit()

        resp = client.get(
            "/api/v1/portfolio/snapshots?date_from=2025-03-01&date_to=2025-12-31"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["date"] == "2025-06-01"

    def test_snapshot_with_fd(self, client, sample_fd):
        resp = client.post("/api/v1/portfolio/snapshots")
        assert resp.status_code == 201
        data = resp.json()
        assert data["fd_value"] > 100000.0
