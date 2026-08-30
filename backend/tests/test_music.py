"""Track/Playlist ownership, permissions, legacy migration, and constraints."""
import io
from conftest import register_user, login_user, auth_headers

REAL_MP3_BYTES = b"ID3" + b"\x00" * 61


def _upload_audio_post(client, headers, filename="song.mp3"):
    files = {"file": (filename, io.BytesIO(REAL_MP3_BYTES), "audio/mpeg")}
    resp = client.post("/api/v1/posts/", headers=headers, data={"content": "my track"}, files=files)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _make_track(client, headers, post_id):
    resp = client.post(f"/api/v1/tracks/from-post/{post_id}", headers=headers, json={})
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_owner_can_create_and_update_track(client):
    user = register_user(client, "artistA").json()
    headers = auth_headers(login_user(client, "artistA").json()["access_token"])
    post = _upload_audio_post(client, headers)
    track = _make_track(client, headers, post["id"])
    assert track["owner_id"] == user["id"]

    updated = client.put(f"/api/v1/tracks/{track['id']}", headers=headers, json={"title": "New Title"})
    assert updated.status_code == 200
    assert updated.json()["title"] == "New Title"


def test_non_owner_cannot_update_track(client):
    register_user(client, "artistB")
    headers_b = auth_headers(login_user(client, "artistB").json()["access_token"])
    post = _upload_audio_post(client, headers_b)
    track = _make_track(client, headers_b, post["id"])

    register_user(client, "intruder")
    headers_intruder = auth_headers(login_user(client, "intruder").json()["access_token"])

    resp = client.put(f"/api/v1/tracks/{track['id']}", headers=headers_intruder, json={"title": "Hijacked"})
    assert resp.status_code == 403


def test_non_owner_cannot_delete_track(client):
    register_user(client, "artistC")
    headers_c = auth_headers(login_user(client, "artistC").json()["access_token"])
    post = _upload_audio_post(client, headers_c)
    track = _make_track(client, headers_c, post["id"])

    register_user(client, "intruder2")
    headers_intruder = auth_headers(login_user(client, "intruder2").json()["access_token"])

    resp = client.delete(f"/api/v1/tracks/{track['id']}", headers=headers_intruder)
    assert resp.status_code == 403


def test_personal_playlist_is_auto_created_and_private(client):
    register_user(client, "userD")
    headers = auth_headers(login_user(client, "userD").json()["access_token"])
    resp = client.get("/api/v1/playlists/mine/personal", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["visibility"] == "private"
    assert resp.json()["kind"] == "personal"


def test_other_user_cannot_modify_someone_elses_playlist(client):
    register_user(client, "ownerE")
    headers_owner = auth_headers(login_user(client, "ownerE").json()["access_token"])
    playlist = client.get("/api/v1/playlists/mine/personal", headers=headers_owner).json()

    register_user(client, "attackerE")
    headers_attacker = auth_headers(login_user(client, "attackerE").json()["access_token"])

    resp = client.put(f"/api/v1/playlists/{playlist['id']}", headers=headers_attacker, json={"name": "Hijacked"})
    assert resp.status_code == 403


def test_profile_playlist_is_publicly_readable(client):
    register_user(client, "artistF")
    headers = auth_headers(login_user(client, "artistF").json()["access_token"])
    post = _upload_audio_post(client, headers)
    track = _make_track(client, headers, post["id"])

    profile_playlist = client.get("/api/v1/playlists/mine/profile", headers=headers).json()
    add = client.post(f"/api/v1/playlists/{profile_playlist['id']}/items", headers=headers, json={"track_id": track["id"]})
    assert add.status_code == 200

    # No auth at all — a visitor reading someone else's public profile playlist.
    public_read = client.get("/api/v1/playlists/profile/artistF")
    assert public_read.status_code == 200
    assert len(public_read.json()["tracks"]) == 1


def test_normal_user_cannot_create_chaplin_radio_playlist(client):
    register_user(client, "regularUser")
    headers = auth_headers(login_user(client, "regularUser").json()["access_token"])
    resp = client.post("/api/v1/playlists/", headers=headers, json={
        "name": "My Radio", "kind": "chaplin_radio", "visibility": "public"
    })
    assert resp.status_code == 403


def test_curator_can_create_chaplin_radio_playlist(client):
    register_user(client, "root")  # username matches RADIO_CURATORS allowlist
    headers = auth_headers(login_user(client, "root").json()["access_token"])
    resp = client.post("/api/v1/playlists/", headers=headers, json={
        "name": "Chaplin Radio", "kind": "chaplin_radio", "visibility": "public"
    })
    assert resp.status_code == 200
    assert resp.json()["kind"] == "chaplin_radio"


def test_duplicate_playlist_item_is_not_duplicated(client):
    register_user(client, "artistG")
    headers = auth_headers(login_user(client, "artistG").json()["access_token"])
    post = _upload_audio_post(client, headers)
    track = _make_track(client, headers, post["id"])
    playlist = client.get("/api/v1/playlists/mine/personal", headers=headers).json()

    first = client.post(f"/api/v1/playlists/{playlist['id']}/items", headers=headers, json={"track_id": track["id"]})
    second = client.post(f"/api/v1/playlists/{playlist['id']}/items", headers=headers, json={"track_id": track["id"]})
    assert first.status_code == 200
    assert second.status_code == 200
    assert len(second.json()["tracks"]) == 1  # not 2 — the UniqueConstraint path is respected


def test_legacy_audio_post_migration_is_idempotent(client, test_engine):
    from app import main as chaplin_main
    from sqlalchemy.orm import sessionmaker

    register_user(client, "legacyArtist")
    headers = auth_headers(login_user(client, "legacyArtist").json()["access_token"])
    _upload_audio_post(client, headers)

    Session = sessionmaker(bind=test_engine)
    db = Session()
    try:
        first_run = chaplin_main.backfill_tracks_from_audio_posts(db)
        second_run = chaplin_main.backfill_tracks_from_audio_posts(db)
    finally:
        db.close()

    assert first_run["audio_posts_detected"] == 1
    assert first_run["tracks_created"] == 1
    assert second_run["tracks_created"] == 0  # idempotent: no duplicate on re-run
