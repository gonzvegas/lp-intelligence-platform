"""Add funds and allocations tables

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "funds",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("external_id", sa.String(), unique=True, nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("vintage", sa.String(), nullable=True),
        sa.Column("strategy", sa.String(), nullable=True),
        sa.Column("target_size_usd", sa.BigInteger(), nullable=True),
        sa.Column("currency", sa.String(), nullable=False, server_default="USD"),
        sa.Column("status", sa.String(), nullable=False, server_default="fundraising"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_funds_external_id", "funds", ["external_id"])

    op.create_table(
        "allocations",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("lp_id", sa.String(), nullable=False),
        sa.Column("fund_id", sa.String(), nullable=True),
        sa.Column("deal_id", sa.String(), nullable=True),
        sa.Column("deal_name", sa.String(), nullable=False),
        sa.Column("sector", sa.String(), nullable=True),
        sa.Column("amount_usd", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("closed_at", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_allocations_lp_id", "allocations", ["lp_id"])
    op.create_index("ix_allocations_fund_id", "allocations", ["fund_id"])
    op.create_index("ix_allocations_deal_id", "allocations", ["deal_id"])


def downgrade() -> None:
    op.drop_table("allocations")
    op.drop_table("funds")
