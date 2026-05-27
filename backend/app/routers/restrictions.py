from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import log_audit_event
from app.database import get_db
from app.models.restriction import ExtractedRestriction
from app.request_actor import actor_from_request

router = APIRouter(prefix="/restrictions", tags=["restrictions"])


class RestrictionOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    legal_document_id: str
    lp_id: str | None
    category: str | None
    summary: str
    clause_text: str | None
    instrument_kind: str | None
    severity: str
    review_status: str
    precedence_rank: int
    page_num: int | None
    section_ref: str | None
    source_chunk_id: int | None


@router.get("", response_model=list[RestrictionOut])
async def list_restrictions(
    lp_id: str | None = None,
    review_status: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[ExtractedRestriction]:
    q = select(ExtractedRestriction)
    if lp_id:
        q = q.where(ExtractedRestriction.lp_id == lp_id)
    if review_status:
        q = q.where(ExtractedRestriction.review_status == review_status)
    result = await db.execute(q)
    return list(result.scalars().all())


async def _set_status(
    request: Request,
    restriction_id: str,
    status: str,
    audit_type: str,
    audit_summary_prefix: str,
    db: AsyncSession,
) -> ExtractedRestriction:
    result = await db.execute(
        select(ExtractedRestriction).where(ExtractedRestriction.id == restriction_id)
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Restriction not found")
    r.review_status = status
    actor, persona = actor_from_request(request)
    summary_text = (r.summary or "")[:200]
    await log_audit_event(
        db,
        type=audit_type,
        summary=f"{audit_summary_prefix} ({restriction_id}): {summary_text}",
        actor=actor,
        persona=persona,
        entity_ref=r.legal_document_id,
    )
    await db.commit()
    await db.refresh(r)
    return r


@router.patch("/{restriction_id}/confirm", response_model=RestrictionOut)
async def confirm_restriction(
    restriction_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> ExtractedRestriction:
    return await _set_status(
        request,
        restriction_id,
        "confirmed",
        "restriction_confirmed",
        "Restriction accepted for screening",
        db,
    )


@router.patch("/{restriction_id}/reject", response_model=RestrictionOut)
async def reject_restriction(
    restriction_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> ExtractedRestriction:
    return await _set_status(
        request,
        restriction_id,
        "rejected",
        "restriction_rejected",
        "Restriction rejected",
        db,
    )
