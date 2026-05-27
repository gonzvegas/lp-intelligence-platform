from datetime import datetime

from pydantic import BaseModel


class AuditEventOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    at: datetime
    actor: str
    persona: str
    type: str
    summary: str
    entity_ref: str | None
