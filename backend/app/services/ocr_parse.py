"""에너지효율 라벨 OCR 텍스트 → 구조화 필드 추출.

OCR(예: Google Vision)이 반환한 전체 텍스트에서 우리 진단 입력값을 정규식으로 파싱한다.
- 냉방 월간소비전력량(kWh) → ac_monthly_kwh_input (K_AC 베이스, 가장 중요)
- 정격냉방능력(W)         → capacity_kw (W/1000)
- 에너지소비효율등급(1~5)  → 표시용(불확실, 미사용 가능)

실 라벨 OCR 특성 반영:
- 'W'가 소문자 'w'로 인식됨(2,257w) → 대소문자 무관
- 2in1(냉난방)은 냉방기간 값을 우선 채택
- '정격/원격/정제 냉방능력' 등 OCR 변형 → '냉방능력' 부분일치로 흡수
"""
import re


def _num(s: str):
    try:
        return float(s.replace(",", "").strip())
    except (ValueError, AttributeError):
        return None


def parse_energy_label(text: str) -> dict:
    t = re.sub(r"\s+", " ", text or "")

    # ── 월간소비전력량(kWh) — 냉방 우선 ──
    monthly_kwh = None
    for pat in (
        r"냉\s*방[^\d]{0,12}월[^\d]{0,6}소\s*비\s*전\s*력\s*량[^\d]{0,12}([\d,]+(?:\.\d+)?)",  # 냉방기간 월소비전력량 NNN
        r"월\s*간?\s*소\s*비\s*전\s*력\s*량[^\d]{0,15}([\d,]+(?:\.\d+)?)",                    # 월간소비전력량 NNN
        r"([\d,]+(?:\.\d+)?)\s*k\s*[Ww]\s*h",                                                 # NNN kWh (폴백)
    ):
        m = re.search(pat, t)
        if m:
            v = _num(m.group(1))
            if v and 10 <= v <= 700:
                monthly_kwh = int(round(v))
                break

    # ── 정격냉방능력(W → kW), 대소문자 무관 · 냉난방(2in1) 포함 ──
    capacity_kw = None
    m = re.search(r"냉\s*난?\s*방\s*능\s*력[^\d]{0,15}([\d,]+)\s*[Ww]", t)  # 냉방/냉난방능력 NNN W(w)
    if m:
        w = _num(m.group(1))
        if w and 1000 <= w <= 20000:
            capacity_kw = round(w / 1000, 1)

    # ── 에너지소비효율등급(1~5) — 불확실(1~5 눈금과 혼동), 표시용 ──
    grade = None
    m = re.search(r"에\s*너\s*지\s*소\s*비\s*효\s*율\s*등\s*급[^\d]{0,4}([1-5])\b", t)
    if m:
        grade = int(m.group(1))

    got = sum(x is not None for x in (monthly_kwh, capacity_kw))
    return {
        "monthly_kwh":      monthly_kwh,
        "capacity_kw":      capacity_kw,
        "efficiency_grade": grade,
        "confidence":       "high" if got == 2 else ("low" if got == 1 else "none"),
    }
