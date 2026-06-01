from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager
from app.config import DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
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
    """세션 테이블 자동 생성."""
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
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS diagnosis_log (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
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
        conn.commit()
