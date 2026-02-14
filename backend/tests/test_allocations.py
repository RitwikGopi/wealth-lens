import pytest


class TestListAllocations:
    def test_list_empty(self, client):
        resp = client.get("/api/v1/allocations")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_with_target(self, client, sample_tag):
        # Set allocation target
        client.put(
            f"/api/v1/allocations/{sample_tag.id}",
            json={"target_pct": 60.0, "notes": "Target equity"},
        )
        resp = client.get("/api/v1/allocations")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["tag_name"] == "Equity"
        assert data[0]["target_pct"] == 60.0


class TestGetAllocation:
    def test_get_existing(self, client, sample_tag):
        client.put(
            f"/api/v1/allocations/{sample_tag.id}",
            json={"target_pct": 60.0},
        )
        resp = client.get(f"/api/v1/allocations/{sample_tag.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["target_pct"] == 60.0

    def test_get_nonexistent(self, client):
        resp = client.get("/api/v1/allocations/9999")
        assert resp.status_code == 404


class TestSetAllocation:
    def test_create_new(self, client, sample_tag):
        resp = client.put(
            f"/api/v1/allocations/{sample_tag.id}",
            json={"target_pct": 40.0, "notes": "Equity target"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["target_pct"] == 40.0
        assert data["tag_name"] == "Equity"

    def test_update_existing(self, client, sample_tag):
        client.put(
            f"/api/v1/allocations/{sample_tag.id}",
            json={"target_pct": 40.0},
        )
        resp = client.put(
            f"/api/v1/allocations/{sample_tag.id}",
            json={"target_pct": 55.0},
        )
        assert resp.status_code == 200
        assert resp.json()["target_pct"] == 55.0

    def test_set_for_nonexistent_tag(self, client):
        resp = client.put(
            "/api/v1/allocations/9999",
            json={"target_pct": 50.0},
        )
        assert resp.status_code == 404


class TestDeleteAllocation:
    def test_delete_existing(self, client, sample_tag):
        client.put(
            f"/api/v1/allocations/{sample_tag.id}",
            json={"target_pct": 60.0},
        )
        resp = client.delete(f"/api/v1/allocations/{sample_tag.id}")
        assert resp.status_code == 204

        resp = client.get(f"/api/v1/allocations/{sample_tag.id}")
        assert resp.status_code == 404

    def test_delete_nonexistent(self, client):
        resp = client.delete("/api/v1/allocations/9999")
        assert resp.status_code == 404


class TestAllocationDrift:
    def test_drift_empty_portfolio(self, client, sample_tag):
        """When portfolio is empty (0 total value), drift should return empty."""
        client.put(
            f"/api/v1/allocations/{sample_tag.id}",
            json={"target_pct": 60.0},
        )
        resp = client.get("/api/v1/allocations/drift")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_drift_with_holdings(self, client, sample_holding, sample_tag, db_session):
        """Set a target and tag a holding, then check drift calculation."""
        # Tag the holding with the sample tag
        client.post(
            f"/api/v1/holdings/{sample_holding.id}/tags",
            json={"tag_ids": [sample_tag.id]},
        )
        # Set allocation target
        client.put(
            f"/api/v1/allocations/{sample_tag.id}",
            json={"target_pct": 60.0},
        )

        resp = client.get("/api/v1/allocations/drift")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1

        drift_item = data[0]
        assert drift_item["tag_name"] == "Equity"
        assert drift_item["target_pct"] == 60.0
        # sample_holding is the only asset, so current_pct should be 100%
        assert drift_item["current_pct"] == pytest.approx(100.0, abs=0.1)
        assert drift_item["drift"] == pytest.approx(40.0, abs=0.1)

    def test_drift_with_multiple_tags(
        self, client, sample_tag_with_children, sample_holding, db_session
    ):
        """Test drift with parent and child tags."""
        parent, child1, child2 = sample_tag_with_children

        # Tag holding with child tag "Large Cap"
        client.post(
            f"/api/v1/holdings/{sample_holding.id}/tags",
            json={"tag_ids": [child1.id]},
        )

        # Set targets
        client.put(
            f"/api/v1/allocations/{parent.id}",
            json={"target_pct": 60.0},
        )
        client.put(
            f"/api/v1/allocations/{child1.id}",
            json={"target_pct": 40.0},
        )

        resp = client.get("/api/v1/allocations/drift")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

        # The parent "Equity" should include value from descendant tags
        equity_drift = next(d for d in data if d["tag_name"] == "Equity")
        assert equity_drift["current_pct"] == pytest.approx(100.0, abs=0.1)
