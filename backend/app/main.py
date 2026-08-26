import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import benchmark, diff, export, history
from app.core.config import settings
from app.db.session import init_db
from app.observability.logging import logger, setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: configure logging and initialize database
    setup_logging(debug=settings.DEBUG)
    logger.info("Initializing LLMark backend services...", version=settings.VERSION)
    await init_db()
    logger.info("Database initialized successfully.")
    yield
    # Shutdown
    logger.info("Shutting down LLMark backend.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(benchmark.router, prefix=settings.API_V1_STR)
app.include_router(history.router, prefix=settings.API_V1_STR)
app.include_router(diff.router, prefix=settings.API_V1_STR)
app.include_router(export.router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["health"])
async def health_check() -> dict:
    """Root health check endpoint."""
    return {
        "status": "healthy",
        "service": "LLMark Backend",
        "version": settings.VERSION,
    }


# Mount built frontend static files if present (for single-container production)
frontend_dist_paths = [
    os.path.join(os.getcwd(), "frontend", "dist"),
    os.path.join(os.getcwd(), "..", "frontend", "dist"),
    "/app/frontend/dist",
]

for dist_path in frontend_dist_paths:
    if os.path.exists(dist_path) and os.path.isdir(dist_path):
        app.mount("/", StaticFiles(directory=dist_path, html=True), name="frontend")
        break
