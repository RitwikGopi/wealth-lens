.PHONY: backend frontend migrate test

backend:
	cd backend && uvicorn app.main:app --reload

frontend:
	cd frontend && npm run dev

migrate:
	cd backend && alembic upgrade head

migration:
	cd backend && alembic revision --autogenerate -m "$(msg)"

test:
	cd backend && python -m pytest tests/ -v

install-backend:
	cd backend && pip install -r requirements.txt

install-frontend:
	cd frontend && npm install
