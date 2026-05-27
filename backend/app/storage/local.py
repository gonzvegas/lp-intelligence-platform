from __future__ import annotations

import io
import os

from app.storage.base import DocumentStorage


class LocalDocumentStorage(DocumentStorage):
    """Filesystem-backed storage for local dev / Docker volume."""

    def __init__(self, base_path: str) -> None:
        self._base = base_path.rstrip("/")

    @property
    def backend_name(self) -> str:
        return "local"

    def _full_path(self, key: str) -> str:
        safe = key.lstrip("/").replace("..", "")
        return os.path.join(self._base, safe)

    def put(self, key: str, data: bytes, content_type: str = "application/pdf") -> None:
        path = self._full_path(key)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(data)

    def read_bytes(self, key: str) -> bytes:
        with open(self._full_path(key), "rb") as f:
            return f.read()

    def open_stream(self, key: str) -> io.BytesIO:
        return io.BytesIO(self.read_bytes(key))

    def delete(self, key: str) -> None:
        path = self._full_path(key)
        if os.path.isfile(path):
            os.remove(path)

    def presigned_get_url(self, key: str, ttl_seconds: int = 900) -> str | None:
        return None
