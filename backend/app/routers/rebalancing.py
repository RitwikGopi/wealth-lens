from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.rebalancing import RebalancingCreate, RebalancingResponse
from app.services import rebalancing_service

router = APIRouter(prefix="/rebalancing", tags=["Rebalancing"])


@router.get("", response_model=list[RebalancingResponse])
def list_operations(db: Session = Depends(get_db)):
    return rebalancing_service.list_operations(db)


@router.post("", response_model=RebalancingResponse, status_code=201)
def create_operation(data: RebalancingCreate, db: Session = Depends(get_db)):
    op = rebalancing_service.create_operation(db, data)
    return rebalancing_service._to_response(op)


@router.get("/{op_id}", response_model=RebalancingResponse)
def get_operation(op_id: int, db: Session = Depends(get_db)):
    op = rebalancing_service.get_operation(db, op_id)
    if not op:
        raise HTTPException(status_code=404, detail="Rebalancing operation not found")
    return rebalancing_service._to_response(op)


@router.delete("/{op_id}", status_code=204)
def delete_operation(op_id: int, db: Session = Depends(get_db)):
    op = rebalancing_service.get_operation(db, op_id)
    if not op:
        raise HTTPException(status_code=404, detail="Rebalancing operation not found")
    rebalancing_service.delete_operation(db, op)
