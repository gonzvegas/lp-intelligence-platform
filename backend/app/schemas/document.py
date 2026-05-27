from datetime import datetime

from pydantic import BaseModel


class DocumentOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    external_id: str | None
    title: str
    lp_id: str | None
    fund_id: str | None
    deal_id: str | None
    instrument_kind: str | None
    source: str
    status: str
    version_number: int
    effective_from: datetime | None
    supersedes_document_id: str | None
    replaced_by_document_id: str | None
    uploaded_at: datetime
    processed_at: datetime | None
    content_sha256: str | None = None
    byte_size: int | None = None
    content_type: str | None = None
    has_content: bool = False


def document_to_out(doc) -> DocumentOut:
    base = DocumentOut.model_validate(doc)
    return base.model_copy(
        update={"has_content": bool(getattr(doc, "storage_key", None) or getattr(doc, "storage_path", None))}
    )


class DocumentContentUrlOut(BaseModel):
    url: str
    expires_in_seconds: int
    delivery: str  # signed_url | api_proxy
