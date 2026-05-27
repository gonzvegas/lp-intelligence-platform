"""Append-only audit trail helpers (async routers + sync Celery workers)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.models.audit_event import AuditEvent


def log_audit_event_sync(
    db: Session,
    *,
    type: str,
    summary: str,
    actor: str = "System",
    persona: str = "admin",
    entity_ref: str | None = None,
    at: datetime | None = None,
) -> AuditEvent:
    row = AuditEvent(
        id=f"ae-{uuid.uuid4().hex[:12]}",
        at=at or datetime.now(timezone.utc),
        actor=actor,
        persona=persona,
        type=type,
        summary=summary,
        entity_ref=entity_ref,
    )
    db.add(row)
    return row


async def log_audit_event(
    db: AsyncSession,
    *,
    type: str,
    summary: str,
    actor: str = "API user",
    persona: str = "admin",
    entity_ref: str | None = None,
    at: datetime | None = None,
) -> AuditEvent:
    row = AuditEvent(
        id=f"ae-{uuid.uuid4().hex[:12]}",
        at=at or datetime.now(timezone.utc),
        actor=actor,
        persona=persona,
        type=type,
        summary=summary,
        entity_ref=entity_ref,
    )
    db.add(row)
    return row
