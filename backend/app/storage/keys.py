"""Object key layout for legal document blobs (portable across storage backends)."""


def build_document_storage_key(
    *,
    doc_id: str,
    fund_id: str | None,
    lp_id: str | None,
    instrument_kind: str | None,
    suffix: str = ".pdf",
) -> str:
    fund = (fund_id or "unscoped").strip()
    lp = (lp_id or "fund-wide").strip()
    kind = (instrument_kind or "document").strip()
    ext = suffix if suffix.startswith(".") else f".{suffix}"
    return f"funds/{fund}/lps/{lp}/instruments/{kind}/{doc_id}{ext}"
