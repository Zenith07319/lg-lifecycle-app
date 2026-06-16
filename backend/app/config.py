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

# OCR (Google Cloud Vision). 미설정 시 OCR 엔드포인트는 mock 응답.
GOOGLE_VISION_API_KEY: str = os.getenv("GOOGLE_VISION_API_KEY", "")

# LG ThinQ Open API (에어컨 자동 불러오기). 미설정 시 ThinQ 엔드포인트는 mock 기기 응답.
THINQ_PAT: str        = os.getenv("THINQ_PAT", "")
THINQ_CLIENT_ID: str  = os.getenv("THINQ_CLIENT_ID", "")
THINQ_COUNTRY: str    = os.getenv("THINQ_COUNTRY", "KR")

# Web Push (VAPID) — 여름 전 점검 알림. 미설정 시 푸시 엔드포인트 비활성.
VAPID_PRIVATE_KEY: str = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY: str  = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_SUBJECT: str     = os.getenv("VAPID_SUBJECT", "mailto:jswjsw2240@gmail.com")
