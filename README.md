# LG LifeCycle Decision Check — 풀스택 앱

React (Next.js 14) + FastAPI + SQLite

---

## 로컬 실행 방법

### 1. 백엔드 (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API 문서: http://localhost:8000/docs
- 헬스체크: http://localhost:8000/api/health

### 2. 프론트엔드 (Next.js)

```bash
cd frontend
npm install
npm run dev
```

- 앱: http://localhost:3000

### 3. Docker Compose (한 번에 실행)

```bash
docker-compose up --build
```

- 프론트: http://localhost:3000
- 백엔드: http://localhost:8000

---

## 프로젝트 구조

```
app/
  backend/
    app/
      main.py          # FastAPI 진입점
      config.py        # 환경변수
      routers/         # API 엔드포인트
      services/        # 계산 엔진 + 세션
      db/              # SQLite 연결
    src/               # 계산 모듈 (v2)
    data/              # CSV 참조 데이터
  frontend/
    app/
      page.tsx         # 홈
      diagnose/        # 입력 폼
      result/[id]/     # 진단 결과 + 선택지 + 리포트
    lib/               # API 클라이언트 + 타입
  docker-compose.yml
```

---

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/diagnose | 진단 실행 → session_id 반환 |
| GET | /api/session/{id} | 진단 결과 조회 |
| GET | /api/health | 서버 상태 |

---

## Railway 배포

1. GitHub에 코드 push
2. railway.app → New Project → Deploy from GitHub
3. backend 서비스: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. frontend 서비스: `cd frontend && npm run build && npm start`
5. 환경변수 설정:
   - backend: `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`
   - frontend: `NEXT_PUBLIC_API_URL` (백엔드 Railway URL)
