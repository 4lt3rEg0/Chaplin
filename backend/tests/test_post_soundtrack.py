"""Attaching one of the owner's own Tracks to a post as its soundtrack —
the backend half of the editor's "acompañar con canción" step."""
import io
from conftest import register_user, login_user, auth_headers

REAL_MP3_BYTES = b"ID3" + b"\x00" * 61


def _user(client, username):
    user = register_user(client, username).json()
    token = login_user(client, username).json()["access_token"]
    return user, auth_headers(token)


def _make_track(client, headers, title="my song"):
    files = {"file": ("song.mp3", io.BytesIO(REAL_MP3_BYTES), "audio/mpeg")}
    post = client.post("/api/v1/posts/", headers=headers, data={"content": title}, files=files).json()
    track = client.post(f"/api/v1/tracks/from-post/{post['id']}", headers=headers, json={}).json()
    return track


def test_create_post_with_track(client):
    _, headers = _user(client, "soundtrackOwner")
    track = _make_track(client, headers)

    files = {"file": ("photo.png", io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 32), "image/png")}
    resp = client.post(
        "/api/v1/posts/",
        headers=headers,
        data={"content": "con musica", "track_id": str(track["id"])},
        files=files,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["track_id"] == track["id"]
    assert body["track_title"] == track["title"]
    assert body["track_media_url"] == track["media_url"]


def test_cannot_attach_someone_elses_track(client):
    _, other_headers = _user(client, "soundtrackOther")
    other_track = _make_track(client, other_headers)

    _, headers = _user(client, "soundtrackAttacker")
    resp = client.post(
        "/api/v1/posts/",
        headers=headers,
        data={"content": "intento", "track_id": str(other_track["id"])},
    )
    assert resp.status_code == 404


def test_can_change_and_remove_track_via_update(client):
    _, headers = _user(client, "soundtrackEditor")
    track_a = _make_track(client, headers, title="song a")
    track_b = _make_track(client, headers, title="song b")

    post = client.post(
        "/api/v1/posts/", headers=headers, data={"content": "post", "track_id": str(track_a["id"])}
    ).json()
    assert post["track_id"] == track_a["id"]

    swapped = client.put(
        f"/api/v1/posts/{post['id']}", headers=headers, data={"track_id": str(track_b["id"])}
    ).json()
    assert swapped["track_id"] == track_b["id"]

    removed = client.put(
        f"/api/v1/posts/{post['id']}", headers=headers, data={"remove_track": "true"}
    ).json()
    assert removed["track_id"] is None
    assert removed["track_media_url"] is None
