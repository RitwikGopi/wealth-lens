from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.fixed_deposit import FixedDeposit
from app.models.holding_tag import HoldingTag
from app.models.transaction import Transaction
from app.schemas.fixed_deposit import FixedDepositCreate, FixedDepositUpdate
from app.utils.calculations import calculate_fd_current_value


def get_fixed_deposits(
    db: Session,
    bank_name: str | None = None,
    tag_id: int | None = None,
    status: str | None = None,
) -> list[FixedDeposit]:
    stmt = select(FixedDeposit).options(
        selectinload(FixedDeposit.tags).selectinload(HoldingTag.tag)
    )

    if bank_name:
        stmt = stmt.where(FixedDeposit.bank_name == bank_name)
    if status:
        stmt = stmt.where(FixedDeposit.status == status)
    if tag_id:
        stmt = stmt.join(HoldingTag, HoldingTag.fd_id == FixedDeposit.id).where(
            HoldingTag.tag_id == tag_id
        )

    fds = list(db.execute(stmt).scalars().all())
    for fd in fds:
        _update_current_value(fd)
    return fds


def get_fixed_deposit(db: Session, fd_id: int) -> FixedDeposit | None:
    stmt = (
        select(FixedDeposit)
        .options(selectinload(FixedDeposit.tags).selectinload(HoldingTag.tag))
        .where(FixedDeposit.id == fd_id)
    )
    fd = db.execute(stmt).scalar_one_or_none()
    if fd:
        _update_current_value(fd)
    return fd


def create_fixed_deposit(db: Session, data: FixedDepositCreate) -> FixedDeposit:
    fd = FixedDeposit(**data.model_dump())
    _update_current_value(fd)
    db.add(fd)
    db.flush()

    deposit_txn = Transaction(
        type="deposit",
        fd_id=fd.id,
        amount=fd.principal,
        date=fd.start_date,
        source="auto_fd",
        notes=f"Deposit for FD at {fd.bank_name}",
    )
    db.add(deposit_txn)
    db.commit()
    db.refresh(fd)
    return fd


def update_fixed_deposit(
    db: Session, fd: FixedDeposit, data: FixedDepositUpdate
) -> FixedDeposit:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(fd, key, value)
    _update_current_value(fd)
    db.commit()
    db.refresh(fd)
    return fd


def delete_fixed_deposit(db: Session, fd: FixedDeposit) -> None:
    db.delete(fd)
    db.commit()


def add_tags_to_fd(db: Session, fd_id: int, tag_ids: list[int]) -> None:
    for tag_id in tag_ids:
        existing = db.execute(
            select(HoldingTag).where(
                HoldingTag.fd_id == fd_id, HoldingTag.tag_id == tag_id
            )
        ).scalar_one_or_none()
        if not existing:
            db.add(HoldingTag(tag_id=tag_id, fd_id=fd_id))
    db.commit()


def remove_tag_from_fd(db: Session, fd_id: int, tag_id: int) -> bool:
    ht = db.execute(
        select(HoldingTag).where(
            HoldingTag.fd_id == fd_id, HoldingTag.tag_id == tag_id
        )
    ).scalar_one_or_none()
    if ht:
        db.delete(ht)
        db.commit()
        return True
    return False


def close_fixed_deposit(
    db: Session,
    fd: FixedDeposit,
    closure_date: date,
    closure_amount: float,
    premature: bool = False,
    notes: str | None = None,
    commit: bool = True,
) -> FixedDeposit:
    if fd.status == "closed":
        raise ValueError("FD is already closed")
    if closure_date < fd.start_date:
        raise ValueError("Closure date cannot be before start date")

    fd.status = "closed"
    fd.closure_date = closure_date
    fd.closure_amount = closure_amount
    fd.current_value = closure_amount

    withdrawal_notes = (
        f"{'Premature closure' if premature else 'Maturity closure'} of FD at {fd.bank_name}"
    )
    if notes:
        withdrawal_notes += f" - {notes}"

    withdrawal_txn = Transaction(
        type="withdrawal",
        fd_id=fd.id,
        amount=closure_amount,
        date=closure_date,
        source="auto_fd",
        notes=withdrawal_notes,
    )
    db.add(withdrawal_txn)

    if commit:
        db.commit()
        db.refresh(fd)
    else:
        db.flush()

    return fd


def renew_fixed_deposit(
    db: Session,
    fd: FixedDeposit,
    new_maturity_date: date,
    new_principal: float | None = None,
    new_interest_rate: float | None = None,
    new_compounding_frequency: str | None = None,
    new_bank_name: str | None = None,
    new_is_cumulative: bool | None = None,
    notes: str | None = None,
) -> tuple[FixedDeposit, FixedDeposit]:
    if fd.status == "closed":
        raise ValueError("FD is already closed")

    # Calculate closure amount (maturity value of old FD)
    if fd.is_cumulative:
        closure_amount = calculate_fd_current_value(
            principal=fd.principal,
            annual_rate=fd.interest_rate,
            compounding_frequency=fd.compounding_frequency,
            start_date=fd.start_date,
            as_of=fd.maturity_date,
        )
    else:
        closure_amount = fd.principal

    # Closure date = maturity date if past maturity, else today
    today = date.today()
    closure_date = fd.maturity_date if fd.maturity_date <= today else today

    # Close old FD (flush only, don't commit yet)
    renewal_notes = f"Renewed"
    if notes:
        renewal_notes += f" - {notes}"
    close_fixed_deposit(
        db, fd, closure_date, closure_amount, notes=renewal_notes, commit=False
    )

    # Determine new FD terms (defaults from old FD)
    actual_principal = new_principal if new_principal is not None else closure_amount
    actual_rate = new_interest_rate if new_interest_rate is not None else fd.interest_rate
    actual_freq = (
        new_compounding_frequency
        if new_compounding_frequency is not None
        else fd.compounding_frequency
    )
    actual_bank = new_bank_name if new_bank_name is not None else fd.bank_name
    actual_cumulative = (
        new_is_cumulative if new_is_cumulative is not None else fd.is_cumulative
    )

    # Create new FD (this also creates a deposit transaction and commits)
    new_fd_data = FixedDepositCreate(
        bank_name=actual_bank,
        principal=actual_principal,
        interest_rate=actual_rate,
        compounding_frequency=actual_freq,
        start_date=closure_date,
        maturity_date=new_maturity_date,
        is_cumulative=actual_cumulative,
        notes=f"Renewed from FD #{fd.id}",
    )
    new_fd = create_fixed_deposit(db, new_fd_data)

    db.refresh(fd)
    return fd, new_fd


def _update_current_value(fd: FixedDeposit) -> None:
    if fd.status == "closed":
        fd.current_value = fd.closure_amount
        return
    if fd.is_cumulative:
        fd.current_value = calculate_fd_current_value(
            principal=fd.principal,
            annual_rate=fd.interest_rate,
            compounding_frequency=fd.compounding_frequency,
            start_date=fd.start_date,
        )
