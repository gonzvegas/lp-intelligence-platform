from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Float, String, func
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

    deal_type: Mapped[str | None] = mapped_column(String)
    security_type: Mapped[str | None] = mapped_column(String)
    ebitda_usd: Mapped[int | None] = mapped_column(BigInteger)
    revenue_usd: Mapped[int | None] = mapped_column(BigInteger)
    leverage_multiple: Mapped[float | None] = mapped_column(Float)
    ltv_pct: Mapped[float | None] = mapped_column(Float)
    attachment_point: Mapped[float | None] = mapped_column(Float)
    detachment_point: Mapped[float | None] = mapped_column(Float)
    sponsored: Mapped[bool | None] = mapped_column(Boolean)
    co_invest: Mapped[bool | None] = mapped_column(Boolean)
    public_or_private: Mapped[str | None] = mapped_column(String)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
