import json
from datetime import datetime, timedelta
from sqlalchemy import text
from app.db.connection import get_db, IS_SQLITE

TTL_HOURS = 24

# SQLite는 INSERT OR REPLACE, PostgreSQL은 ON CONFLICT 로 upsert (DB별 구문 차이)
_UPSERT_SQLITE = """
    INSERT OR REPLACE INTO diagnosis_session
      (session_id, user_inputs, diagnosis, ranked_opts, carbon,
       report, delta_old, delta_new, expires_at)
    VALUES (:sid, :ui, :diag, :opts, :carbon, :report, :dold, :dnew, :exp)
"""
_UPSERT_PG = """
    INSERT INTO diagnosis_session
      (session_id, user_inputs, diagnosis, ranked_opts, carbon,
       report, delta_old, delta_new, expires_at)
    VALUES (:sid, :ui, :diag, :opts, :carbon, :report, :dold, :dnew, :exp)
    ON CONFLICT (session_id) DO UPDATE SET
      user_inputs = EXCLUDED.user_inputs,
      diagnosis   = EXCLUDED.diagnosis,
      ranked_opts = EXCLUDED.ranked_opts,
      carbon      = EXCLUDED.carbon,
      report      = EXCLUDED.report,
      delta_old   = EXCLUDED.delta_old,
      delta_new   = EXCLUDED.delta_new,
      expires_at  = EXCLUDED.expires_at
"""


def save_session(session_id: str, data: dict) -> None:
    expires = datetime.utcnow() + timedelta(hours=TTL_HOURS)
    sql = _UPSERT_SQLITE if IS_SQLITE else _UPSERT_PG
    with get_db() as db:
        db.execute(text(sql), {
            "sid":    session_id,
            "ui":     json.dumps(data.get("user_inputs", {}),    ensure_ascii=False),
            "diag":   json.dumps(data.get("diagnosis", {}),      ensure_ascii=False),
            "opts":   json.dumps(data.get("ranked_options", []),  ensure_ascii=False),
            "carbon": json.dumps(data.get("carbon_summary", {}), ensure_ascii=False),
            "report": json.dumps(data.get("report", {}),          ensure_ascii=False),
            "dold":   json.dumps(data.get("delta_old", {}),       ensure_ascii=False),
            "dnew":   json.dumps(data.get("delta_new", {}),       ensure_ascii=False),
            "exp":    expires.isoformat(),
        })
        db.commit()

def load_session(session_id: str) -> dict | None:
    with get_db() as db:
        row = db.execute(text("""
            SELECT user_inputs, diagnosis, ranked_opts, carbon, report, delta_old, delta_new
            FROM diagnosis_session
            WHERE session_id = :sid
              AND (expires_at IS NULL OR expires_at > :now)
        """), {"sid": session_id, "now": datetime.utcnow().isoformat()}).mappings().first()
    if not row:
        return None
    return {
        "user_inputs":    json.loads(row["user_inputs"]),
        "diagnosis":      json.loads(row["diagnosis"]) if row["diagnosis"] else {},
        "ranked_options": json.loads(row["ranked_opts"]) if row["ranked_opts"] else [],
        "carbon_summary": json.loads(row["carbon"]) if row["carbon"] else {},
        "report":         json.loads(row["report"]) if row["report"] else {},
        "delta_old":      json.loads(row["delta_old"]) if row["delta_old"] else {},
        "delta_new":      json.loads(row["delta_new"]) if row["delta_new"] else {},
    }

def log_diagnosis(diagnosis: dict, inputs: dict, recommendation: str) -> None:
    with get_db() as db:
        db.execute(text("""
            INSERT INTO diagnosis_log
              (product_type, purchase_year, capacity_kw, symptom_type,
               health_grade, health_score, recommendation, priority_mode)
            VALUES (:pt, :yr, :cap, :sym, :grade, :score, :rec, :pri)
        """), {
            "pt":    inputs.get("product_type"),
            "yr":    inputs.get("purchase_year"),
            "cap":   inputs.get("capacity_kw"),
            "sym":   inputs.get("symptom_type"),
            "grade": diagnosis.get("health_grade"),
            "score": diagnosis.get("health_score"),
            "rec":   recommendation,
            "pri":   inputs.get("customer_priority"),
        })
        db.commit()
