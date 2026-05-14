from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LimitedPartner(Base):
    __tablename__ = "limited_partners"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    external_id: Mapped[str | None] = mapped_column(String, unique=True, index=True)

    name: Mapped[str] = mapped_column(String, nullable=False)
    fund_id: Mapped[str | None] = mapped_column(String, index=True)
    entity_type: Mapped[str | None] = mapped_column(String)
    jurisdiction: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="active")

    commitment_usd: Mapped[int] = mapped_column(BigInteger, default=0)
    funded_usd: Mapped[int] = mapped_column(BigInteger, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
