from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.restriction import ExtractedRestriction

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


async def _set_status(restriction_id: str, status: str, db: AsyncSession) -> ExtractedRestriction:
    result = await db.execute(
        select(ExtractedRestriction).where(ExtractedRestriction.id == restriction_id)
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Restriction not found")
    r.review_status = status
    await db.commit()
    await db.refresh(r)
    return r


@router.patch("/{restriction_id}/confirm", response_model=RestrictionOut)
async def confirm_restriction(
    restriction_id: str,
    db: AsyncSession = Depends(get_db),
) -> ExtractedRestriction:
    return await _set_status(restriction_id, "confirmed", db)


@router.patch("/{restriction_id}/reject", response_model=RestrictionOut)
async def reject_restriction(
    restriction_id: str,
    db: AsyncSession = Depends(get_db),
) -> ExtractedRestriction:
    return await _set_status(restriction_id, "rejected", db)
