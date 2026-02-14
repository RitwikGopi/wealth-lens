import datetime as dt

import pytest

from app.utils.calculations import calculate_fd_current_value


class TestFDCalculation:
    """Test the compound interest calculation directly."""

    def test_known_compound_interest(self):
        """Rs 100,000 at 7% for 1 year compounded quarterly should = Rs 107,185.90 (approx)."""
        start = dt.date(2025, 1, 1)
        as_of = dt.date(2026, 1, 1)  # exactly 1 year later

        value = calculate_fd_current_value(
            principal=100000.0,
            annual_rate=7.0,
            compounding_frequency="quarterly",
            start_date=start,
            as_of=as_of,
        )
        # A = 100000 * (1 + 0.07/4)^(4 * 365/365.25)
        # The 365/365.25 factor causes slight deviation from exact 1 year
        # Using exact formula: 4 * (365/365.25) = 3.9973...
        # So result is close to but not exactly 107185.90
        assert value == pytest.approx(107185.90, rel=1e-3)

    def test_zero_days_elapsed(self):
        """If as_of == start_date, value should be principal."""
        start = dt.date(2025, 6, 1)
        value = calculate_fd_current_value(
            principal=50000.0,
            annual_rate=8.0,
            compounding_frequency="quarterly",
            start_date=start,
            as_of=start,
        )
        assert value == 50000.0

    def test_before_start_date(self):
        """If as_of < start_date, value should be principal."""
        start = dt.date(2025, 6, 1)
        value = calculate_fd_current_value(
            principal=50000.0,
            annual_rate=8.0,
            compounding_frequency="quarterly",
            start_date=start,
            as_of=dt.date(2025, 5, 1),
        )
        assert value == 50000.0

    def test_monthly_compounding(self):
        start = dt.date(2025, 1, 1)
        as_of = dt.date(2026, 1, 1)
        value = calculate_fd_current_value(
            principal=100000.0,
            annual_rate=7.0,
            compounding_frequency="monthly",
            start_date=start,
            as_of=as_of,
        )
        # Monthly compounding yields slightly more than quarterly
        assert value > 107185.0

    def test_yearly_compounding(self):
        start = dt.date(2025, 1, 1)
        as_of = dt.date(2026, 1, 1)
        value = calculate_fd_current_value(
            principal=100000.0,
            annual_rate=7.0,
            compounding_frequency="yearly",
            start_date=start,
            as_of=as_of,
        )
        # Yearly compounding yields less than quarterly
        assert value < 107185.90
        assert value == pytest.approx(107000.0, rel=1e-2)

    def test_unknown_frequency_defaults_quarterly(self):
        start = dt.date(2025, 1, 1)
        as_of = dt.date(2026, 1, 1)
        value_unknown = calculate_fd_current_value(
            principal=100000.0,
            annual_rate=7.0,
            compounding_frequency="unknown",
            start_date=start,
            as_of=as_of,
        )
        value_quarterly = calculate_fd_current_value(
            principal=100000.0,
            annual_rate=7.0,
            compounding_frequency="quarterly",
            start_date=start,
            as_of=as_of,
        )
        assert value_unknown == pytest.approx(value_quarterly)


class TestFDListAPI:
    def test_list_empty(self, client):
        resp = client.get("/api/v1/fixed-deposits")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_returns_fds(self, client, sample_fd):
        resp = client.get("/api/v1/fixed-deposits")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["bank_name"] == "SBI"

    def test_filter_by_bank_name(self, client, sample_fd):
        resp = client.get("/api/v1/fixed-deposits?bank_name=SBI")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

        resp = client.get("/api/v1/fixed-deposits?bank_name=HDFC")
        assert resp.status_code == 200
        assert len(resp.json()) == 0


class TestFDGetAPI:
    def test_get_existing(self, client, sample_fd):
        resp = client.get(f"/api/v1/fixed-deposits/{sample_fd.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["bank_name"] == "SBI"
        assert data["current_value"] is not None
        assert data["current_value"] > data["principal"]
        assert "tags" in data

    def test_get_nonexistent(self, client):
        resp = client.get("/api/v1/fixed-deposits/9999")
        assert resp.status_code == 404


class TestFDCreateAPI:
    def test_create_cumulative_fd(self, client):
        payload = {
            "bank_name": "HDFC",
            "principal": 200000.0,
            "interest_rate": 7.5,
            "compounding_frequency": "quarterly",
            "start_date": "2025-01-01",
            "maturity_date": "2027-01-01",
            "is_cumulative": True,
        }
        resp = client.post("/api/v1/fixed-deposits", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["bank_name"] == "HDFC"
        assert data["principal"] == 200000.0
        # current_value should be computed for cumulative FD
        assert data["current_value"] is not None
        assert data["current_value"] >= data["principal"]

    def test_create_non_cumulative_fd(self, client):
        payload = {
            "bank_name": "ICICI",
            "principal": 100000.0,
            "interest_rate": 6.5,
            "compounding_frequency": "quarterly",
            "start_date": "2025-01-01",
            "maturity_date": "2026-01-01",
            "is_cumulative": False,
            "interest_payout_freq": "quarterly",
        }
        resp = client.post("/api/v1/fixed-deposits", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["is_cumulative"] is False


class TestFDUpdateAPI:
    def test_update_interest_rate(self, client, sample_fd):
        resp = client.put(
            f"/api/v1/fixed-deposits/{sample_fd.id}",
            json={"interest_rate": 8.0},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["interest_rate"] == 8.0

    def test_update_nonexistent(self, client):
        resp = client.put("/api/v1/fixed-deposits/9999", json={"interest_rate": 8.0})
        assert resp.status_code == 404


class TestFDDeleteAPI:
    def test_delete_existing(self, client, sample_fd):
        resp = client.delete(f"/api/v1/fixed-deposits/{sample_fd.id}")
        assert resp.status_code == 204
        resp = client.get(f"/api/v1/fixed-deposits/{sample_fd.id}")
        assert resp.status_code == 404

    def test_delete_nonexistent(self, client):
        resp = client.delete("/api/v1/fixed-deposits/9999")
        assert resp.status_code == 404


class TestFDTags:
    def test_add_and_remove_tag(self, client, sample_fd, sample_tag):
        resp = client.post(
            f"/api/v1/fixed-deposits/{sample_fd.id}/tags",
            json={"tag_ids": [sample_tag.id]},
        )
        assert resp.status_code == 204

        resp = client.get(f"/api/v1/fixed-deposits/{sample_fd.id}")
        data = resp.json()
        assert len(data["tags"]) == 1

        resp = client.delete(
            f"/api/v1/fixed-deposits/{sample_fd.id}/tags/{sample_tag.id}"
        )
        assert resp.status_code == 204

    def test_remove_unassigned_tag(self, client, sample_fd, sample_tag):
        resp = client.delete(
            f"/api/v1/fixed-deposits/{sample_fd.id}/tags/{sample_tag.id}"
        )
        assert resp.status_code == 404
