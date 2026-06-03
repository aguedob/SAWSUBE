from __future__ import annotations
from typing import AsyncIterator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from .config import settings


class Base(DeclarativeBase):
    pass


DATABASE_URL = f"sqlite+aiosqlite:///{settings.DB_PATH}"
engine = create_async_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


# Enable SQLite FK constraints on every new connection.
from sqlalchemy import event  # noqa: E402

@event.listens_for(engine.sync_engine, "connect")
def _enable_sqlite_fk(dbapi_conn, _record):  # pragma: no cover - hook
    try:
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()
    except Exception:
        pass


async def init_db() -> None:
    # Import models so metadata registers
    from .models import tv, image, schedule, history, folder, tizenbrew, debloat  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _migrate_sqlite_schema(conn)
        await conn.execute(text("PRAGMA foreign_keys=ON"))


async def _migrate_sqlite_schema(conn) -> None:
    """Best-effort additive migrations for existing SQLite installs."""
    await _ensure_column(conn, "tvs", "token_path", "TEXT")
    await _ensure_column(conn, "images", "source_meta", "JSON")
    await _ensure_column(conn, "images", "tags", "VARCHAR(512)")
    await _ensure_column(conn, "images", "processed_path", "VARCHAR(1024)")
    await _ensure_column(conn, "images", "thumbnail_path", "VARCHAR(1024)")
    await _ensure_column(conn, "tv_images", "matte", "VARCHAR(64) DEFAULT 'none'")


async def _ensure_column(conn, table: str, column: str, ddl: str) -> None:
    result = await conn.execute(text(f"PRAGMA table_info({table})"))
    columns = {row[1] for row in result.fetchall()}
    if column in columns:
        return
    await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as s:
        try:
            await s.execute(text("PRAGMA foreign_keys=ON"))
        except Exception:
            pass
        yield s
