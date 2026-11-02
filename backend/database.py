import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("argus.database")

# Check for environment variable first (for Render/Docker), fallback to local Postgres
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://argus:argus_secure_password@localhost:5433/argus_db"
)

IS_SQLITE = False

def create_db_engine():
    global IS_SQLITE
    # If SQLite explicitly requested
    if DATABASE_URL.startswith("sqlite"):
        IS_SQLITE = True
        return create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    
    # Try PostgreSQL first
    try:
        engine = create_engine(
            DATABASE_URL,
            echo=False,
            connect_args={"connect_timeout": 2}
        )
        with engine.connect() as conn:
            pass
        return engine
    except Exception as e:
        logger.warning(
            "PostgreSQL not available at %s (%s). Falling back to local SQLite database (argus.db).",
            DATABASE_URL,
            e,
        )
        IS_SQLITE = True
        sqlite_url = "sqlite:///backend/argus.db"
        return create_engine(sqlite_url, connect_args={"check_same_thread": False})

engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
