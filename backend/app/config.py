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


settings = Settings()
