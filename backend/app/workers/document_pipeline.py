"""
Document pipeline: PDF → text → page-aware chunks → Voyage embeddings → Claude extraction.

Steps:
  1. Load PDF from object storage (or legacy path)
  2. Extract text per page with pypdf
  3. Chunk within each page; store real page_num on each chunk
  4. Embed each chunk with Voyage AI voyage-law-2 (1024 dimensions)
  5. Run Claude to extract structured restrictions + link to source chunks
  6. Write document_chunks + extracted_restrictions rows; mark document needs_review
"""

import io
import json
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

_EXTRACTION_PROMPT = """You are a legal analyst specializing in private equity fund documents.

Analyze the following text from an LP side letter or limited partnership agreement and extract
ALL investment restrictions, obligations, and special provisions.

For each restriction found, return a JSON object with:
- "category": one of "sector", "geography", "esg", "erisa", "concentration", "mfn", "co_invest", "reporting", "other"
- "summary": a concise one-sentence description of the restriction
- "clause_text": the exact verbatim text from the document (max 500 chars)
- "section_ref": section label if visible (e.g. "Section 4.2" or "LPA § 7.4")
- "severity": "hard" (absolute prohibition) or "soft" (requires consent / notification)
- "instrument_kind": "side_letter", "lpa", or "other"

Return ONLY a JSON array of restriction objects. If no restrictions are found, return [].

Document text:
{text}"""


def _chunk_page_texts(page_texts: list[str]) -> list[tuple[int, str]]:
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1800,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " "],
    )
    out: list[tuple[int, str]] = []
    for page_num, page_text in enumerate(page_texts, start=1):
        text = (page_text or "").strip()
        if not text:
            continue
        for piece in splitter.split_text(text):
            if piece.strip():
                out.append((page_num, piece.strip()))
    return out


def run_document_pipeline(doc_id: str, db: Session) -> dict:
    from pypdf import PdfReader

    from app.models.document import DocumentChunk, LegalDocument
    from app.models.restriction import ExtractedRestriction
    from app.storage import resolve_document_bytes
    from app.storage.citation import find_source_chunk

    doc = db.query(LegalDocument).filter_by(id=doc_id).first()
    if not doc:
        raise ValueError(f"Document {doc_id} not found")

    if not doc.storage_key and not doc.storage_path:
        raise ValueError(f"Document {doc_id} has no stored content")

    # --- Step 1: Extract text (page-by-page) ---
    logger.info("Extracting text for document %s", doc_id)
    try:
        pdf_bytes = resolve_document_bytes(doc)
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages_text = [page.extract_text() or "" for page in reader.pages]
        full_text = "\n".join(pages_text)
    except Exception as exc:
        doc.status = "error"
        db.commit()
        raise RuntimeError(f"PDF extraction failed: {exc}") from exc

    if not full_text.strip():
        doc.status = "error"
        db.commit()
        raise RuntimeError("No text extracted from PDF")

    # Clear prior chunks for re-processing
    db.query(DocumentChunk).filter_by(document_id=doc_id).delete()

    # --- Step 2: Page-aware chunking ---
    page_chunks = _chunk_page_texts(pages_text)
    logger.info("Split into %d page-aware chunks", len(page_chunks))

    # --- Step 3: Embed with Voyage AI (billable usage) ---
    chunk_rows: list[DocumentChunk] = []
    embedding_status = "skipped"
    from app.config import settings

    voy_key = (settings.voyage_api_key or "").strip()
    texts = [content for _, content in page_chunks]

    if not voy_key:
        logger.error(
            "VOYAGE_API_KEY is empty — embeddings skipped. Pipeline still extracts with Claude.",
        )
        for page_num, content in page_chunks:
            chunk_rows.append(
                DocumentChunk(
                    document_id=doc_id,
                    page_num=page_num,
                    content=content,
                    embedding=None,
                )
            )
    else:
        try:
            from langchain_voyageai import VoyageAIEmbeddings

            embeddings_model = VoyageAIEmbeddings(
                voyage_api_key=voy_key,
                model="voyage-law-2",
            )
            vectors = embeddings_model.embed_documents(texts)

            if len(vectors) != len(page_chunks):
                raise RuntimeError(
                    f"Voyage returned {len(vectors)} vectors for {len(page_chunks)} chunks"
                )

            for (page_num, content), vector in zip(page_chunks, vectors):
                chunk_rows.append(
                    DocumentChunk(
                        document_id=doc_id,
                        page_num=page_num,
                        content=content,
                        embedding=vector,
                    )
                )
            embedding_status = "ok"
        except Exception as exc:
            embedding_status = "failed"
            logger.exception("Voyage embedding failed: %s", exc)
            for page_num, content in page_chunks:
                chunk_rows.append(
                    DocumentChunk(
                        document_id=doc_id,
                        page_num=page_num,
                        content=content,
                        embedding=None,
                    )
                )

    db.add_all(chunk_rows)
    db.flush()

    # --- Step 4: Claude extraction ---
    restrictions: list[ExtractedRestriction] = []
    try:
        from langchain_anthropic import ChatAnthropic
        from langchain_core.messages import HumanMessage

        llm = ChatAnthropic(
            api_key=settings.anthropic_api_key,
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
        )

        extraction_text = full_text[:80000]
        response = llm.invoke([
            HumanMessage(content=_EXTRACTION_PROMPT.format(text=extraction_text))
        ])
        raw = response.content.strip()

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        extracted = json.loads(raw)
        logger.info("Claude extracted %d restrictions", len(extracted))

        for item in extracted:
            clause = item.get("clause_text")
            source = find_source_chunk(clause, chunk_rows)
            restrictions.append(
                ExtractedRestriction(
                    id=f"r-{uuid.uuid4().hex[:12]}",
                    legal_document_id=doc_id,
                    lp_id=doc.lp_id,
                    category=item.get("category", "other"),
                    summary=item.get("summary", ""),
                    clause_text=clause,
                    section_ref=item.get("section_ref"),
                    source_chunk_id=source.id if source else None,
                    page_num=source.page_num if source else None,
                    instrument_kind=item.get("instrument_kind", "side_letter"),
                    severity=item.get("severity", "soft"),
                    review_status="draft",
                    precedence_rank=10 if item.get("severity") == "hard" else 50,
                )
            )

    except Exception as exc:
        logger.warning("Claude extraction failed: %s", exc)

    db.add_all(restrictions)

    # --- Step 5: Mark document done ---
    doc.status = "needs_review"
    doc.processed_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "chunks": len(chunk_rows),
        "restrictions": len(restrictions),
        "embedding_status": embedding_status,
    }
