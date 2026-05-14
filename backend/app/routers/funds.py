import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.fund import Fund
from app.schemas.fund import FundCreate, FundOut

router = APIRouter(prefix="/funds", tags=["funds"])


@router.get("", response_model=list[FundOut])
async def list_funds(db: AsyncSession = Depends(get_db)) -> list[Fund]:
    result = await db.execute(select(Fund).order_by(Fund.created_at.desc()))
    return list(result.scalars().all())


@router.get("/{fund_id}", response_model=FundOut)
async def get_fund(fund_id: str, db: AsyncSession = Depends(get_db)) -> Fund:
    result = await db.execute(select(Fund).where(Fund.id == fund_id))
    fund = result.scalar_one_or_none()
    if fund is None:
        raise HTTPException(status_code=404, detail="Fund not found")
    return fund


@router.post("", response_model=FundOut, status_code=201)
async def create_fund(body: FundCreate, db: AsyncSession = Depends(get_db)) -> Fund:
    fund = Fund(id=f"fund-{uuid.uuid4().hex[:12]}", **body.model_dump())
    db.add(fund)
    await db.commit()
    await db.refresh(fund)
    return fund


@router.patch("/{fund_id}", response_model=FundOut)
async def update_fund(
    fund_id: str, body: FundCreate, db: AsyncSession = Depends(get_db)
) -> Fund:
    result = await db.execute(select(Fund).where(Fund.id == fund_id))
    fund = result.scalar_one_or_none()
    if fund is None:
        raise HTTPException(status_code=404, detail="Fund not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(fund, k, v)
    await db.commit()
    await db.refresh(fund)
    return fund


@router.delete("/{fund_id}", status_code=204)
async def delete_fund(fund_id: str, db: AsyncSession = Depends(get_db)) -> None:
    result = await db.execute(select(Fund).where(Fund.id == fund_id))
    fund = result.scalar_one_or_none()
    if fund is None:
        raise HTTPException(status_code=404, detail="Fund not found")
    await db.delete(fund)
    await db.commit()
