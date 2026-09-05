"""Direct music upload (no Post detour) with an explicit personal-vs-Radio
choice, and the curator moderation queue that gates what actually reaches
Chaplin Radio."""
import io
from conftest import register_user, login_user, auth_headers

REAL_MP3_BYTES = b"ID3" + b"\x00" * 61
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


def _user(client, username):
    user = register_user(client, username).json()
    token = login_user(client, username).json()["access_token"]
    return user, auth_headers(token)


def _curator_headers(client):
    # RADIO_CURATORS includes "testchaplin" by hardcoded allowlist.
    register_user(client, "testchaplin")
    token = login_user(client, "testchaplin").json()["access_token"]
    return auth_headers(token)


def test_upload_personal_track_stays_personal_and_not_in_radio(client):
    _, headers = _user(client, "uploadPersonalArtist")
    files = {"file": ("song.mp3", io.BytesIO(REAL_MP3_BYTES), "audio/mpeg")}
    resp = client.post(
        "/api/v1/tracks/upload", headers=headers, files=files,
        data={"title": "Mi Cancion", "target": "personal"}
    )
    assert resp.status_code == 200, resp.text
    track = resp.json()
    assert track["radio_status"] == "personal"

    mine = client.get("/api/v1/tracks/mine", headers=headers).json()
    assert any(t["id"] == track["id"] for t in mine)

    radio = client.get("/api/v1/playlists/chaplin-radio").json()
    assert all(t["id"] != track["id"] for t in radio["tracks"])


def test_upload_with_artwork_persists_artwork_url(client):
    _, headers = _user(client, "uploadArtworkArtist")
    files = {
        "file": ("song.mp3", io.BytesIO(REAL_MP3_BYTES), "audio/mpeg"),
        "artwork": ("cover.png", io.BytesIO(PNG_BYTES), "image/png"),
    }
    resp = client.post(
        "/api/v1/tracks/upload", headers=headers, files=files,
        data={"title": "Con Portada", "target": "personal"}
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["artwork_url"]


def test_upload_targeting_radio_is_pending_not_auto_added(client):
    _, headers = _user(client, "uploadRadioArtist")
    files = {"file": ("song.mp3", io.BytesIO(REAL_MP3_BYTES), "audio/mpeg")}
    resp = client.post(
        "/api/v1/tracks/upload", headers=headers, files=files,
        data={"title": "Para Radio", "target": "radio"}
    )
    track = resp.json()
    assert track["radio_status"] == "pending"

    radio = client.get("/api/v1/playlists/chaplin-radio").json()
    assert all(t["id"] != track["id"] for t in radio["tracks"])


def test_non_curator_cannot_see_or_moderate_submissions(client):
    _, headers = _user(client, "nonCuratorArtist")
    resp = client.get("/api/v1/radio/submissions", headers=headers)
    assert resp.status_code == 403

    resp2 = client.post("/api/v1/radio/submissions/1/approve", headers=headers)
    assert resp2.status_code == 403


def test_curator_can_approve_submission_into_radio(client):
    _, artist_headers = _user(client, "approveFlowArtist")
    files = {"file": ("song.mp3", io.BytesIO(REAL_MP3_BYTES), "audio/mpeg")}
    track = client.post(
        "/api/v1/tracks/upload", headers=artist_headers, files=files,
        data={"title": "Aprobame", "target": "radio"}
    ).json()

    curator_headers = _curator_headers(client)
    pending = client.get("/api/v1/radio/submissions", headers=curator_headers).json()
    assert any(t["id"] == track["id"] for t in pending)

    approved = client.post(f"/api/v1/radio/submissions/{track['id']}/approve", headers=curator_headers)
    assert approved.status_code == 200
    assert approved.json()["radio_status"] == "approved"

    radio = client.get("/api/v1/playlists/chaplin-radio").json()
    assert any(t["id"] == track["id"] for t in radio["tracks"])


def test_curator_can_reject_submission(client):
    _, artist_headers = _user(client, "rejectFlowArtist")
    files = {"file": ("song.mp3", io.BytesIO(REAL_MP3_BYTES), "audio/mpeg")}
    track = client.post(
        "/api/v1/tracks/upload", headers=artist_headers, files=files,
        data={"title": "Rechazame", "target": "radio"}
    ).json()

    curator_headers = _curator_headers(client)
    rejected = client.post(f"/api/v1/radio/submissions/{track['id']}/reject", headers=curator_headers)
    assert rejected.status_code == 200
    assert rejected.json()["radio_status"] == "rejected"

    radio = client.get("/api/v1/playlists/chaplin-radio").json()
    assert all(t["id"] != track["id"] for t in radio["tracks"])


def test_upload_rejects_non_audio_file(client):
    _, headers = _user(client, "uploadBadFileArtist")
    files = {"file": ("not-audio.png", io.BytesIO(PNG_BYTES), "image/png")}
    resp = client.post(
        "/api/v1/tracks/upload", headers=headers, files=files,
        data={"title": "Malo", "target": "personal"}
    )
    assert resp.status_code == 400


def test_upload_requires_title(client):
    _, headers = _user(client, "uploadNoTitleArtist")
    files = {"file": ("song.mp3", io.BytesIO(REAL_MP3_BYTES), "audio/mpeg")}
    resp = client.post(
        "/api/v1/tracks/upload", headers=headers, files=files,
        data={"title": "   ", "target": "personal"}
    )
    assert resp.status_code == 422


def test_pin_and_unpin_profile_playlist_keeps_tracks(client):
    _, headers = _user(client, "pinPlaylistArtist")
    files = {"file": ("song.mp3", io.BytesIO(REAL_MP3_BYTES), "audio/mpeg")}
    track = client.post(
        "/api/v1/tracks/upload", headers=headers, files=files,
        data={"title": "Fijada", "target": "personal"}
    ).json()

    profile_playlist = client.get("/api/v1/playlists/mine/profile", headers=headers).json()
    client.post(
        f"/api/v1/playlists/{profile_playlist['id']}/items", headers=headers,
        json={"track_id": track["id"]}
    )

    public_view = client.get("/api/v1/playlists/profile/pinPlaylistArtist").json()
    assert any(t["id"] == track["id"] for t in public_view["tracks"])

    client.put(f"/api/v1/playlists/{profile_playlist['id']}", headers=headers, json={"visibility": "private"})
    hidden_view = client.get("/api/v1/playlists/profile/pinPlaylistArtist").json()
    assert hidden_view["tracks"] == []

    mine_still_there = client.get("/api/v1/tracks/mine", headers=headers).json()
    assert any(t["id"] == track["id"] for t in mine_still_there)
