"""
DealCloud sync adapter — synchronous version for Celery workers.

Handles OAuth2 token management, paginated row fetching, and upsert logic
for InvestorVehicle (LPs), Deal, and LPCommitments objects.

Works identically against the mock server and the real DealCloud instance —
only DEALCLOUD_BASE_URL, DEALCLOUD_CLIENT_ID, and DEALCLOUD_CLIENT_SECRET
need to change in .env.
"""

import logging
import time
from dataclasses import dataclass, field

import httpx
from sqlalchemy.orm import Session

from app.config import settings

logger = logging.getLogger(__name__)

_PAGE_SIZE = 500


# ---------------------------------------------------------------------------
# Token cache
# ---------------------------------------------------------------------------

@dataclass
class _TokenCache:
    token: str = ""
    expires_at: float = 0.0


_token_cache = _TokenCache()


def _get_token(client: httpx.Client) -> str:
    if _token_cache.token and time.time() < _token_cache.expires_at - 30:
        return _token_cache.token

    resp = client.post(
        f"{settings.dealcloud_base_url}/api/rest/v1/oauth/token",
        data={
            "grant_type": "client_credentials",
            "client_id": settings.dealcloud_client_id,
            "client_secret": settings.dealcloud_client_secret,
            "scope": "data",
        },
        timeout=15,
    )
    resp.raise_for_status()
    body = resp.json()
    _token_cache.token = body["access_token"]
    _token_cache.expires_at = time.time() + body.get("expires_in", 900)
    logger.info("DealCloud token refreshed.")
    return _token_cache.token


# ---------------------------------------------------------------------------
# Paginated row fetcher
# ---------------------------------------------------------------------------

def _fetch_all_rows(client: httpx.Client, entry_type: str) -> list[dict]:
    rows: list[dict] = []
    skip = 0

    while True:
        token = _get_token(client)
        resp = client.post(
            f"{settings.dealcloud_base_url}/api/rest/v4/data/entrydata/rows/query/{entry_type}",
            headers={"Authorization": f"Bearer {token}"},
            json={"limit": _PAGE_SIZE, "skip": skip, "wrapIntoArrays": True},
            timeout=30,
        )
        resp.raise_for_status()
        body = resp.json()
        page = body.get("rows", [])
        rows.extend(page)

        total = body.get("totalRecords", 0)
        skip += len(page)
        logger.info("%s: fetched %d / %d rows", entry_type, skip, total)

        if skip >= total or not page:
            break

    return rows


# ---------------------------------------------------------------------------
# Field helpers
# ---------------------------------------------------------------------------

def _ref_name(value: object) -> str | None:
    if isinstance(value, dict):
        return value.get("name")
    return None


def _ref_id(value: object) -> int | None:
    if isinstance(value, dict):
        return value.get("id")
    return None


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class SyncResult:
    lps_created: int = 0
    lps_updated: int = 0
    deals_created: int = 0
    deals_updated: int = 0
    commitments_applied: int = 0
    errors: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Public sync function
# ---------------------------------------------------------------------------

_DEAL_STATUS_MAP = {
    "Active": "pipeline",
    "Closed": "closed",
    "Passed/Dead": "passed",
}


def run_dealcloud_sync(db: Session) -> SyncResult:
    """
    Full sync:
      InvestorVehicle → limited_partners
      Deal            → deals
      LPCommitments   → updates limited_partners.commitment_usd / fund_id
    """
    from app.models.deal import Deal
    from app.models.lp import LimitedPartner

    result = SyncResult()

    with httpx.Client(timeout=30) as client:
        try:
            lp_rows = _fetch_all_rows(client, "InvestorVehicle")
            deal_rows = _fetch_all_rows(client, "Deal")
            commitment_rows = _fetch_all_rows(client, "LPCommitments")
        except httpx.HTTPError as exc:
            result.errors.append(f"Fetch failed: {exc}")
            return result

    # Build commitment + fund maps keyed by DealCloud InvestorVehicle EntryId
    commitment_map: dict[int, int] = {}
    fund_map: dict[int, str] = {}
    for row in commitment_rows:
        iv_id = _ref_id(row.get("InvestorVehicle"))
        if iv_id is None:
            continue
        commitment_map[iv_id] = commitment_map.get(iv_id, 0) + int(row.get("CommitmentAmount") or 0)
        fund_ref = row.get("Fund")
        if fund_ref and iv_id not in fund_map:
            fund_map[iv_id] = str(_ref_id(fund_ref) or "")

    # --- Upsert LPs ---
    for row in lp_rows:
        dc_id = row.get("EntryId")
        if not dc_id:
            continue
        external_id = f"dc-{dc_id}"

        existing = db.query(LimitedPartner).filter_by(external_id=external_id).first()
        if existing:
            existing.name = row.get("InvestorVehicleNameText") or existing.name
            existing.jurisdiction = _ref_name(row.get("Jurisdiction"))
            existing.entity_type = _ref_name(row.get("LegalStructure"))
            existing.fund_id = fund_map.get(dc_id)
            existing.commitment_usd = commitment_map.get(dc_id, 0)
            result.lps_updated += 1
        else:
            db.add(LimitedPartner(
                id=external_id,
                external_id=external_id,
                name=row.get("InvestorVehicleNameText") or f"LP {dc_id}",
                jurisdiction=_ref_name(row.get("Jurisdiction")),
                entity_type=_ref_name(row.get("LegalStructure")),
                fund_id=fund_map.get(dc_id),
                commitment_usd=commitment_map.get(dc_id, 0),
                funded_usd=0,
                status="active",
            ))
            result.lps_created += 1

    # --- Upsert Deals ---
    for row in deal_rows:
        dc_id = row.get("EntryId")
        if not dc_id:
            continue
        external_id = f"dc-{dc_id}"
        raw_status = _ref_name(row.get("Status")) or "Active"

        existing = db.query(Deal).filter_by(external_id=external_id).first()
        if existing:
            existing.name = row.get("ProjectName") or existing.name
            existing.sector = _ref_name(row.get("Sector"))
            existing.geography = _ref_name(row.get("SubSector"))
            existing.status = _DEAL_STATUS_MAP.get(raw_status, "pipeline")
            existing.stage = _ref_name(row.get("Stage"))
            existing.proposed_amount_usd = int(row.get("GlobalDealSize") or 0)
            result.deals_updated += 1
        else:
            db.add(Deal(
                id=external_id,
                external_id=external_id,
                name=row.get("ProjectName") or f"Deal {dc_id}",
                sector=_ref_name(row.get("Sector")),
                geography=_ref_name(row.get("SubSector")),
                status=_DEAL_STATUS_MAP.get(raw_status, "pipeline"),
                stage=_ref_name(row.get("Stage")),
                proposed_amount_usd=int(row.get("GlobalDealSize") or 0),
            ))
            result.deals_created += 1

    result.commitments_applied = len(commitment_map)
    db.commit()

    # --- Pull document attachments (new client — previous one is closed) ---
    with httpx.Client(timeout=30) as attachment_client:
        _sync_attachments(attachment_client, commitment_rows, db, result)

    return result


def _sync_attachments(
    client: httpx.Client,
    commitment_rows: list[dict],
    db: Session,
    result: SyncResult,
) -> None:
    """
    For each LPCommitment that has an AssociatedDocuments attachment reference,
    download the PDF, save to storage, create a LegalDocument row, and enqueue
    the document_pipeline task.
    """
    import os
    import uuid

    from app.config import settings
    from app.models.document import LegalDocument
    from app.workers.tasks import document_pipeline

    os.makedirs(settings.docs_storage_path, exist_ok=True)

    for row in commitment_rows:
        attachment_ref = row.get("AssociatedDocuments")
        if not attachment_ref:
            continue

        attachment_id = _ref_id(attachment_ref)
        attachment_name = _ref_name(attachment_ref) or f"Document {attachment_id}"
        if not attachment_id:
            continue

        external_id = f"dc-att-{attachment_id}"
        existing = db.query(LegalDocument).filter_by(external_id=external_id).first()
        if existing:
            logger.info("Attachment %s already exists, skipping.", external_id)
            continue

        iv_ref = row.get("InvestorVehicle")
        lp_external_id = f"dc-{_ref_id(iv_ref)}" if iv_ref else None

        # Download the PDF
        try:
            token = _get_token(client)
            resp = client.get(
                f"{settings.dealcloud_base_url}/api/rest/v4/data/files/{attachment_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=30,
            )
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("Failed to download attachment %s: %s", attachment_id, exc)
            result.errors.append(f"Attachment {attachment_id} download failed: {exc}")
            continue

        doc_id = f"doc-{uuid.uuid4().hex[:12]}"
        storage_path = os.path.join(settings.docs_storage_path, f"{doc_id}.pdf")

        with open(storage_path, "wb") as f:
            f.write(resp.content)

        doc = LegalDocument(
            id=doc_id,
            external_id=external_id,
            title=attachment_name,
            lp_id=lp_external_id,
            source="dealcloud",
            storage_path=storage_path,
            status="processing",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        document_pipeline.delay(doc_id)
        logger.info("Queued document pipeline for %s (%s)", doc_id, attachment_name)
