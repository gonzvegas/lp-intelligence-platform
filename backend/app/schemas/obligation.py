from datetime import datetime

from pydantic import BaseModel, Field


class ObligationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    kind: str = Field(default="other")
    instrument_kind: str | None = None
    lp_id: str | None = None
    deal_id: str | None = None
    legal_document_id: str
    source_restriction_id: str | None = None
    section_ref: str | None = None
    due_at: datetime | None = None
    recurrence: str | None = None
    owner_role: str = Field(default="Compliance", min_length=1, max_length=120)
    evidence_note: str | None = None
    created_by: str | None = None


class ObligationPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    kind: str | None = None
    due_at: datetime | None = None
    recurrence: str | None = None
    owner_role: str | None = Field(default=None, min_length=1, max_length=120)
    status: str | None = None
    evidence_note: str | None = None


class ObligationOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    title: str
    kind: str
    instrument_kind: str | None
    lp_id: str | None
    deal_id: str | None
    legal_document_id: str
    source_restriction_id: str | None
    section_ref: str | None
    due_at: datetime | None
    recurrence: str | None
    owner_role: str
    status: str
    evidence_note: str | None
    created_by: str | None
    created_at: datetime
    updated_at: datetime
