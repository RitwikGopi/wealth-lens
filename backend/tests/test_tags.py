class TestListTags:
    def test_list_empty(self, client):
        resp = client.get("/api/v1/tags")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_returns_tags(self, client, sample_tag):
        resp = client.get("/api/v1/tags")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Equity"

    def test_list_root_only(self, client, sample_tag_with_children):
        parent, child1, child2 = sample_tag_with_children

        # root_only should return only the parent
        resp = client.get("/api/v1/tags?root_only=true")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Equity"

        # Without root_only, all tags returned
        resp = client.get("/api/v1/tags")
        assert resp.status_code == 200
        assert len(resp.json()) == 3


class TestGetTag:
    def test_get_existing(self, client, sample_tag):
        resp = client.get(f"/api/v1/tags/{sample_tag.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Equity"
        assert data["color"] == "#3B82F6"

    def test_get_nonexistent(self, client):
        resp = client.get("/api/v1/tags/9999")
        assert resp.status_code == 404


class TestCreateTag:
    def test_create_root_tag(self, client):
        payload = {"name": "Debt", "color": "#EF4444"}
        resp = client.post("/api/v1/tags", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Debt"
        assert data["parent_id"] is None

    def test_create_child_tag(self, client, sample_tag):
        payload = {
            "name": "IT Sector",
            "parent_id": sample_tag.id,
            "color": "#8B5CF6",
        }
        resp = client.post("/api/v1/tags", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["parent_id"] == sample_tag.id


class TestUpdateTag:
    def test_update_name(self, client, sample_tag):
        resp = client.put(
            f"/api/v1/tags/{sample_tag.id}",
            json={"name": "Equity Investments"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Equity Investments"

    def test_update_nonexistent(self, client):
        resp = client.put("/api/v1/tags/9999", json={"name": "Nope"})
        assert resp.status_code == 404


class TestDeleteTag:
    def test_delete_existing(self, client, sample_tag):
        resp = client.delete(f"/api/v1/tags/{sample_tag.id}")
        assert resp.status_code == 204
        resp = client.get(f"/api/v1/tags/{sample_tag.id}")
        assert resp.status_code == 404

    def test_delete_nonexistent(self, client):
        resp = client.delete("/api/v1/tags/9999")
        assert resp.status_code == 404

    def test_delete_cascades_to_children(self, client, sample_tag_with_children):
        parent, child1, child2 = sample_tag_with_children
        resp = client.delete(f"/api/v1/tags/{parent.id}")
        assert resp.status_code == 204

        # Children should also be deleted
        resp = client.get(f"/api/v1/tags/{child1.id}")
        assert resp.status_code == 404
        resp = client.get(f"/api/v1/tags/{child2.id}")
        assert resp.status_code == 404


class TestTagTree:
    def test_tree_empty(self, client):
        resp = client.get("/api/v1/tags/tree")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_tree_structure(self, client, sample_tag_with_children):
        parent, child1, child2 = sample_tag_with_children
        resp = client.get("/api/v1/tags/tree")
        assert resp.status_code == 200
        data = resp.json()

        assert len(data) == 1  # one root
        root = data[0]
        assert root["name"] == "Equity"
        assert len(root["children"]) == 2

        child_names = {c["name"] for c in root["children"]}
        assert child_names == {"Large Cap", "Mid Cap"}

    def test_nested_tree(self, client, db_session):
        from app.models.tag import Tag

        root = Tag(name="All", color="#000")
        db_session.add(root)
        db_session.commit()
        db_session.refresh(root)

        mid = Tag(name="Equity", parent_id=root.id)
        db_session.add(mid)
        db_session.commit()
        db_session.refresh(mid)

        leaf = Tag(name="Large Cap", parent_id=mid.id)
        db_session.add(leaf)
        db_session.commit()

        resp = client.get("/api/v1/tags/tree")
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "All"
        assert len(data[0]["children"]) == 1
        assert data[0]["children"][0]["name"] == "Equity"
        assert len(data[0]["children"][0]["children"]) == 1
        assert data[0]["children"][0]["children"][0]["name"] == "Large Cap"
