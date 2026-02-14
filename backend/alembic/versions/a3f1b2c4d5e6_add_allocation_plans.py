"""add allocation plans

Revision ID: a3f1b2c4d5e6
Revises: 0ceacc17c762
Create Date: 2026-02-11 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a3f1b2c4d5e6"
down_revision: Union[str, None] = "0ceacc17c762"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Naming convention so batch mode can find the unnamed SQLite unique constraint.
naming_convention = {
    "uq": "uq_%(table_name)s_%(column_0_name)s",
}


def upgrade() -> None:
    # 1. Create allocation_plans table
    op.create_table(
        "allocation_plans",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # 2. Insert a default plan for existing data
    op.execute(
        "INSERT INTO allocation_plans (name, description, is_primary) "
        "VALUES ('Default Plan', 'Migrated from existing allocation targets', 1)"
    )

    # 3. Add plan_id column (nullable initially for backfill)
    with op.batch_alter_table("allocation_targets", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("plan_id", sa.Integer(), nullable=True)
        )

    # 4. Backfill plan_id with the default plan's ID
    op.execute(
        "UPDATE allocation_targets SET plan_id = "
        "(SELECT id FROM allocation_plans WHERE name = 'Default Plan')"
    )

    # 5. Rebuild table: make plan_id NOT NULL, drop unique on tag_id, add
    #    composite unique + FK.  The naming_convention lets batch mode locate
    #    the unnamed UNIQUE(tag_id) that SQLite created.
    with op.batch_alter_table(
        "allocation_targets",
        schema=None,
        naming_convention=naming_convention,
    ) as batch_op:
        batch_op.alter_column("plan_id", nullable=False)
        batch_op.drop_constraint(
            "uq_allocation_targets_tag_id", type_="unique"
        )
        batch_op.create_unique_constraint("uq_plan_tag", ["plan_id", "tag_id"])
        batch_op.create_foreign_key(
            "fk_allocation_targets_plan_id",
            "allocation_plans",
            ["plan_id"],
            ["id"],
            ondelete="CASCADE",
        )


def downgrade() -> None:
    # Move all targets to a single plan (keep only default plan targets)
    op.execute(
        "DELETE FROM allocation_targets WHERE plan_id NOT IN "
        "(SELECT id FROM allocation_plans WHERE is_primary = 1)"
    )

    with op.batch_alter_table(
        "allocation_targets",
        schema=None,
        naming_convention=naming_convention,
    ) as batch_op:
        batch_op.drop_constraint("fk_allocation_targets_plan_id", type_="foreignkey")
        batch_op.drop_constraint("uq_plan_tag", type_="unique")
        batch_op.create_unique_constraint("uq_allocation_targets_tag_id", ["tag_id"])
        batch_op.drop_column("plan_id")

    op.drop_table("allocation_plans")
