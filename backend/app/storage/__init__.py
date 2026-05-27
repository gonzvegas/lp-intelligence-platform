from __future__ import annotations

from functools import lru_cache

from app.config import settings
from app.storage.base import DocumentStorage
from app.storage.local import LocalDocumentStorage


@lru_cache
def get_document_storage() -> DocumentStorage:
    backend = (settings.storage_backend or "local").strip().lower()
    if backend == "azure":
        from app.storage.azure import AzureBlobDocumentStorage

        if not settings.azure_storage_account_name or not settings.azure_storage_container:
            raise RuntimeError(
                "STORAGE_BACKEND=azure requires AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_CONTAINER"
            )
        return AzureBlobDocumentStorage(
            account_name=settings.azure_storage_account_name,
            container_name=settings.azure_storage_container,
            connection_string=settings.azure_storage_connection_string or None,
        )
    return LocalDocumentStorage(settings.docs_storage_path)


def resolve_document_bytes(doc) -> bytes:
    """Load PDF bytes for a LegalDocument row (storage_key preferred, legacy path fallback)."""
    if doc.storage_key:
        key = doc.storage_key
        # Legacy rows: migration copied absolute filesystem paths into storage_key
        if key.startswith("/"):
            with open(key, "rb") as f:
                return f.read()
        return get_document_storage().read_bytes(key)
    if doc.storage_path:
        with open(doc.storage_path, "rb") as f:
            return f.read()
    raise ValueError(f"Document {doc.id} has no storage_key or storage_path")
