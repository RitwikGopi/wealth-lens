.PHONY: backend frontend migrate test demo-data reset-db docker-build docker-up docker-down

backend:
	cd backend && uv run uvicorn app.main:app --reload --port 8998

frontend:
	cd frontend && npm run dev -- --port 3333

migrate:
	cd backend && uv run alembic upgrade head

migration:
	cd backend && uv run alembic revision --autogenerate -m "$(msg)"

test:
	cd backend && uv run pytest tests/ -v

install-backend:
	cd backend && uv sync

install-frontend:
	cd frontend && npm install

demo-data:
	uv run import_demo_data.py

reset-db:
	rm -f backend/portfolio.db
	cd backend && uv run alembic upgrade head

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down
