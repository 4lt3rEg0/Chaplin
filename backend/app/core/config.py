from pydantic_settings import BaseSettings
from typing import List
from pathlib import Path
from dotenv import load_dotenv
import os
import secrets


BACKEND_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_ROOT.parent
load_dotenv(BACKEND_ROOT / ".env")

CHAPLIN_ENV = os.getenv("CHAPLIN_ENV", "development").strip().lower()


def _resolve_secret_key() -> str:
    """Resolve one stable JWT secret without ever hardcoding it in source."""
    key = os.getenv("CHAPLIN_SECRET_KEY") or os.getenv("SECRET_KEY")
    if key:
        return key

    if CHAPLIN_ENV in ("beta", "production", "prod"):
        raise RuntimeError(
            "CHAPLIN_ENV requires CHAPLIN_SECRET_KEY (or SECRET_KEY) to be set."
        )

    secret_file = PROJECT_ROOT / ".chaplin_dev_secret"
    if secret_file.is_file():
        existing = secret_file.read_text(encoding="utf-8").strip()
        if existing:
            return existing

    key = secrets.token_hex(32)
    try:
        secret_file.write_text(key, encoding="utf-8")
    except OSError:
        pass
    return key


class Settings(BaseSettings):
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Chaplin"

    # Database
    DATABASE_URL: str = "sqlite:///./chaplin.db"

    # Security
    SECRET_KEY: str = _resolve_secret_key()
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    # File Upload
    MAX_FILE_SIZE: int = 100 * 1024 * 1024
    MEDIA_FOLDER: str = "media"
    ALLOWED_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".gif", ".mp4", ".mp3", ".wav"]

    # Radio
    RADIO_SERVER_URL: str = "ws://localhost:8001"
    GLOBAL_RADIO_CHANNEL: str = "global"

    # Invitations
    INVITATION_ONLY: bool = True
    INVITATION_CODES: List[str] = ["CHA2024", "Y2KFM", "SPIRAL01", "CHA2024INV"]

    # Default Tags
    DEFAULT_TAGS: List[str] = [
        "Musica", "Arte", "Gaming", "Pelis", "Series",
        "Deporte", "Anime", "Moda", "Reflexiones"
    ]
    class Config:
        env_file = str(BACKEND_ROOT / ".env")
settings = Settings()