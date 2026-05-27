"""Match extracted clause text to document chunks for PDF citation provenance."""

from __future__ import annotations

import re

from app.models.document import DocumentChunk


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def find_source_chunk(
    clause_text: str | None,
    chunk_rows: list[DocumentChunk],
) -> DocumentChunk | None:
    if not clause_text or not chunk_rows:
        return None
    needle = _normalize(clause_text)
    if len(needle) < 12:
        return None

    # Exact substring match (best case)
    for row in chunk_rows:
        if needle in _normalize(row.content):
            return row

    # Prefix match (LLM may truncate)
    prefix = needle[:80]
    for row in chunk_rows:
        if prefix in _normalize(row.content):
            return row

    # Word overlap score
    words = {w for w in re.findall(r"[a-z0-9]+", needle) if len(w) > 3}
    if not words:
        return None
    best: DocumentChunk | None = None
    best_score = 0
    for row in chunk_rows:
        hay_words = set(re.findall(r"[a-z0-9]+", _normalize(row.content)))
        score = len(words & hay_words)
        if score > best_score:
            best_score = score
            best = row
    if best_score >= max(3, len(words) // 3):
        return best
    return None
