import os
from pathlib import Path

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./lg_lifecycle.db")
SECRET_KEY: str   = os.getenv("SECRET_KEY", "dev-secret-change-in-prod")
APP_ENV: str      = os.getenv("APP_ENV", "development")
CORS_ORIGINS: list[str] = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:8501",
).split(",")
