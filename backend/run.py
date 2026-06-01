"""백엔드 서버 직접 실행 스크립트."""
import sys
import os
from pathlib import Path

# 현재 디렉터리를 sys.path에 추가 (app/ 모듈 인식)
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
