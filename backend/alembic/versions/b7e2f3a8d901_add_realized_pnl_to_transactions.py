"""add realized_pnl to transactions

Revision ID: b7e2f3a8d901
Revises: a3f1b2c4d5e6
Create Date: 2026-02-12
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b7e2f3a8d901"
down_revision: Union[str, None] = "a3f1b2c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("transactions") as batch_op:
        batch_op.add_column(
            sa.Column("realized_pnl", sa.Float(), nullable=True)
        )

    # Backfill realized_pnl for existing sell transactions with a linked holding
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE transactions
            SET realized_pnl = (transactions.price - h.average_price) * transactions.quantity
            FROM holdings h
            WHERE transactions.holding_id = h.id
              AND transactions.type = 'sell'
              AND transactions.quantity IS NOT NULL
              AND transactions.price IS NOT NULL
            """
        )
    )


def downgrade() -> None:
    with op.batch_alter_table("transactions") as batch_op:
        batch_op.drop_column("realized_pnl")
