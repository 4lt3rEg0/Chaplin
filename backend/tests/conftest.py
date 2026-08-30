"""Shared pytest fixtures for the Chaplin backend test suite.

CRITICAL: these tests must NEVER touch the real chaplin.db / media folder.
Every test gets its own throwaway SQLite file (via pytest's `tmp_path`), and the
app's real `@app.on_event("startup")` handlers (which run migrations against the
real, module-level `engine`) are removed before the TestClient is ever created —
FastAPI's dependency_overrides only affects `Depends(get_db)` injection, it does
NOT stop code that references the global `engine`/`SessionLocal` directly, so the
startup handlers have to be neutralized explicitly rather than relied upon.
"""
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app import main as chaplin_main

# Belt-and-braces: never let real startup/shutdown handlers run during tests.
chaplin_main.app.router.on_startup.clear()
chaplin_main.app.router.on_shutdown.clear()

TEST_PASSWORD = "TestPass123!"
DEFAULT_INVITATION_CODE = "CHA2024"


@pytest.fixture()
def test_engine(tmp_path):
    db_path = tmp_path / "test_chaplin.db"
    engine = create_engine(
        f"sqlite:///{db_path.as_posix()}",
        connect_args={"check_same_thread": False}
    )
    chaplin_main.Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture()
def client(test_engine, tmp_path, monkeypatch):
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    def override_get_db():
        db = TestSessionLocal()
        try:
            yield db
        finally:
            db.close()

    chaplin_main.app.dependency_overrides[chaplin_main.get_db] = override_get_db

    # `MEDIA_FOLDER` is a plain module-level constant the upload endpoint reads
    # directly (not a FastAPI dependency), so dependency_overrides can't touch
    # it — it has to be monkeypatched directly or file-upload tests would write
    # real files into the actual Chaplin/media/ folder.
    test_media_folder = tmp_path / "test_media"
    test_media_folder.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(chaplin_main, "MEDIA_FOLDER", test_media_folder)

    try:
        yield TestClient(chaplin_main.app)
    finally:
        chaplin_main.app.dependency_overrides.clear()


def register_user(client, username, email=None, password=TEST_PASSWORD, invitation_code=DEFAULT_INVITATION_CODE):
    payload = {
        "email": email or f"{username}@example.com",
        "username": username,
        "first_name": "Test",
        "last_name": "User",
        "birth_date": "2000-01-01T00:00:00",
        "password": password,
        "social_goal": "testing",
        "invitation_code": invitation_code
    }
    return client.post("/api/v1/auth/register", json=payload)


def login_user(client, username, password=TEST_PASSWORD):
    return client.post(
        "/api/v1/auth/login",
        data={"username": username, "password": password}
    )


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def register_and_login(client, username, **kwargs):
    reg = register_user(client, username, **kwargs)
    assert reg.status_code == 200, reg.text
    login = login_user(client, username, kwargs.get("password", TEST_PASSWORD))
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    return reg.json(), auth_headers(token)
