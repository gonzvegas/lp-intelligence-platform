from datetime import datetime

from pydantic import BaseModel


class DealCreate(BaseModel):
    name: str
    fund_id: str | None = None
    sector: str | None = None
    geography: str | None = None
    stage: str | None = None
    status: str = "pipeline"
    proposed_amount_usd: int = 0
    structure_tags: list[str] | None = None
    esg_flags: list[str] | None = None

    deal_type: str | None = None
    security_type: str | None = None
    ebitda_usd: int | None = None
    revenue_usd: int | None = None
    leverage_multiple: float | None = None
    ltv_pct: float | None = None
    attachment_point: float | None = None
    detachment_point: float | None = None
    sponsored: bool | None = None
    co_invest: bool | None = None
    public_or_private: str | None = None


class DealOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    external_id: str | None
    name: str
    fund_id: str | None
    sector: str | None
    geography: str | None
    stage: str | None
    status: str
    proposed_amount_usd: int
    structure_tags: list[str] | None
    esg_flags: list[str] | None

    deal_type: str | None = None
    security_type: str | None = None
    ebitda_usd: int | None = None
    revenue_usd: int | None = None
    leverage_multiple: float | None = None
    ltv_pct: float | None = None
    attachment_point: float | None = None
    detachment_point: float | None = None
    sponsored: bool | None = None
    co_invest: bool | None = None
    public_or_private: str | None = None

    created_at: datetime
    updated_at: datetime
