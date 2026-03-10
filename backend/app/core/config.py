from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # App
    APP_NAME: str = "ReportBattle API"
    DEBUG: bool = False

    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str  # service_role key (backend 전용)
    SUPABASE_JWT_SECRET: str

    # Encryption
    ENCRYPTION_KEY: str

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"


settings = Settings()
