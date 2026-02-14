import datetime as dt


class TestListTransactions:
    def test_list_empty(self, client):
        resp = client.get("/api/v1/transactions")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_returns_transactions(self, client, sample_transaction):
        resp = client.get("/api/v1/transactions")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["type"] == "buy"

    def test_filter_by_type(self, client, sample_transaction):
        resp = client.get("/api/v1/transactions?type=buy")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

        resp = client.get("/api/v1/transactions?type=sell")
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    def test_filter_by_holding_id(self, client, sample_transaction, sample_holding):
        resp = client.get(f"/api/v1/transactions?holding_id={sample_holding.id}")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_filter_by_date_range(self, client, sample_transaction):
        today = dt.date.today().isoformat()
        yesterday = (dt.date.today() - dt.timedelta(days=1)).isoformat()
        tomorrow = (dt.date.today() + dt.timedelta(days=1)).isoformat()

        resp = client.get(f"/api/v1/transactions?date_from={yesterday}&date_to={tomorrow}")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

        # Date range before the transaction
        resp = client.get(f"/api/v1/transactions?date_from=2020-01-01&date_to=2020-12-31")
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    def test_pagination(self, client, sample_holding, db_session):
        from app.models.transaction import Transaction

        for i in range(5):
            txn = Transaction(
                type="buy",
                holding_id=sample_holding.id,
                amount=1000.0 * (i + 1),
                quantity=1,
                price=1000.0 * (i + 1),
                date=dt.date.today() - dt.timedelta(days=i),
            )
            db_session.add(txn)
        db_session.commit()

        resp = client.get("/api/v1/transactions?limit=2&offset=0")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

        resp = client.get("/api/v1/transactions?limit=2&offset=3")
        assert resp.status_code == 200
        assert len(resp.json()) == 2


class TestGetTransaction:
    def test_get_existing(self, client, sample_transaction):
        resp = client.get(f"/api/v1/transactions/{sample_transaction.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["type"] == "buy"
        assert data["amount"] == 15000.0

    def test_get_nonexistent(self, client):
        resp = client.get("/api/v1/transactions/9999")
        assert resp.status_code == 404


class TestCreateTransaction:
    def test_create_buy(self, client, sample_holding):
        payload = {
            "type": "buy",
            "holding_id": sample_holding.id,
            "amount": 5000.0,
            "quantity": 3,
            "price": 1666.67,
            "date": dt.date.today().isoformat(),
            "notes": "Additional purchase",
        }
        resp = client.post("/api/v1/transactions", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["type"] == "buy"
        assert data["amount"] == 5000.0

    def test_create_fd_transaction(self, client, sample_fd):
        payload = {
            "type": "fd_open",
            "fd_id": sample_fd.id,
            "amount": 100000.0,
            "date": dt.date.today().isoformat(),
        }
        resp = client.post("/api/v1/transactions", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["type"] == "fd_open"
        assert data["fd_id"] == sample_fd.id

    def test_create_deposit(self, client):
        payload = {
            "type": "deposit",
            "amount": 50000.0,
            "date": dt.date.today().isoformat(),
            "notes": "Monthly investment",
        }
        resp = client.post("/api/v1/transactions", json=payload)
        assert resp.status_code == 201


class TestUpdateTransaction:
    def test_update_amount(self, client, sample_transaction):
        resp = client.put(
            f"/api/v1/transactions/{sample_transaction.id}",
            json={"amount": 20000.0},
        )
        assert resp.status_code == 200
        assert resp.json()["amount"] == 20000.0

    def test_update_nonexistent(self, client):
        resp = client.put("/api/v1/transactions/9999", json={"amount": 100.0})
        assert resp.status_code == 404


class TestDeleteTransaction:
    def test_delete_existing(self, client, sample_transaction):
        resp = client.delete(f"/api/v1/transactions/{sample_transaction.id}")
        assert resp.status_code == 204
        resp = client.get(f"/api/v1/transactions/{sample_transaction.id}")
        assert resp.status_code == 404

    def test_delete_nonexistent(self, client):
        resp = client.delete("/api/v1/transactions/9999")
        assert resp.status_code == 404
