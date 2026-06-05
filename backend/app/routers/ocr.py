"""OCR — 에너지효율 라벨 사진에서 진단 입력값 추출.

키(GOOGLE_VISION_API_KEY) 있으면 Google Cloud Vision으로 실제 인식 + 파싱,
없으면 mock 샘플 반환(흐름·UI 시연용). 키는 백엔드에만(.env) — 프론트 노출 없음.
"""
import base64
import json
import urllib.request
import urllib.error
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.config import GOOGLE_VISION_API_KEY
from app.services.ocr_parse import parse_energy_label

router = APIRouter(prefix="/api/ocr", tags=["ocr"])

VISION_URL = "https://vision.googleapis.com/v1/images:annotate"


@router.post("/energy-label")
async def energy_label(file: UploadFile = File(...)):
    img = await file.read()
    if not img:
        raise HTTPException(400, "이미지가 비어 있습니다.")
    if len(img) > 10_000_000:
        raise HTTPException(413, "이미지가 너무 큽니다(최대 10MB).")

    # mock 모드 (키 미설정)
    if not GOOGLE_VISION_API_KEY:
        return {
            "source": "mock", "monthly_kwh": 110, "capacity_kw": 3.6,
            "efficiency_grade": 1, "confidence": "high", "raw_text": "",
            "disclaimer": "OCR 미설정 — 샘플값(mock)입니다. 실제 키 연동 시 사진에서 인식합니다.",
        }

    # Google Vision 호출
    body = json.dumps({"requests": [{
        "image": {"content": base64.b64encode(img).decode()},
        "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
    }]}).encode()
    req = urllib.request.Request(
        f"{VISION_URL}?key={GOOGLE_VISION_API_KEY}", data=body,
        headers={"Content-Type": "application/json"})
    try:
        resp = json.loads(urllib.request.urlopen(req, timeout=25).read())
    except urllib.error.HTTPError as e:
        raise HTTPException(502, f"OCR 호출 실패 (HTTP {e.code})")
    except Exception:
        raise HTTPException(502, "OCR 호출 중 오류가 발생했습니다.")

    r0 = (resp.get("responses") or [{}])[0]
    if "error" in r0:
        raise HTTPException(502, "OCR 오류: " + r0["error"].get("message", ""))
    text = (r0.get("fullTextAnnotation") or {}).get("text", "")
    parsed = parse_energy_label(text)
    parsed.update({"source": "vision", "raw_text": text[:2000]})
    return parsed
