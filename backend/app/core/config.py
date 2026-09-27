import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "FloodLens API"
    API_V1_PREFIX: str = "/api/v1"

    # Supabase configuration
    SUPABASE_URL: str = Field(default="", env="SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="", env="SUPABASE_SERVICE_ROLE_KEY")

    # CORS configuration
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"

    # OSRM public routing API
    OSRM_BASE_URL: str = "https://router.project-osrm.org"

    # Spatial verification radius (meters)
    VERIFICATION_RADIUS_METERS: float = 500.0

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origin_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
