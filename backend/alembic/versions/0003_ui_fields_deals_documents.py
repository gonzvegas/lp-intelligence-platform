"""Deal financial/structure columns + legal document UI fields

Revision ID: 0003
Revises: 0002
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("deals", sa.Column("deal_type", sa.String(), nullable=True))
    op.add_column("deals", sa.Column("security_type", sa.String(), nullable=True))
    op.add_column("deals", sa.Column("ebitda_usd", sa.BigInteger(), nullable=True))
    op.add_column("deals", sa.Column("revenue_usd", sa.BigInteger(), nullable=True))
    op.add_column("deals", sa.Column("leverage_multiple", sa.Float(), nullable=True))
    op.add_column("deals", sa.Column("ltv_pct", sa.Float(), nullable=True))
    op.add_column("deals", sa.Column("attachment_point", sa.Float(), nullable=True))
    op.add_column("deals", sa.Column("detachment_point", sa.Float(), nullable=True))
    op.add_column("deals", sa.Column("sponsored", sa.Boolean(), nullable=True))
    op.add_column("deals", sa.Column("co_invest", sa.Boolean(), nullable=True))
    op.add_column("deals", sa.Column("public_or_private", sa.String(), nullable=True))

    op.add_column("legal_documents", sa.Column("deal_id", sa.String(), nullable=True))
    op.create_index("ix_legal_documents_deal_id", "legal_documents", ["deal_id"])
    op.add_column(
        "legal_documents",
        sa.Column("version_number", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column("legal_documents", sa.Column("effective_from", sa.DateTime(timezone=True), nullable=True))
    op.add_column("legal_documents", sa.Column("supersedes_document_id", sa.String(), nullable=True))
    op.add_column("legal_documents", sa.Column("replaced_by_document_id", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("legal_documents", "replaced_by_document_id")
    op.drop_column("legal_documents", "supersedes_document_id")
    op.drop_column("legal_documents", "effective_from")
    op.drop_column("legal_documents", "version_number")
    op.drop_index("ix_legal_documents_deal_id", table_name="legal_documents")
    op.drop_column("legal_documents", "deal_id")

    for col in (
        "public_or_private",
        "co_invest",
        "sponsored",
        "detachment_point",
        "attachment_point",
        "ltv_pct",
        "leverage_multiple",
        "revenue_usd",
        "ebitda_usd",
        "security_type",
        "deal_type",
    ):
        op.drop_column("deals", col)
