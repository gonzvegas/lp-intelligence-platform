import hashlib
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import log_audit_event
from app.config import settings
from app.database import get_db
from app.models.document import LegalDocument
from app.models.lp import LimitedPartner
from app.request_actor import actor_from_request
from app.schemas.document import DocumentContentUrlOut, DocumentOut, document_to_out
from app.storage import get_document_storage
from app.storage.keys import build_document_storage_key

router = APIRouter(prefix="/documents", tags=["documents"])

_MAX_UPLOAD_BYTES = 50 * 1024 * 1024


def _uploaded_by_from_request(request: Request) -> str | None:
    user = getattr(request.state, "user", None)
    if not isinstance(user, dict):
        return None
    return (
        user.get("preferred_username")
        or user.get("email")
        or user.get("oid")
        or user.get("sub")
    )


def _document_has_content(doc: LegalDocument) -> bool:
    return bool(doc.storage_key or doc.storage_path)


@router.get("", response_model=list[DocumentOut])
async def list_documents(
    lp_id: str | None = None,
    fund_id: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[DocumentOut]:
    q = select(LegalDocument)
    if lp_id:
        q = q.where(LegalDocument.lp_id == lp_id)
    if fund_id:
        q = q.where(LegalDocument.fund_id == fund_id)
    result = await db.execute(q)
    return [document_to_out(d) for d in result.scalars().all()]


@router.post("/upload", response_model=DocumentOut, status_code=201)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    lp_id: str = Form(...),
    fund_id: str | None = Form(None),
    instrument_kind: str = Form("side_letter"),
    title: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
) -> LegalDocument:
    """
    Save an LP-scoped PDF to object storage and enqueue extraction.
    """
    from app.workers.tasks import document_pipeline

    if not lp_id.strip():
        raise HTTPException(status_code=400, detail="lp_id is required")

    result = await db.execute(select(LimitedPartner).where(LimitedPartner.id == lp_id.strip()))
    lp_row = result.scalar_one_or_none()
    if lp_row is None:
        raise HTTPException(status_code=404, detail="Limited partner not found")

    resolved_fund: str | None = None
    if fund_id and fund_id.strip():
        resolved_fund = fund_id.strip()
    else:
        resolved_fund = lp_row.fund_id
    if resolved_fund is not None and not str(resolved_fund).strip():
        resolved_fund = None

    filename = file.filename or "document.pdf"
    base_title = (
        title.strip()
        if title and title.strip()
        else filename.rsplit(".", 1)[0] or filename
    )

    suffix = ".pdf"
    if filename.lower().endswith(".pdf"):
        suffix = ".pdf"

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(contents) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")
    if not contents.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    doc_id = f"doc-{uuid.uuid4().hex[:12]}"
    kind = instrument_kind.strip() if instrument_kind else "side_letter"
    storage_key = build_document_storage_key(
        doc_id=doc_id,
        fund_id=resolved_fund,
        lp_id=lp_row.id,
        instrument_kind=kind,
        suffix=suffix,
    )

    storage = get_document_storage()
    storage.put(storage_key, contents, "application/pdf")
    content_hash = hashlib.sha256(contents).hexdigest()

    doc = LegalDocument(
        id=doc_id,
        title=base_title,
        lp_id=lp_row.id,
        fund_id=resolved_fund,
        instrument_kind=kind,
        source="manual",
        storage_backend=storage.backend_name,
        storage_key=storage_key,
        content_sha256=content_hash,
        byte_size=len(contents),
        content_type="application/pdf",
        uploaded_by=_uploaded_by_from_request(request) or actor_from_request(request)[0],
        status="processing",
    )
    db.add(doc)
    actor, persona = actor_from_request(request)
    await log_audit_event(
        db,
        type="document_upload",
        summary=f"Document uploaded: {base_title} ({doc_id})",
        actor=actor,
        persona=persona,
        entity_ref=doc_id,
    )
    await db.commit()
    await db.refresh(doc)

    document_pipeline.delay(doc_id)

    return document_to_out(doc)


@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)) -> LegalDocument:
    result = await db.execute(
        select(LegalDocument).where(LegalDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return document_to_out(doc)


@router.get("/{doc_id}/content")
async def stream_document_content(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Stream PDF bytes through the API (works for local dev and Azure without SAS)."""
    result = await db.execute(select(LegalDocument).where(LegalDocument.id == doc_id))
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if not _document_has_content(doc):
        raise HTTPException(status_code=404, detail="Document file not available")

    from app.storage import resolve_document_bytes

    try:
        data = resolve_document_bytes(doc)
    except (OSError, ValueError) as exc:
        raise HTTPException(status_code=404, detail="Document file not found in storage") from exc

    filename = f"{doc.title}.pdf".replace('"', "")
    return StreamingResponse(
        iter([data]),
        media_type=doc.content_type or "application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "private, no-store",
        },
    )


@router.get("/{doc_id}/content-url", response_model=DocumentContentUrlOut)
async def document_content_url(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
) -> DocumentContentUrlOut:
    """Short-lived signed URL when the storage backend supports it; else API content path."""
    result = await db.execute(select(LegalDocument).where(LegalDocument.id == doc_id))
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if not _document_has_content(doc):
        raise HTTPException(status_code=404, detail="Document file not available")

    storage = get_document_storage()
    ttl = settings.document_content_url_ttl_seconds
    signed: str | None = None
    if doc.storage_key:
        signed = storage.presigned_get_url(doc.storage_key, ttl_seconds=ttl)

    if signed:
        return DocumentContentUrlOut(url=signed, expires_in_seconds=ttl, delivery="signed_url")

    return DocumentContentUrlOut(
        url=f"/documents/{doc_id}/content",
        expires_in_seconds=ttl,
        delivery="api_proxy",
    )


class RestrictionCitationOut(BaseModel):
    restriction_id: str
    document_id: str
    page_num: int | None
    section_ref: str | None
    clause_text: str | None
    summary: str
    content_url: str
    delivery: str


@router.get("/{doc_id}/restrictions/{restriction_id}/citation", response_model=RestrictionCitationOut)
async def restriction_citation(
    doc_id: str,
    restriction_id: str,
    db: AsyncSession = Depends(get_db),
) -> RestrictionCitationOut:
    from app.models.restriction import ExtractedRestriction

    doc_result = await db.execute(select(LegalDocument).where(LegalDocument.id == doc_id))
    doc = doc_result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    r_result = await db.execute(
        select(ExtractedRestriction).where(
            ExtractedRestriction.id == restriction_id,
            ExtractedRestriction.legal_document_id == doc_id,
        )
    )
    restriction = r_result.scalar_one_or_none()
    if restriction is None:
        raise HTTPException(status_code=404, detail="Restriction not found")

    url_out = await document_content_url(doc_id, db)
    page = restriction.page_num
    url = url_out.url
    if page and page > 0 and url_out.delivery == "api_proxy":
        url = f"{url}#page={page}"

    return RestrictionCitationOut(
        restriction_id=restriction.id,
        document_id=doc_id,
        page_num=page,
        section_ref=restriction.section_ref,
        clause_text=restriction.clause_text,
        summary=restriction.summary,
        content_url=url,
        delivery=url_out.delivery,
    )
