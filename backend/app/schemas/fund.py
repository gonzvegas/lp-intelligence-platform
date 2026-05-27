from datetime import datetime

from pydantic import BaseModel


class FundCreate(BaseModel):
    name: str
    vintage: str | None = None
    strategy: str | None = None
    target_size_usd: int | None = None
    currency: str = "USD"
    status: str = "fundraising"


class FundPatch(BaseModel):
    """Partial updates for PATCH /funds/{id}; only fields present in JSON are applied."""

    name: str | None = None
    vintage: str | None = None
    strategy: str | None = None
    target_size_usd: int | None = None
    currency: str | None = None
    status: str | None = None


class FundOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    external_id: str | None
    name: str
    vintage: str | None
    strategy: str | None
    target_size_usd: int | None
    currency: str
    status: str
    created_at: datetime
    updated_at: datetime
