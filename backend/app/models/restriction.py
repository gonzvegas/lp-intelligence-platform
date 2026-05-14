from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ExtractedRestriction(Base):
    __tablename__ = "extracted_restrictions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    legal_document_id: Mapped[str] = mapped_column(String, index=True)
    lp_id: Mapped[str | None] = mapped_column(String, index=True)

    category: Mapped[str | None] = mapped_column(String)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    clause_text: Mapped[str | None] = mapped_column(Text)
    instrument_kind: Mapped[str | None] = mapped_column(String)
    severity: Mapped[str] = mapped_column(String, default="soft")
    review_status: Mapped[str] = mapped_column(String, default="draft")
    precedence_rank: Mapped[int] = mapped_column(Integer, default=50)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
