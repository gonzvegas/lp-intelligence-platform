from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    external_id: Mapped[str | None] = mapped_column(String, unique=True, index=True)

    name: Mapped[str] = mapped_column(String, nullable=False)
    fund_id: Mapped[str | None] = mapped_column(String, index=True)
    sector: Mapped[str | None] = mapped_column(String)
    geography: Mapped[str | None] = mapped_column(String)
    stage: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="pipeline")

    proposed_amount_usd: Mapped[int] = mapped_column(BigInteger, default=0)
    structure_tags: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    esg_flags: Mapped[list[str] | None] = mapped_column(ARRAY(String))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
