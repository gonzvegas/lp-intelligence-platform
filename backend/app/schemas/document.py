from datetime import datetime

from pydantic import BaseModel


class DocumentOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    external_id: str | None
    title: str
    lp_id: str | None
    fund_id: str | None
    instrument_kind: str | None
    source: str
    storage_path: str | None
    status: str
    uploaded_at: datetime
    processed_at: datetime | None
