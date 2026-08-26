from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.db.models import Base

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


async def init_db() -> None:
    """Initialize database tables asynchronously on app startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for yielding an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
