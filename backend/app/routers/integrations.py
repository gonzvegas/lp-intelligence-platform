import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.integration import IntegrationConnection, IntegrationRun
from app.schemas.integration import IntegrationConnectionOut, IntegrationRunOut

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("", response_model=list[IntegrationConnectionOut])
async def list_integrations(
    db: AsyncSession = Depends(get_db),
) -> list[IntegrationConnection]:
    result = await db.execute(select(IntegrationConnection))
    return list(result.scalars().all())


@router.get("/runs", response_model=list[IntegrationRunOut])
async def list_runs(
    provider: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[IntegrationRun]:
    q = select(IntegrationRun).order_by(IntegrationRun.started_at.desc())
    if provider:
        q = q.where(IntegrationRun.provider == provider)
    result = await db.execute(q)
    return list(result.scalars().all())


@router.get("/dealcloud/status")
async def dealcloud_status(db: AsyncSession = Depends(get_db)) -> dict:
    conn = (await db.execute(
        select(IntegrationConnection).where(IntegrationConnection.provider == "dealcloud")
    )).scalar_one_or_none()

    last_run = (await db.execute(
        select(IntegrationRun)
        .where(IntegrationRun.provider == "dealcloud")
        .order_by(IntegrationRun.started_at.desc())
        .limit(1)
    )).scalar_one_or_none()

    return {
        "connected": conn.connected if conn else False,
        "last_sync_at": conn.last_sync_at.isoformat() if conn and conn.last_sync_at else None,
        "last_run_status": last_run.status if last_run else None,
        "last_run_id": last_run.id if last_run else None,
    }


@router.post("/dealcloud/sync", response_model=IntegrationRunOut, status_code=202)
async def trigger_dealcloud_sync(db: AsyncSession = Depends(get_db)) -> IntegrationRun:
    from app.workers.tasks import dealcloud_sync

    # Ensure a connection record exists
    conn = (await db.execute(
        select(IntegrationConnection).where(IntegrationConnection.provider == "dealcloud")
    )).scalar_one_or_none()

    if not conn:
        conn = IntegrationConnection(
            id=f"conn-dealcloud",
            provider="dealcloud",
            connected=True,
            last_sync_at=None,
        )
        db.add(conn)

    # Create a run record so the task can update it
    run_id = f"run-{uuid.uuid4().hex[:12]}"
    run = IntegrationRun(
        id=run_id,
        connection_id=conn.id,
        provider="dealcloud",
        status="queued",
        started_at=datetime.now(timezone.utc),
    )
    db.add(run)

    # Update last_sync_at on the connection
    conn.last_sync_at = datetime.now(timezone.utc)
    conn.connected = True

    await db.commit()
    await db.refresh(run)

    # Enqueue the Celery task
    dealcloud_sync.delay(run_id)

    return run
