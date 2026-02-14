"""create deposit transactions

Revision ID: c8d3e5f7a012
Revises: b7e2f3a8d901
Create Date: 2026-02-12
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c8d3e5f7a012"
down_revision: Union[str, None] = "b7e2f3a8d901"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. One lump-sum deposit for all auto_sync buy transactions (holdings)
    row = conn.execute(
        sa.text(
            """
            SELECT COALESCE(SUM(amount), 0) AS total,
                   MIN(date) AS min_date
            FROM transactions
            WHERE type = 'buy' AND source = 'auto_sync'
            """
        )
    ).fetchone()

    total_buy_amount = row[0] if row and row[0] else 0
    min_buy_date = row[1] if row and row[1] else None

    if total_buy_amount > 0 and min_buy_date is not None:
        conn.execute(
            sa.text(
                """
                INSERT INTO transactions (type, amount, date, source, notes)
                VALUES ('deposit', :amount, :date, 'auto_migration',
                        'Retroactive deposit for existing holdings')
                """
            ),
            {"amount": total_buy_amount, "date": min_buy_date},
        )

    # 2. One deposit per FD, amount = fd.principal, date = fd.start_date
    fds = conn.execute(
        sa.text("SELECT id, principal, start_date FROM fixed_deposits")
    ).fetchall()

    for fd in fds:
        conn.execute(
            sa.text(
                """
                INSERT INTO transactions (type, fd_id, amount, date, source, notes)
                VALUES ('deposit', :fd_id, :amount, :date, 'auto_migration',
                        'Retroactive deposit for fixed deposit')
                """
            ),
            {"fd_id": fd[0], "amount": fd[1], "date": fd[2]},
        )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text("DELETE FROM transactions WHERE source = 'auto_migration'")
    )
