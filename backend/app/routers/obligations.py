import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import log_audit_event
from app.database import get_db
from app.models.document import LegalDocument
from app.models.obligation import Obligation
from app.models.restriction import ExtractedRestriction
from app.request_actor import actor_from_request
from app.schemas.obligation import ObligationCreate, ObligationOut, ObligationPatch

router = APIRouter(prefix="/obligations", tags=["obligations"])

_VALID_KINDS = {
    "consent",
    "notice",
    "reporting",
    "mfn_election_window",
    "co_invest_allocation",
    "other",
}
_VALID_STATUSES = {"open", "done", "waived", "overdue"}


async def _validate_document_and_restriction(
    body: ObligationCreate,
    db: AsyncSession,
) -> None:
    doc_result = await db.execute(
        select(LegalDocument).where(LegalDocument.id == body.legal_document_id)
    )
    if doc_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Legal document not found")

    if body.source_restriction_id:
        r_result = await db.execute(
            select(ExtractedRestriction).where(
                ExtractedRestriction.id == body.source_restriction_id,
                ExtractedRestriction.legal_document_id == body.legal_document_id,
            )
        )
        if r_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=400,
                detail="source_restriction_id must belong to the same legal document",
            )


@router.get("", response_model=list[ObligationOut])
async def list_obligations(
    lp_id: str | None = None,
    legal_document_id: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[Obligation]:
    q = select(Obligation).order_by(Obligation.due_at.asc().nulls_last(), Obligation.created_at.desc())
    if lp_id:
        q = q.where((Obligation.lp_id == lp_id) | (Obligation.lp_id.is_(None)))
    if legal_document_id:
        q = q.where(Obligation.legal_document_id == legal_document_id)
    if status:
        q = q.where(Obligation.status == status)
    result = await db.execute(q)
    return list(result.scalars().all())


@router.post("", response_model=ObligationOut, status_code=201)
async def create_obligation(
    body: ObligationCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Obligation:
    if body.kind not in _VALID_KINDS:
        raise HTTPException(status_code=400, detail=f"Invalid kind: {body.kind}")

    await _validate_document_and_restriction(body, db)

    actor, persona = actor_from_request(request)
    created_by = body.created_by or actor

    row = Obligation(
        id=f"obl-{uuid.uuid4().hex[:12]}",
        title=body.title.strip(),
        kind=body.kind,
        instrument_kind=body.instrument_kind,
        lp_id=body.lp_id,
        deal_id=body.deal_id,
        legal_document_id=body.legal_document_id,
        source_restriction_id=body.source_restriction_id,
        section_ref=body.section_ref,
        due_at=body.due_at,
        recurrence=body.recurrence,
        owner_role=body.owner_role.strip(),
        status="open",
        evidence_note=body.evidence_note,
        created_by=created_by,
    )
    db.add(row)
    await log_audit_event(
        db,
        type="obligation_created",
        summary=f"Obligation created: {row.title} ({row.id})",
        actor=created_by,
        persona=persona,
        entity_ref=row.legal_document_id,
    )
    await db.commit()
    await db.refresh(row)
    return row


@router.patch("/{obligation_id}", response_model=ObligationOut)
async def update_obligation(
    obligation_id: str,
    body: ObligationPatch,
    db: AsyncSession = Depends(get_db),
) -> Obligation:
    result = await db.execute(select(Obligation).where(Obligation.id == obligation_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Obligation not found")

    data = body.model_dump(exclude_none=True)
    if "kind" in data and data["kind"] not in _VALID_KINDS:
        raise HTTPException(status_code=400, detail=f"Invalid kind: {data['kind']}")
    if "status" in data and data["status"] not in _VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status: {data['status']}")

    for key, value in data.items():
        if key == "title" and isinstance(value, str):
            setattr(row, key, value.strip())
        elif key == "owner_role" and isinstance(value, str):
            setattr(row, key, value.strip())
        else:
            setattr(row, key, value)

    await db.commit()
    await db.refresh(row)
    return row


@router.post("/{obligation_id}/complete", response_model=ObligationOut)
async def complete_obligation(
    obligation_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Obligation:
    result = await db.execute(select(Obligation).where(Obligation.id == obligation_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Obligation not found")
    if row.status in ("done", "waived"):
        return row
    row.status = "done"
    actor, persona = actor_from_request(request)
    await log_audit_event(
        db,
        type="obligation_completed",
        summary=f"Obligation marked complete: {row.title} ({row.id})",
        actor=actor,
        persona=persona,
        entity_ref=row.legal_document_id,
    )
    await db.commit()
    await db.refresh(row)
    return row
