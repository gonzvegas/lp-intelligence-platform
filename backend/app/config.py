from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://lp:lp@localhost:5432/lp_intelligence"
    redis_url: str = "redis://localhost:6379/0"

    dealcloud_base_url: str = "http://localhost:8001"
    dealcloud_client_id: str = "mock-client-id"
    dealcloud_client_secret: str = "mock-secret"

    anthropic_api_key: str = ""
    voyage_api_key: str = ""

    secret_key: str = "dev-secret-change-in-production"
    docs_storage_path: str = "/data/docs"

    # Document blob storage: local (dev) | azure (fund production)
    storage_backend: str = "local"
    azure_storage_account_name: str = ""
    azure_storage_container: str = "lp-documents"
    azure_storage_connection_string: str = ""
    document_content_url_ttl_seconds: int = 900

    # When False, Bearer tokens are validated against Entra JWKS (see app.auth_middleware).
    skip_jwt_auth: bool = True
    jwt_tenant_id: str = ""
    jwt_audience: str = ""


settings = Settings()
