import logging
from datetime import datetime, timezone

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.workers.tasks.document_pipeline", bind=True, max_retries=1)
def document_pipeline(self, doc_id: str) -> dict:
    from app.audit import log_audit_event_sync
    from app.models.document import LegalDocument
    from app.sync_database import get_sync_db
    from app.workers.document_pipeline import run_document_pipeline

    db = get_sync_db()
    try:
        logger.info("Starting document pipeline for %s", doc_id)
        result = run_document_pipeline(doc_id, db)
        logger.info(
            "Document pipeline complete: %s chunks, %s restrictions, embeddings=%s",
            result["chunks"],
            result["restrictions"],
            result["embedding_status"],
        )
        log_audit_event_sync(
            db,
            type="pipeline_stage_changed",
            summary=(
                f"Document extraction completed for {doc_id}: "
                f"{result['restrictions']} restrictions, {result['chunks']} chunks."
            ),
            actor="Document pipeline",
            persona="admin",
            entity_ref=doc_id,
        )
        db.commit()
        return result
    except Exception as exc:
        logger.exception("Document pipeline failed for %s: %s", doc_id, exc)
        try:
            doc = db.query(LegalDocument).filter_by(id=doc_id).first()
            if doc:
                doc.status = "error"
                log_audit_event_sync(
                    db,
                    type="pipeline_stage_changed",
                    summary=f"Document extraction failed for {doc_id}: {exc}",
                    actor="Document pipeline",
                    persona="admin",
                    entity_ref=doc_id,
                )
                db.commit()
        except Exception:
            pass
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()


@celery_app.task(name="app.workers.tasks.ping")
def ping() -> str:
    return "pong"


@celery_app.task(name="app.workers.tasks.dealcloud_sync", bind=True, max_retries=2)
def dealcloud_sync(self, run_id: str) -> dict:
    from app.audit import log_audit_event_sync
    from app.models.integration import IntegrationRun
    from app.sync_database import get_sync_db
    from app.workers.integrations.dealcloud import run_dealcloud_sync

    db = get_sync_db()
    try:
        run = db.query(IntegrationRun).filter_by(id=run_id).first()
        if run:
            run.status = "running"
            db.commit()

        result = run_dealcloud_sync(db)

        if run:
            run = db.query(IntegrationRun).filter_by(id=run_id).first()
            run.status = "completed" if not result.errors else "completed_with_errors"
            run.rows_created = result.lps_created + result.deals_created
            run.rows_updated = result.lps_updated + result.deals_updated
            run.finished_at = datetime.now(timezone.utc)
            if result.errors:
                run.error_message = "; ".join(result.errors)
            summary = (
                f"DealCloud sync {run_id}: {run.status} — "
                f"{result.lps_created} LPs created, {result.lps_updated} updated, "
                f"{result.deals_created} deals created, {result.deals_updated} updated."
            )
            if result.errors:
                summary += f" Errors: {'; '.join(result.errors[:3])}"
            log_audit_event_sync(
                db,
                type="sync_job_completed",
                summary=summary,
                actor="DealCloud sync",
                persona="admin",
                entity_ref=run_id,
            )
            db.commit()

        return {
            "lps_created": result.lps_created,
            "lps_updated": result.lps_updated,
            "deals_created": result.deals_created,
            "deals_updated": result.deals_updated,
            "commitments_applied": result.commitments_applied,
            "errors": result.errors,
        }

    except Exception as exc:
        logger.exception("DealCloud sync failed: %s", exc)
        try:
            run = db.query(IntegrationRun).filter_by(id=run_id).first()
            if run:
                run.status = "failed"
                run.error_message = str(exc)
                run.finished_at = datetime.now(timezone.utc)
                log_audit_event_sync(
                    db,
                    type="sync_job_completed",
                    summary=f"DealCloud sync {run_id} failed: {exc}",
                    actor="DealCloud sync",
                    persona="admin",
                    entity_ref=run_id,
                )
                db.commit()
        except Exception:
            pass
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()
