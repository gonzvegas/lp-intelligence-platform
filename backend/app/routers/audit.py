from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.audit_event import AuditEvent
from app.schemas.audit import AuditEventOut

router = APIRouter(prefix="/audit-events", tags=["audit"])


@router.get("", response_model=list[AuditEventOut])
async def list_audit_events(
    entity_ref: str | None = None,
    type: str | None = None,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
) -> list[AuditEvent]:
    q = select(AuditEvent).order_by(AuditEvent.at.desc())
    if entity_ref:
        q = q.where(AuditEvent.entity_ref == entity_ref)
    if type:
        q = q.where(AuditEvent.type == type)
    if limit > 0:
        q = q.limit(min(limit, 500))
    result = await db.execute(q)
    return list(result.scalars().all())
