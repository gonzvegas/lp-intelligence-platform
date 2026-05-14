"""
Document pipeline: PDF → text → chunks → Voyage embeddings → Claude extraction.

Steps:
  1. Extract text from PDF with pypdf
  2. Chunk with LangChain RecursiveCharacterTextSplitter (512 tokens / 50 overlap)
  3. Embed each chunk with Voyage AI voyage-law-2 (1024 dimensions)
  4. Run Claude claude-3-5-sonnet to extract structured restrictions
  5. Write document_chunks + extracted_restrictions rows; mark document needs_review
"""

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
- "severity": "hard" (absolute prohibition) or "soft" (requires consent / notification)
- "instrument_kind": "side_letter", "lpa", or "other"

Return ONLY a JSON array of restriction objects. If no restrictions are found, return [].

Document text:
{text}"""


def run_document_pipeline(doc_id: str, db: Session) -> dict:
    from pypdf import PdfReader
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    from app.models.document import DocumentChunk, LegalDocument
    from app.models.restriction import ExtractedRestriction

    doc = db.query(LegalDocument).filter_by(id=doc_id).first()
    if not doc:
        raise ValueError(f"Document {doc_id} not found")

    if not doc.storage_path:
        raise ValueError(f"Document {doc_id} has no storage path")

    # --- Step 1: Extract text ---
    logger.info("Extracting text from %s", doc.storage_path)
    try:
        reader = PdfReader(doc.storage_path)
        pages_text = []
        for page in reader.pages:
            pages_text.append(page.extract_text() or "")
        full_text = "\n".join(pages_text)
    except Exception as exc:
        doc.status = "error"
        db.commit()
        raise RuntimeError(f"PDF extraction failed: {exc}") from exc

    if not full_text.strip():
        doc.status = "error"
        db.commit()
        raise RuntimeError("No text extracted from PDF")

    # --- Step 2: Chunk ---
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1800,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " "],
    )
    chunks = splitter.create_documents([full_text])
    logger.info("Split into %d chunks", len(chunks))

    # --- Step 3: Embed with Voyage AI ---
    chunk_rows: list[DocumentChunk] = []
    try:
        from langchain_voyageai import VoyageAIEmbeddings
        from app.config import settings

        embeddings_model = VoyageAIEmbeddings(
            voyage_api_key=settings.voyage_api_key,
            model="voyage-law-2",
        )
        texts = [c.page_content for c in chunks]
        vectors = embeddings_model.embed_documents(texts)

        for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
            chunk_rows.append(DocumentChunk(
                document_id=doc_id,
                page_num=i,
                content=chunk.page_content,
                embedding=vector,
            ))
    except Exception as exc:
        logger.warning("Embedding failed (%s) — storing chunks without vectors", exc)
        for i, chunk in enumerate(chunks):
            chunk_rows.append(DocumentChunk(
                document_id=doc_id,
                page_num=i,
                content=chunk.page_content,
                embedding=None,
            ))

    db.add_all(chunk_rows)
    db.flush()

    # --- Step 4: Claude extraction ---
    restrictions: list[ExtractedRestriction] = []
    try:
        from langchain_anthropic import ChatAnthropic
        from langchain_core.messages import HumanMessage
        from app.config import settings

        llm = ChatAnthropic(
            api_key=settings.anthropic_api_key,
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
        )

        # Send full text (Claude's 200k context handles most side letters in one shot)
        extraction_text = full_text[:80000]  # safety cap
        response = llm.invoke([
            HumanMessage(content=_EXTRACTION_PROMPT.format(text=extraction_text))
        ])
        raw = response.content.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        extracted = json.loads(raw)
        logger.info("Claude extracted %d restrictions", len(extracted))

        for item in extracted:
            restrictions.append(ExtractedRestriction(
                id=f"r-{uuid.uuid4().hex[:12]}",
                legal_document_id=doc_id,
                lp_id=doc.lp_id,
                category=item.get("category", "other"),
                summary=item.get("summary", ""),
                clause_text=item.get("clause_text"),
                instrument_kind=item.get("instrument_kind", "side_letter"),
                severity=item.get("severity", "soft"),
                review_status="draft",
                precedence_rank=10 if item.get("severity") == "hard" else 50,
            ))

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
    }
