from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)
from app.services import transaction_service

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=list[TransactionResponse])
def list_transactions(
    type: str | None = None,
    holding_id: int | None = None,
    fd_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    return transaction_service.get_transactions(
        db, type, holding_id, fd_id, date_from, date_to, limit, offset
    )


@router.get("/{txn_id}", response_model=TransactionResponse)
def get_transaction(txn_id: int, db: Session = Depends(get_db)):
    txn = transaction_service.get_transaction(db, txn_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn


@router.post("", response_model=TransactionResponse, status_code=201)
def create_transaction(data: TransactionCreate, db: Session = Depends(get_db)):
    return transaction_service.create_transaction(db, data)


@router.put("/{txn_id}", response_model=TransactionResponse)
def update_transaction(
    txn_id: int, data: TransactionUpdate, db: Session = Depends(get_db)
):
    txn = transaction_service.get_transaction(db, txn_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction_service.update_transaction(db, txn, data)


@router.delete("/{txn_id}", status_code=204)
def delete_transaction(txn_id: int, db: Session = Depends(get_db)):
    txn = transaction_service.get_transaction(db, txn_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    transaction_service.delete_transaction(db, txn)
