from datetime import datetime

from pydantic import BaseModel


class AllocationCreate(BaseModel):
    lp_id: str
    fund_id: str | None = None
    deal_id: str | None = None
    deal_name: str
    sector: str | None = None
    amount_usd: int
    closed_at: str | None = None


class AllocationPatch(BaseModel):
    deal_name: str | None = None
    sector: str | None = None
    amount_usd: int | None = None
    closed_at: str | None = None


class AllocationOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    lp_id: str
    fund_id: str | None
    deal_id: str | None
    deal_name: str
    sector: str | None
    amount_usd: int
    closed_at: str | None
    created_at: datetime
    updated_at: datetime
