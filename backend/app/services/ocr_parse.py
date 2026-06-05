"""에너지효율 라벨 OCR 텍스트 → 구조화 필드 추출.

OCR(예: Google Vision)이 반환한 전체 텍스트에서 우리 진단 입력값을 정규식으로 파싱한다.
- 월간소비전력량(kWh)  → ac_monthly_kwh_input (K_AC 베이스, 가장 중요)
- 정격냉방능력(W)      → capacity_kw (W/1000)
- 에너지소비효율등급(1~5) → 표시용
※ 실제 라벨 표기 변형(띄어쓰기/콤마/줄바꿈)에 맞춰 샘플로 튜닝 필요.
"""
import re


def _num(s: str):
    try:
        return float(s.replace(",", "").strip())
    except (ValueError, AttributeError):
        return None


def parse_energy_label(text: str) -> dict:
    # 줄바꿈/다중공백을 단일 공백으로 정규화 (라벨이 세로로 쪼개져 읽히는 경우 대비)
    t = re.sub(r"\s+", " ", text or "")

    # 월간소비전력량(kWh) — "월간소비전력량 ... 110" / "... 110 kWh"
    monthly_kwh = None
    m = re.search(r"월\s*간\s*소\s*비\s*전\s*력\s*량[^\d]{0,15}([\d,]+(?:\.\d+)?)", t)
    if not m:
        m = re.search(r"([\d,]+(?:\.\d+)?)\s*k\s*W\s*h", t, re.I)  # 'NN kWh' 패턴 폴백
    if m:
        v = _num(m.group(1))
        if v and 10 <= v <= 600:           # 에어컨 월간 소비전력량 상식 범위
            monthly_kwh = int(round(v))

    # 정격냉방능력(W) → kW
    capacity_kw = None
    m = re.search(r"(?:정격)?\s*냉\s*방\s*능\s*력[^\d]{0,15}([\d,]+)\s*W", t)
    if m:
        w = _num(m.group(1))
        if w and 1000 <= w <= 20000:
            capacity_kw = round(w / 1000, 1)

    # 에너지소비효율등급(1~5)
    grade = None
    m = re.search(r"에\s*너\s*지\s*소\s*비\s*효\s*율\s*등\s*급[^\d]{0,8}([1-5])", t)
    if m:
        grade = int(m.group(1))

    got = sum(x is not None for x in (monthly_kwh, capacity_kw))
    return {
        "monthly_kwh":      monthly_kwh,
        "capacity_kw":      capacity_kw,
        "efficiency_grade": grade,
        "confidence":       "high" if got == 2 else ("low" if got == 1 else "none"),
    }
