from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Fund(Base):
    __tablename__ = "funds"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    external_id: Mapped[str | None] = mapped_column(String, unique=True, index=True)

    name: Mapped[str] = mapped_column(String, nullable=False)
    vintage: Mapped[str | None] = mapped_column(String)
    strategy: Mapped[str | None] = mapped_column(String)
    target_size_usd: Mapped[int | None] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String, default="USD")
    status: Mapped[str] = mapped_column(String, default="fundraising")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
