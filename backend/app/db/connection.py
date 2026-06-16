from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager
from app.config import DATABASE_URL

# SQLite(로컬) / PostgreSQL(Supabase) 자동 구분
IS_SQLITE = DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if IS_SQLITE else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

@contextmanager
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """세션 테이블 자동 생성 (SQLite·PostgreSQL 모두 호환)."""
    # 자동증가 PK 구문이 DB마다 달라 분기
    log_pk = "INTEGER PRIMARY KEY AUTOINCREMENT" if IS_SQLITE else "BIGSERIAL PRIMARY KEY"
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS diagnosis_session (
                session_id   TEXT PRIMARY KEY,
                user_inputs  TEXT NOT NULL,
                diagnosis    TEXT,
                ranked_opts  TEXT,
                carbon       TEXT,
                report       TEXT,
                delta_old    TEXT,
                delta_new    TEXT,
                created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at   TIMESTAMP
            )
        """))
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS diagnosis_log (
                id               {log_pk},
                product_type     TEXT,
                purchase_year    INTEGER,
                capacity_kw      REAL,
                symptom_type     TEXT,
                health_grade     TEXT,
                health_score     REAL,
                recommendation   TEXT,
                priority_mode    TEXT,
                logged_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        # 웹 푸시 구독 저장(여름 전 점검 알림)
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS push_subscription (
                endpoint    TEXT PRIMARY KEY,
                p256dh      TEXT NOT NULL,
                auth        TEXT NOT NULL,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()
