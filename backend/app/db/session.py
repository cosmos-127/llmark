import asyncio
import os
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.db.models import Base
from app.observability.logging import logger


def _ensure_sqlite_dir() -> None:
    """Ensure parent directory for file-based SQLite database exists."""
    if "sqlite" in settings.DATABASE_URL:
        db_path = settings.DATABASE_URL.split(":///")[-1]
        if db_path and db_path != ":memory:":
            db_dir = os.path.dirname(os.path.abspath(db_path))
            if db_dir and not os.path.exists(db_dir):
                os.makedirs(db_dir, exist_ok=True)


_ensure_sqlite_dir()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

_db_initialized = False
_db_init_lock = asyncio.Lock()


async def init_db() -> None:
    """Initialize database tables asynchronously (idempotent)."""
    global _db_initialized
    _ensure_sqlite_dir()
    async with _db_init_lock:
        async with engine.begin() as conn:
            await conn.run_sync(
                lambda sync_conn: Base.metadata.create_all(sync_conn, checkfirst=True)
            )
        _db_initialized = True
        logger.debug("Database schema verified and tables initialized.")


async def ensure_db_initialized() -> None:
    """Ensure database tables exist prior to executing database operations."""
    global _db_initialized
    if not _db_initialized:
        await init_db()


def reset_db_initialized() -> None:
    """Reset initialization state (useful for test isolation)."""
    global _db_initialized
    _db_initialized = False


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for yielding an async database session with automatic initialization check."""
    await ensure_db_initialized()
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
