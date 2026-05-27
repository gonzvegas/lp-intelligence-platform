import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.allocation import Allocation
from app.models.lp import LimitedPartner
from app.schemas.allocation import AllocationCreate, AllocationOut, AllocationPatch

router = APIRouter(prefix="/allocations", tags=["allocations"])


async def _sync_lp_funded_from_allocations(db: AsyncSession, lp_id: str) -> None:
    """Keep LP.funded_usd aligned with sum of holdings (deployed exposure)."""
    total_result = await db.execute(
        select(func.coalesce(func.sum(Allocation.amount_usd), 0)).where(
            Allocation.lp_id == lp_id
        )
    )
    total = int(total_result.scalar_one())
    lp_result = await db.execute(select(LimitedPartner).where(LimitedPartner.id == lp_id))
    lp = lp_result.scalar_one_or_none()
    if lp is not None:
        lp.funded_usd = total


@router.get("", response_model=list[AllocationOut])
async def list_allocations(
    lp_id: str | None = None,
    fund_id: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[Allocation]:
    q = select(Allocation).order_by(Allocation.closed_at.desc())
    if lp_id:
        q = q.where(Allocation.lp_id == lp_id)
    if fund_id:
        q = q.where(Allocation.fund_id == fund_id)
    result = await db.execute(q)
    return list(result.scalars().all())


@router.post("", response_model=AllocationOut, status_code=201)
async def create_allocation(
    body: AllocationCreate, db: AsyncSession = Depends(get_db)
) -> Allocation:
    alloc = Allocation(id=f"alloc-{uuid.uuid4().hex[:12]}", **body.model_dump())
    db.add(alloc)
    await db.flush()
    await _sync_lp_funded_from_allocations(db, body.lp_id)
    await db.commit()
    await db.refresh(alloc)
    return alloc


@router.patch("/{allocation_id}", response_model=AllocationOut)
async def update_allocation(
    allocation_id: str,
    body: AllocationPatch,
    db: AsyncSession = Depends(get_db),
) -> Allocation:
    result = await db.execute(
        select(Allocation).where(Allocation.id == allocation_id)
    )
    alloc = result.scalar_one_or_none()
    if alloc is None:
        raise HTTPException(status_code=404, detail="Allocation not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(alloc, k, v)
    await db.flush()
    await _sync_lp_funded_from_allocations(db, alloc.lp_id)
    await db.commit()
    await db.refresh(alloc)
    return alloc


@router.delete("/{allocation_id}", status_code=204)
async def delete_allocation(
    allocation_id: str, db: AsyncSession = Depends(get_db)
) -> None:
    result = await db.execute(
        select(Allocation).where(Allocation.id == allocation_id)
    )
    alloc = result.scalar_one_or_none()
    if alloc is None:
        raise HTTPException(status_code=404, detail="Allocation not found")
    lp_id = alloc.lp_id
    await db.delete(alloc)
    await db.flush()
    await _sync_lp_funded_from_allocations(db, lp_id)
    await db.commit()
