from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class LegalDocument(Base):
    __tablename__ = "legal_documents"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    external_id: Mapped[str | None] = mapped_column(String, unique=True, index=True)

    title: Mapped[str] = mapped_column(String, nullable=False)
    lp_id: Mapped[str | None] = mapped_column(String, index=True)
    fund_id: Mapped[str | None] = mapped_column(String, index=True)
    instrument_kind: Mapped[str | None] = mapped_column(String)
    source: Mapped[str] = mapped_column(String, default="manual")

    storage_path: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="pending")

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    chunks: Mapped[list["DocumentChunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[str] = mapped_column(
        String, ForeignKey("legal_documents.id", ondelete="CASCADE"), index=True
    )
    page_num: Mapped[int | None] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1024))

    document: Mapped["LegalDocument"] = relationship(back_populates="chunks")
