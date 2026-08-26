from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injection for database session."""
    async for session in get_db_session():
        yield session
