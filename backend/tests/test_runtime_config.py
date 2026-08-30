"""Runtime/startup config behavior for SECRET_KEY (CHAPLIN BETA HARDENING V6,
Prioridad 2 — JWT stability). These test module-import-time behavior, which is
a subprocess boundary concern rather than something you can safely re-trigger
by reloading an already-imported app.main inside the shared test process.

main.py always loads backend/.env via a path derived from __file__ (not cwd),
so a real .env sitting there would leak into every subprocess below and mask
the "no secret configured" scenarios entirely — these tests temporarily move
the real backend/.env (and any leftover dev-secret file) out of the way and
always restore them, even on failure.
"""
import os
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
PYTHON = sys.executable
REAL_ENV_FILE = BACKEND_DIR / ".env"
DEV_SECRET_FILE = BACKEND_DIR.parent / ".chaplin_dev_secret"


@pytest.fixture()
def no_configured_secret():
    """Hides the real backend/.env and any persisted dev secret for the
    duration of one test, restoring both afterward no matter what happens."""
    env_backup = REAL_ENV_FILE.read_text() if REAL_ENV_FILE.is_file() else None
    dev_backup = DEV_SECRET_FILE.read_text() if DEV_SECRET_FILE.is_file() else None
    if REAL_ENV_FILE.is_file():
        REAL_ENV_FILE.unlink()
    if DEV_SECRET_FILE.is_file():
        DEV_SECRET_FILE.unlink()
    try:
        yield
    finally:
        if env_backup is not None:
            REAL_ENV_FILE.write_text(env_backup)
        if dev_backup is not None:
            DEV_SECRET_FILE.write_text(dev_backup)
        elif DEV_SECRET_FILE.is_file():
            DEV_SECRET_FILE.unlink()


def _run_import(env_overrides, cwd=BACKEND_DIR):
    base_env = dict(os.environ)
    base_env.pop("SECRET_KEY", None)
    base_env.pop("CHAPLIN_SECRET_KEY", None)
    env = {**base_env, **env_overrides}
    return subprocess.run(
        [PYTHON, "-c", "import app.main"],
        cwd=str(cwd),
        env=env,
        capture_output=True,
        text=True,
        timeout=30
    )


def test_beta_env_without_secret_fails_fast(tmp_path, no_configured_secret):
    result = _run_import({"CHAPLIN_ENV": "beta", "CHAPLIN_DB_PATH": str(tmp_path / "x.db")})
    assert result.returncode != 0
    assert "CHAPLIN_ENV" in result.stderr
    assert "RuntimeError" in result.stderr


def test_production_env_without_secret_fails_fast(tmp_path, no_configured_secret):
    result = _run_import({"CHAPLIN_ENV": "production", "CHAPLIN_DB_PATH": str(tmp_path / "x.db")})
    assert result.returncode != 0
    assert "RuntimeError" in result.stderr


def test_dev_env_without_secret_generates_and_persists(tmp_path, no_configured_secret):
    first = _run_import({"CHAPLIN_ENV": "development", "CHAPLIN_DB_PATH": str(tmp_path / "x.db")})
    assert first.returncode == 0, first.stderr
    assert DEV_SECRET_FILE.is_file()
    first_secret = DEV_SECRET_FILE.read_text()

    second = _run_import({"CHAPLIN_ENV": "development", "CHAPLIN_DB_PATH": str(tmp_path / "x2.db")})
    assert second.returncode == 0, second.stderr
    second_secret = DEV_SECRET_FILE.read_text()

    assert first_secret == second_secret  # restart must not rotate the dev secret


def test_explicit_secret_key_env_var_is_used_without_warning(tmp_path, no_configured_secret):
    result = _run_import({
        "CHAPLIN_ENV": "development",
        "SECRET_KEY": "a-real-explicit-secret-for-this-test",
        "CHAPLIN_DB_PATH": str(tmp_path / "x.db")
    })
    assert result.returncode == 0, result.stderr
    assert "AVISO" not in result.stdout
