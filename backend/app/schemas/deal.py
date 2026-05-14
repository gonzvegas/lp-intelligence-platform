from datetime import datetime

from pydantic import BaseModel


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
    created_at: datetime
    updated_at: datetime
