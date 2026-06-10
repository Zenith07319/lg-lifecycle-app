"""VOC 위험도 산출 파이프라인 — crawled_voc.csv(근거) → social_voc_pattern.csv(점수).

기존 수기 가안값을 '실제 근거 기반'으로 대체한다.
- 빈도(freq): 한국소비자원 피해구제 품질·AS 통계(냉방불량/작동오류/소음/악취 건수). 전기료는 결함 통계 미포함 → 커뮤니티 상위 VOC로 정성추정.
- 심각도(severity): 증상 발생 시 기능 영향도(문서화된 가정 0~1).
- voc_risk_score = clamp(0.50 + 0.42 × (0.5·freq_norm + 0.5·severity), 0.50, 0.92)
  · freq_norm = sqrt(freq_weight / max_freq)  (희소하지만 심각한 항목 과소평가 방지)

실행: backend 디렉터리에서  python scripts/build_voc_pattern.py
"""
import math
from pathlib import Path
import pandas as pd

DATA = Path(__file__).resolve().parents[1] / "data"
CRAWLED = DATA / "crawled_voc.csv"
PATTERN = DATA / "social_voc_pattern.csv"

W_FREQ, W_SEV = 0.5, 0.5
BASE, SPAN = 0.50, 0.42
LO, HI = 0.50, 0.92


def compute_scores(df: pd.DataFrame) -> dict:
    max_freq = df["freq_weight"].max()
    out = {}
    for _, r in df.iterrows():
        freq_norm = math.sqrt(r["freq_weight"] / max_freq) if max_freq > 0 else 0.0
        raw = BASE + SPAN * (W_FREQ * freq_norm + W_SEV * float(r["severity"]))
        score = round(min(max(raw, LO), HI), 2)
        out[r["symptom_type"]] = {
            "voc_risk_score": score,
            "sentiment_score": round(float(r["sentiment_score"]), 2),
            "basis": str(r["basis"]),
            "source_url": str(r["source_url"]),
        }
    return out


def main():
    crawled = pd.read_csv(CRAWLED)
    scores = compute_scores(crawled)

    pat = pd.read_csv(PATTERN)
    if "basis" not in pat.columns:
        pat["basis"] = ""
    if "source_url" not in pat.columns:
        pat["source_url"] = ""

    updated = 0
    for i, row in pat.iterrows():
        st = row["symptom_type"]
        if st in scores:
            s = scores[st]
            pat.at[i, "voc_risk_score"] = s["voc_risk_score"]
            pat.at[i, "sentiment_score"] = s["sentiment_score"]
            pat.at[i, "basis"] = s["basis"]
            pat.at[i, "source_url"] = s["source_url"]
            updated += 1
        elif not str(pat.at[i, "basis"]).strip():
            pat.at[i, "basis"] = "정성추정(근거 미수집 — 현재 점검필요도 계산 미사용 토픽)"

    pat.to_csv(PATTERN, index=False, encoding="utf-8")
    print(f"갱신 완료: {updated}개 symptom_type 근거기반 점수 반영 → {PATTERN.name}")
    for st, s in scores.items():
        print(f"  - {st:22s} voc_risk_score = {s['voc_risk_score']}  ({s['basis'][:38]}…)")


if __name__ == "__main__":
    main()
