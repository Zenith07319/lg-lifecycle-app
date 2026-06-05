from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS
from app.db.connection import init_db
from app.routers.diagnose import router
from app.routers.products import router as products_router
from app.routers.centers import router as centers_router

app = FastAPI(
    title="LG LifeCycle Decision Check API",
    version="2.0.0",
    description="가전 유지·수리·구독·교체 의사결정 API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,                       # localhost + 환경변수 명시 도메인
    allow_origin_regex=r"https://.*\.vercel\.app",   # Vercel 프로덕션·프리뷰 도메인 일괄 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(products_router)
app.include_router(centers_router)


@app.on_event("startup")
async def startup():
    init_db()


@app.get("/")
async def root():
    return {"message": "LG LifeCycle API is running", "docs": "/docs"}
