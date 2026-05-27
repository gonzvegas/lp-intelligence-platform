"""Document blob storage + citation provenance

Revision ID: 0004
Revises: 0003
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "legal_documents",
        sa.Column("storage_backend", sa.String(), nullable=True),
    )
    op.add_column(
        "legal_documents",
        sa.Column("storage_key", sa.String(), nullable=True),
    )
    op.add_column(
        "legal_documents",
        sa.Column("content_sha256", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "legal_documents",
        sa.Column("byte_size", sa.BigInteger(), nullable=True),
    )
    op.add_column(
        "legal_documents",
        sa.Column("content_type", sa.String(), nullable=True, server_default="application/pdf"),
    )
    op.add_column(
        "legal_documents",
        sa.Column("uploaded_by", sa.String(), nullable=True),
    )
    op.create_index("ix_legal_documents_storage_key", "legal_documents", ["storage_key"])

    # Backfill storage_key from legacy filesystem paths (basename only under new layout)
    op.execute(
        """
        UPDATE legal_documents
        SET storage_key = storage_path,
            storage_backend = 'local'
        WHERE storage_path IS NOT NULL AND storage_key IS NULL
        """
    )

    op.add_column(
        "extracted_restrictions",
        sa.Column("source_chunk_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "extracted_restrictions",
        sa.Column("page_num", sa.Integer(), nullable=True),
    )
    op.add_column(
        "extracted_restrictions",
        sa.Column("section_ref", sa.String(), nullable=True),
    )
    op.create_foreign_key(
        "fk_restrictions_source_chunk",
        "extracted_restrictions",
        "document_chunks",
        ["source_chunk_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_restrictions_source_chunk", "extracted_restrictions", type_="foreignkey")
    op.drop_column("extracted_restrictions", "section_ref")
    op.drop_column("extracted_restrictions", "page_num")
    op.drop_column("extracted_restrictions", "source_chunk_id")

    op.drop_index("ix_legal_documents_storage_key", table_name="legal_documents")
    op.drop_column("legal_documents", "uploaded_by")
    op.drop_column("legal_documents", "content_type")
    op.drop_column("legal_documents", "byte_size")
    op.drop_column("legal_documents", "content_sha256")
    op.drop_column("legal_documents", "storage_key")
    op.drop_column("legal_documents", "storage_backend")
