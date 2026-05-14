from datetime import datetime

from pydantic import BaseModel


class LPCreate(BaseModel):
    name: str
    fund_id: str | None = None
    entity_type: str | None = None
    jurisdiction: str | None = None
    status: str = "active"
    commitment_usd: int = 0
    funded_usd: int = 0


class LPPatch(BaseModel):
    name: str | None = None
    fund_id: str | None = None
    entity_type: str | None = None
    jurisdiction: str | None = None
    status: str | None = None
    commitment_usd: int | None = None
    funded_usd: int | None = None


class LPOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    external_id: str | None
    name: str
    fund_id: str | None
    entity_type: str | None
    jurisdiction: str | None
    status: str
    commitment_usd: int
    funded_usd: int
    created_at: datetime
    updated_at: datetime
