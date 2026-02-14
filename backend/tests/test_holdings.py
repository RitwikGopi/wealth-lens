import pytest


class TestListHoldings:
    def test_list_empty(self, client):
        resp = client.get("/api/v1/holdings")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_returns_holdings(self, client, sample_holding):
        resp = client.get("/api/v1/holdings")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["symbol"] == "INFY"

    def test_filter_by_source(self, client, sample_holding):
        resp = client.get("/api/v1/holdings?source=manual")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

        resp = client.get("/api/v1/holdings?source=zerodha")
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    def test_filter_by_instrument_type(self, client, sample_holding):
        resp = client.get("/api/v1/holdings?instrument_type=EQ")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

        resp = client.get("/api/v1/holdings?instrument_type=MF")
        assert resp.status_code == 200
        assert len(resp.json()) == 0


class TestGetHolding:
    def test_get_existing(self, client, sample_holding):
        resp = client.get(f"/api/v1/holdings/{sample_holding.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["symbol"] == "INFY"
        assert data["quantity"] == 10
        assert "tags" in data

    def test_get_nonexistent(self, client):
        resp = client.get("/api/v1/holdings/9999")
        assert resp.status_code == 404


class TestCreateHolding:
    def test_create_with_price(self, client):
        payload = {
            "symbol": "RELIANCE",
            "exchange": "NSE",
            "instrument_type": "EQ",
            "quantity": 5,
            "average_price": 2500.0,
            "current_price": 2600.0,
        }
        resp = client.post("/api/v1/holdings", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["symbol"] == "RELIANCE"
        assert data["current_value"] == pytest.approx(13000.0)
        assert data["pnl"] == pytest.approx(500.0)

    def test_create_without_price(self, client):
        payload = {
            "symbol": "HDFCBANK",
            "quantity": 20,
            "average_price": 1600.0,
        }
        resp = client.post("/api/v1/holdings", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["current_value"] is None
        assert data["pnl"] is None

    def test_create_zero_quantity(self, client):
        payload = {
            "symbol": "ZEROCORP",
            "quantity": 0,
            "average_price": 100.0,
            "current_price": 200.0,
        }
        resp = client.post("/api/v1/holdings", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["current_value"] == pytest.approx(0.0)
        assert data["pnl"] == pytest.approx(0.0)


class TestUpdateHolding:
    def test_update_price(self, client, sample_holding):
        resp = client.put(
            f"/api/v1/holdings/{sample_holding.id}",
            json={"current_price": 1700.0},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["current_price"] == 1700.0
        assert data["current_value"] == pytest.approx(17000.0)
        assert data["pnl"] == pytest.approx(2000.0)

    def test_update_nonexistent(self, client):
        resp = client.put("/api/v1/holdings/9999", json={"current_price": 100.0})
        assert resp.status_code == 404


class TestDeleteHolding:
    def test_delete_existing(self, client, sample_holding):
        resp = client.delete(f"/api/v1/holdings/{sample_holding.id}")
        assert resp.status_code == 204
        resp = client.get(f"/api/v1/holdings/{sample_holding.id}")
        assert resp.status_code == 404

    def test_delete_nonexistent(self, client):
        resp = client.delete("/api/v1/holdings/9999")
        assert resp.status_code == 404


class TestHoldingTags:
    def test_add_tags(self, client, sample_holding, sample_tag):
        resp = client.post(
            f"/api/v1/holdings/{sample_holding.id}/tags",
            json={"tag_ids": [sample_tag.id]},
        )
        assert resp.status_code == 204

        # Verify tag appears on holding
        resp = client.get(f"/api/v1/holdings/{sample_holding.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["tags"]) == 1
        assert data["tags"][0]["name"] == "Equity"

    def test_add_duplicate_tag_is_idempotent(self, client, sample_holding, sample_tag):
        client.post(
            f"/api/v1/holdings/{sample_holding.id}/tags",
            json={"tag_ids": [sample_tag.id]},
        )
        # Adding same tag again should not fail
        resp = client.post(
            f"/api/v1/holdings/{sample_holding.id}/tags",
            json={"tag_ids": [sample_tag.id]},
        )
        assert resp.status_code == 204

    def test_remove_tag(self, client, sample_holding, sample_tag):
        client.post(
            f"/api/v1/holdings/{sample_holding.id}/tags",
            json={"tag_ids": [sample_tag.id]},
        )
        resp = client.delete(
            f"/api/v1/holdings/{sample_holding.id}/tags/{sample_tag.id}"
        )
        assert resp.status_code == 204

    def test_remove_unassigned_tag(self, client, sample_holding, sample_tag):
        resp = client.delete(
            f"/api/v1/holdings/{sample_holding.id}/tags/{sample_tag.id}"
        )
        assert resp.status_code == 404

    def test_filter_holdings_by_tag(self, client, sample_holding, sample_tag):
        client.post(
            f"/api/v1/holdings/{sample_holding.id}/tags",
            json={"tag_ids": [sample_tag.id]},
        )
        resp = client.get(f"/api/v1/holdings?tag_id={sample_tag.id}")
        assert resp.status_code == 200
        assert len(resp.json()) == 1
