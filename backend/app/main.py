from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    allocations,
    fixed_deposits,
    holdings,
    portfolio,
    rebalancing,
    tags,
    transactions,
    zerodha,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.scheduler import start, shutdown

    start()
    yield
    shutdown()


app = FastAPI(
    title="Portfolio Tracker API",
    description="Personal portfolio tracking application",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(holdings.router, prefix="/api/v1")
app.include_router(fixed_deposits.router, prefix="/api/v1")
app.include_router(transactions.router, prefix="/api/v1")
app.include_router(tags.router, prefix="/api/v1")
app.include_router(allocations.router, prefix="/api/v1")
app.include_router(portfolio.router, prefix="/api/v1")
app.include_router(rebalancing.router, prefix="/api/v1")
app.include_router(zerodha.router, prefix="/api/v1")


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
