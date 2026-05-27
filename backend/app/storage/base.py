from __future__ import annotations

from abc import ABC, abstractmethod
from typing import BinaryIO


class DocumentStorage(ABC):
    """Abstract blob store for governing PDFs (local dev, Azure Blob, S3, etc.)."""

    @property
    @abstractmethod
    def backend_name(self) -> str:
        raise NotImplementedError

    @abstractmethod
    def put(self, key: str, data: bytes, content_type: str = "application/pdf") -> None:
        raise NotImplementedError

    @abstractmethod
    def read_bytes(self, key: str) -> bytes:
        raise NotImplementedError

    @abstractmethod
    def open_stream(self, key: str) -> BinaryIO:
        raise NotImplementedError

    @abstractmethod
    def delete(self, key: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def presigned_get_url(self, key: str, ttl_seconds: int = 900) -> str | None:
        """Return a short-lived URL for browser download, or None if unsupported."""
        raise NotImplementedError
