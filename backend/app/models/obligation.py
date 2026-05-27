from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Obligation(Base):
    __tablename__ = "obligations"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False, default="other")
    instrument_kind: Mapped[str | None] = mapped_column(String)
    lp_id: Mapped[str | None] = mapped_column(String, index=True)
    deal_id: Mapped[str | None] = mapped_column(String, index=True)
    legal_document_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("legal_documents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    source_restriction_id: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("extracted_restrictions.id", ondelete="SET NULL"),
        nullable=True,
    )
    section_ref: Mapped[str | None] = mapped_column(String)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    recurrence: Mapped[str | None] = mapped_column(String)
    owner_role: Mapped[str] = mapped_column(String, nullable=False, default="Compliance")
    status: Mapped[str] = mapped_column(String, nullable=False, default="open")
    evidence_note: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str | None] = mapped_column(String)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
