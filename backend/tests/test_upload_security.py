"""Upload hardening: path traversal, size limits, rejected file types."""
import io
from conftest import register_user, login_user, auth_headers

# Minimal real MP3 signature (ID3v2 tag header) — enough to pass the backend's
# magic-byte sniff without needing an actual playable audio file.
REAL_MP3_BYTES = b"ID3" + b"\x00" * 61


def _headers(client, username="uploaderX"):
    register_user(client, username)
    return auth_headers(login_user(client, username).json()["access_token"])


def test_path_traversal_filename_is_neutralized(client):
    headers = _headers(client)
    evil_name = "../../../../etc/evil.mp3"
    files = {"file": (evil_name, io.BytesIO(REAL_MP3_BYTES), "audio/mpeg")}
    resp = client.post("/api/v1/posts/", headers=headers, data={"content": "x"}, files=files)
    assert resp.status_code == 200, resp.text

    media_url = resp.json()["media_url"]
    # The stored path must never contain the traversal sequence — it's rebuilt
    # server-side from user id + random token + extension only.
    assert ".." not in media_url
    assert "etc" not in media_url
    assert media_url.startswith("/media/")


def test_disallowed_extension_is_rejected(client):
    headers = _headers(client, "uploaderY")
    files = {"file": ("virus.exe", io.BytesIO(b"MZ..."), "application/octet-stream")}
    resp = client.post("/api/v1/posts/", headers=headers, data={"content": "x"}, files=files)
    assert resp.status_code == 400


def test_oversized_upload_is_rejected_and_cleaned_up(client, monkeypatch):
    from app import main as chaplin_main
    monkeypatch.setattr(chaplin_main, "MAX_UPLOAD_SIZE_BYTES", 10)  # 10 bytes, easy to exceed

    headers = _headers(client, "uploaderZ")
    files = {"file": ("big.mp3", io.BytesIO(REAL_MP3_BYTES + b"x" * 1000), "audio/mpeg")}
    resp = client.post("/api/v1/posts/", headers=headers, data={"content": "x"}, files=files)
    assert resp.status_code == 413

    # No partial file left behind in the (test-only) media folder.
    leftover = list(chaplin_main.MEDIA_FOLDER.glob("*"))
    assert leftover == []


def test_two_uploads_same_original_filename_do_not_collide(client):
    headers = _headers(client, "uploaderW")
    files1 = {"file": ("same.mp3", io.BytesIO(REAL_MP3_BYTES + b"first"), "audio/mpeg")}
    files2 = {"file": ("same.mp3", io.BytesIO(REAL_MP3_BYTES + b"second"), "audio/mpeg")}

    first = client.post("/api/v1/posts/", headers=headers, data={"content": "one"}, files=files1)
    second = client.post("/api/v1/posts/", headers=headers, data={"content": "two"}, files=files2)
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["media_url"] != second.json()["media_url"]


def test_text_file_renamed_to_mp3_is_rejected(client):
    """A .txt file renamed to .mp3 passes the extension check but must fail
    the magic-byte sniff — extension alone is not sufficient validation."""
    headers = _headers(client, "uploaderFakeMp3")
    fake_mp3 = b"This is just plain text, not an mp3 file at all."
    files = {"file": ("totally-real-song.mp3", io.BytesIO(fake_mp3), "audio/mpeg")}
    resp = client.post("/api/v1/posts/", headers=headers, data={"content": "x"}, files=files)
    assert resp.status_code == 400

    from app import main as chaplin_main
    assert list(chaplin_main.MEDIA_FOLDER.glob("*")) == []


def test_real_looking_mp3_is_accepted(client):
    headers = _headers(client, "uploaderRealMp3")
    files = {"file": ("song.mp3", io.BytesIO(REAL_MP3_BYTES), "audio/mpeg")}
    resp = client.post("/api/v1/posts/", headers=headers, data={"content": "x"}, files=files)
    assert resp.status_code == 200, resp.text


def test_empty_file_is_rejected(client):
    headers = _headers(client, "uploaderEmpty")
    files = {"file": ("empty.mp3", io.BytesIO(b""), "audio/mpeg")}
    resp = client.post("/api/v1/posts/", headers=headers, data={"content": "x"}, files=files)
    assert resp.status_code == 400

    from app import main as chaplin_main
    assert list(chaplin_main.MEDIA_FOLDER.glob("*")) == []


def test_real_png_is_accepted(client):
    headers = _headers(client, "uploaderRealPng")
    png_signature = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
    files = {"file": ("avatar.png", io.BytesIO(png_signature), "image/png")}
    resp = client.post("/api/v1/posts/", headers=headers, data={"content": "x"}, files=files)
    assert resp.status_code == 200, resp.text


def test_text_file_renamed_to_png_is_rejected(client):
    headers = _headers(client, "uploaderFakePng")
    files = {"file": ("avatar.png", io.BytesIO(b"not actually a png"), "image/png")}
    resp = client.post("/api/v1/posts/", headers=headers, data={"content": "x"}, files=files)
    assert resp.status_code == 400
