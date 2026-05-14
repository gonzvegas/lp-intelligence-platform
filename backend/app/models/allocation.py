from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Allocation(Base):
    __tablename__ = "allocations"

    id: Mapped[str] = mapped_column(String, primary_key=True)

    lp_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    fund_id: Mapped[str | None] = mapped_column(String, index=True)
    deal_id: Mapped[str | None] = mapped_column(String, index=True)

    deal_name: Mapped[str] = mapped_column(String, nullable=False)
    sector: Mapped[str | None] = mapped_column(String)
    amount_usd: Mapped[int] = mapped_column(BigInteger, default=0)
    closed_at: Mapped[str | None] = mapped_column(String)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
