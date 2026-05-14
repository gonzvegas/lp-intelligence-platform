from datetime import datetime

from pydantic import BaseModel


class IntegrationConnectionOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    provider: str
    base_url: str | None
    connected: bool
    last_sync_at: datetime | None
    created_at: datetime


class IntegrationRunOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    connection_id: str
    provider: str
    status: str
    rows_created: int
    rows_updated: int
    docs_queued: int
    error_message: str | None
    started_at: datetime
    finished_at: datetime | None
