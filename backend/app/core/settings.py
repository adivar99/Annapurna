import os
from typing import Any, Dict, Optional
from pydantic import MongoDsn, validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Annapurna")
    PROJECT_VERSION: str = os.getenv("PROJECT_VERSION", "0.0.1")

    DATABASE_USER: str = os.getenv("DATABASE_USER", "admin")
    DATABASE_PASSWORD: str = os.getenv("DATABASE_PASSWORD", "admin123")
    DATABASE_HOST: str = os.getenv("DATABASE_HOST", "db")
    DATABASE_PORT: int = os.getenv("DATABASE_PORT", 27017)
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "annapurna")
    DATABASE_URL: Optional[MongoDsn] = f"mongodb://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}:{DATABASE_PORT}"

    @validator("DATABASE_URL", pre=True, always=True)
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v
        return MongoDsn.build(
            scheme="mongodb",
            host=values.get("DATABASE_HOST"),
            port=values.get("DATABASE_PORT"),
            path=f"/{values.get('DATABASE_NAME') or ''}",
        )

settings = Settings()