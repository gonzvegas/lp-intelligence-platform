"""User-created operating obligations

Revision ID: 0005
Revises: 0004
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "obligations",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False, server_default="other"),
        sa.Column("instrument_kind", sa.String(), nullable=True),
        sa.Column("lp_id", sa.String(), nullable=True),
        sa.Column("deal_id", sa.String(), nullable=True),
        sa.Column(
            "legal_document_id",
            sa.String(),
            sa.ForeignKey("legal_documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "source_restriction_id",
            sa.String(),
            sa.ForeignKey("extracted_restrictions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("section_ref", sa.String(), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recurrence", sa.String(), nullable=True),
        sa.Column("owner_role", sa.String(), nullable=False, server_default="Compliance"),
        sa.Column("status", sa.String(), nullable=False, server_default="open"),
        sa.Column("evidence_note", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_obligations_legal_document_id", "obligations", ["legal_document_id"])
    op.create_index("ix_obligations_lp_id", "obligations", ["lp_id"])
    op.create_index("ix_obligations_deal_id", "obligations", ["deal_id"])
    op.create_index("ix_obligations_source_restriction_id", "obligations", ["source_restriction_id"])


def downgrade() -> None:
    op.drop_index("ix_obligations_source_restriction_id", table_name="obligations")
    op.drop_index("ix_obligations_deal_id", table_name="obligations")
    op.drop_index("ix_obligations_lp_id", table_name="obligations")
    op.drop_index("ix_obligations_legal_document_id", table_name="obligations")
    op.drop_table("obligations")
