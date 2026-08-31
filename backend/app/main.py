from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.database import engine, Base

from app.api.routes_dashboard import router as dashboard_router
from app.api.routes_tms import router as tms_router
from app.api.routes_smms import router as smms_router
from app.api.routes_tdms import router as tdms_router
from app.api.routes_prioritizer import router as prioritizer_router
from app.api.routes_optimizer import router as optimizer_router
from app.api.routes_analytics import router as analytics_router
from app.api.routes_upload import router as upload_router
from app.api.routes_conflicts import router as conflicts_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Railway Maintenance Block Optimizer for Indian Railways (Pune Division)",
    version="1.0.0",
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(tms_router, prefix=settings.API_V1_STR)
app.include_router(smms_router, prefix=settings.API_V1_STR)
app.include_router(tdms_router, prefix=settings.API_V1_STR)
app.include_router(prioritizer_router, prefix=settings.API_V1_STR)
app.include_router(conflicts_router, prefix=settings.API_V1_STR)
app.include_router(optimizer_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(upload_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "message": "AI-Powered Railway Maintenance Block Optimizer API is active",
        "system": "Indian Railways - Pune Division Maintenance Suite",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "railway-block-optimizer"}