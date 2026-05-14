import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.lp import LimitedPartner
from app.schemas.lp import LPCreate, LPOut, LPPatch

router = APIRouter(prefix="/lps", tags=["lps"])


@router.get("", response_model=list[LPOut])
async def list_lps(
    fund_id: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[LimitedPartner]:
    q = select(LimitedPartner)
    if fund_id:
        q = q.where(LimitedPartner.fund_id == fund_id)
    result = await db.execute(q)
    return list(result.scalars().all())


@router.get("/{lp_id}", response_model=LPOut)
async def get_lp(lp_id: str, db: AsyncSession = Depends(get_db)) -> LimitedPartner:
    result = await db.execute(
        select(LimitedPartner).where(LimitedPartner.id == lp_id)
    )
    lp = result.scalar_one_or_none()
    if lp is None:
        raise HTTPException(status_code=404, detail="LP not found")
    return lp


@router.post("", response_model=LPOut, status_code=201)
async def create_lp(
    body: LPCreate, db: AsyncSession = Depends(get_db)
) -> LimitedPartner:
    lp = LimitedPartner(id=f"lp-{uuid.uuid4().hex[:12]}", **body.model_dump())
    db.add(lp)
    await db.commit()
    await db.refresh(lp)
    return lp


@router.patch("/{lp_id}", response_model=LPOut)
async def update_lp(
    lp_id: str, body: LPPatch, db: AsyncSession = Depends(get_db)
) -> LimitedPartner:
    result = await db.execute(
        select(LimitedPartner).where(LimitedPartner.id == lp_id)
    )
    lp = result.scalar_one_or_none()
    if lp is None:
        raise HTTPException(status_code=404, detail="LP not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(lp, k, v)
    await db.commit()
    await db.refresh(lp)
    return lp


@router.delete("/{lp_id}", status_code=204)
async def delete_lp(lp_id: str, db: AsyncSession = Depends(get_db)) -> None:
    result = await db.execute(
        select(LimitedPartner).where(LimitedPartner.id == lp_id)
    )
    lp = result.scalar_one_or_none()
    if lp is None:
        raise HTTPException(status_code=404, detail="LP not found")
    await db.delete(lp)
    await db.commit()
