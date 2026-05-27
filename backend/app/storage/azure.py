from __future__ import annotations

import io
from datetime import datetime, timedelta, timezone

from app.storage.base import DocumentStorage


class AzureBlobDocumentStorage(DocumentStorage):
    """Azure Blob Storage — for fund production deployments."""

    def __init__(
        self,
        account_name: str,
        container_name: str,
        *,
        connection_string: str | None = None,
    ) -> None:
        from azure.storage.blob import BlobServiceClient

        self._container = container_name
        account_url = f"https://{account_name}.blob.core.windows.net"
        if connection_string and connection_string.strip():
            self._client = BlobServiceClient.from_connection_string(connection_string.strip())
        else:
            from azure.identity import DefaultAzureCredential

            self._client = BlobServiceClient(
                account_url=account_url,
                credential=DefaultAzureCredential(),
            )
        self._container_client = self._client.get_container_client(container_name)

    @property
    def backend_name(self) -> str:
        return "azure"

    def put(self, key: str, data: bytes, content_type: str = "application/pdf") -> None:
        blob = self._container_client.get_blob_client(key)
        blob.upload_blob(data, overwrite=True, content_type=content_type)

    def read_bytes(self, key: str) -> bytes:
        blob = self._container_client.get_blob_client(key)
        return blob.download_blob().readall()

    def open_stream(self, key: str) -> io.BytesIO:
        return io.BytesIO(self.read_bytes(key))

    def delete(self, key: str) -> None:
        blob = self._container_client.get_blob_client(key)
        blob.delete_blob(delete_snapshots="include")

    def presigned_get_url(self, key: str, ttl_seconds: int = 900) -> str | None:
        from azure.storage.blob import BlobSasPermissions, generate_blob_sas

        blob = self._container_client.get_blob_client(key)
        account_name = self._client.account_name
        if not account_name:
            return None
        cred = self._client.credential
        account_key = getattr(cred, "account_key", None)
        if not account_key:
            return None
        sas = generate_blob_sas(
            account_name=account_name,
            container_name=self._container,
            blob_name=key,
            account_key=account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds),
        )
        return f"{blob.url}?{sas}"
