from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS
from app.db.connection import init_db
from app.routers.diagnose import router

app = FastAPI(
    title="LG LifeCycle Decision Check API",
    version="2.0.0",
    description="가전 유지·수리·구독·교체 의사결정 API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
async def startup():
    init_db()


@app.get("/")
async def root():
    return {"message": "LG LifeCycle API is running", "docs": "/docs"}
