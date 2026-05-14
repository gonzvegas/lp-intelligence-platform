from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.document import LegalDocument
from app.schemas.document import DocumentOut

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=list[DocumentOut])
async def list_documents(
    lp_id: str | None = None,
    fund_id: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[LegalDocument]:
    q = select(LegalDocument)
    if lp_id:
        q = q.where(LegalDocument.lp_id == lp_id)
    if fund_id:
        q = q.where(LegalDocument.fund_id == fund_id)
    result = await db.execute(q)
    return list(result.scalars().all())


@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)) -> LegalDocument:
    result = await db.execute(
        select(LegalDocument).where(LegalDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc
