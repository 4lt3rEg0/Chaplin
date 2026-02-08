from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Chaplin"

    # Database
    DATABASE_URL: str = "sqlite:///./chaplin.db"

    # Security
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
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
        env_file = ".env"


settings = Settings()