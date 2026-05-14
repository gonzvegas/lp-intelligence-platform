"""
Synchronous SQLAlchemy engine for Celery workers.

FastAPI uses asyncpg + async engine (database.py).
Celery workers use psycopg2 + sync engine here to avoid event loop conflicts.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

# Convert asyncpg URL to psycopg2
_sync_url = settings.database_url.replace(
    "postgresql+asyncpg://", "postgresql+psycopg2://"
)

sync_engine = create_engine(_sync_url, pool_pre_ping=True, pool_size=5)

SyncSessionLocal = sessionmaker(bind=sync_engine, autocommit=False, autoflush=False)


def get_sync_db() -> Session:
    return SyncSessionLocal()
