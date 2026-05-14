from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.deal import Deal
from app.schemas.deal import DealOut

router = APIRouter(prefix="/deals", tags=["deals"])


@router.get("", response_model=list[DealOut])
async def list_deals(
    fund_id: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[Deal]:
    q = select(Deal)
    if fund_id:
        q = q.where(Deal.fund_id == fund_id)
    result = await db.execute(q)
    return list(result.scalars().all())


@router.get("/{deal_id}", response_model=DealOut)
async def get_deal(deal_id: str, db: AsyncSession = Depends(get_db)) -> Deal:
    result = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = result.scalar_one_or_none()
    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal
