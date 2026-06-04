import os
from pathlib import Path
from dotenv import load_dotenv

# app/backend/.env 로드 (DB 비밀번호 등 — git 제외). 없으면 환경변수/기본값 사용.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./lg_lifecycle.db")
SECRET_KEY: str   = os.getenv("SECRET_KEY", "dev-secret-change-in-prod")
APP_ENV: str      = os.getenv("APP_ENV", "development")
CORS_ORIGINS: list[str] = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:8501",
).split(",")
