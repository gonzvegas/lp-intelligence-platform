"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "limited_partners",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("external_id", sa.String(), unique=True, nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("fund_id", sa.String(), nullable=True),
        sa.Column("entity_type", sa.String(), nullable=True),
        sa.Column("jurisdiction", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("commitment_usd", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("funded_usd", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_limited_partners_external_id", "limited_partners", ["external_id"])
    op.create_index("ix_limited_partners_fund_id", "limited_partners", ["fund_id"])

    op.create_table(
        "deals",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("external_id", sa.String(), unique=True, nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("fund_id", sa.String(), nullable=True),
        sa.Column("sector", sa.String(), nullable=True),
        sa.Column("geography", sa.String(), nullable=True),
        sa.Column("stage", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pipeline"),
        sa.Column("proposed_amount_usd", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("structure_tags", sa.ARRAY(sa.String()), nullable=True),
        sa.Column("esg_flags", sa.ARRAY(sa.String()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_deals_external_id", "deals", ["external_id"])
    op.create_index("ix_deals_fund_id", "deals", ["fund_id"])

    op.create_table(
        "legal_documents",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("external_id", sa.String(), unique=True, nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("lp_id", sa.String(), nullable=True),
        sa.Column("fund_id", sa.String(), nullable=True),
        sa.Column("instrument_kind", sa.String(), nullable=True),
        sa.Column("source", sa.String(), nullable=False, server_default="manual"),
        sa.Column("storage_path", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_legal_documents_external_id", "legal_documents", ["external_id"])
    op.create_index("ix_legal_documents_lp_id", "legal_documents", ["lp_id"])
    op.create_index("ix_legal_documents_fund_id", "legal_documents", ["fund_id"])

    op.create_table(
        "document_chunks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("document_id", sa.String(), sa.ForeignKey("legal_documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("page_num", sa.Integer(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(1024), nullable=True),
    )
    op.create_index("ix_document_chunks_document_id", "document_chunks", ["document_id"])

    op.create_table(
        "extracted_restrictions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("legal_document_id", sa.String(), nullable=False),
        sa.Column("lp_id", sa.String(), nullable=True),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("clause_text", sa.Text(), nullable=True),
        sa.Column("instrument_kind", sa.String(), nullable=True),
        sa.Column("severity", sa.String(), nullable=False, server_default="soft"),
        sa.Column("review_status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("precedence_rank", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_extracted_restrictions_legal_document_id", "extracted_restrictions", ["legal_document_id"])
    op.create_index("ix_extracted_restrictions_lp_id", "extracted_restrictions", ["lp_id"])

    op.create_table(
        "integration_connections",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("base_url", sa.String(), nullable=True),
        sa.Column("encrypted_api_key", sa.Text(), nullable=True),
        sa.Column("connected", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_integration_connections_provider", "integration_connections", ["provider"])

    op.create_table(
        "integration_runs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("connection_id", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="running"),
        sa.Column("rows_created", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rows_updated", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("docs_queued", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_integration_runs_connection_id", "integration_runs", ["connection_id"])


def downgrade() -> None:
    op.drop_table("integration_runs")
    op.drop_table("integration_connections")
    op.drop_table("extracted_restrictions")
    op.drop_table("document_chunks")
    op.drop_table("legal_documents")
    op.drop_table("deals")
    op.drop_table("limited_partners")
    op.execute("DROP EXTENSION IF EXISTS vector")
