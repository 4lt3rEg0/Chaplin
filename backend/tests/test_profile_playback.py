"""Profile playback configuration (all/favorites/radio) and real favorites
that actually gate which tracks the profile player is allowed to play."""
import io
from conftest import register_user, login_user, auth_headers

REAL_MP3_BYTES = b"ID3" + b"\x00" * 61


def _user(client, username):
    user = register_user(client, username).json()
    token = login_user(client, username).json()["access_token"]
    return user, auth_headers(token)


def _upload(client, headers, title):
    files = {"file": ("song.mp3", io.BytesIO(REAL_MP3_BYTES), "audio/mpeg")}
    resp = client.post(
        "/api/v1/tracks/upload", headers=headers, files=files,
        data={"title": title, "target": "personal"}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_default_profile_playback_mode_is_all(client):
    _user(client, "defaultModeArtist")
    resp = client.get("/api/v1/users/defaultModeArtist/profile-playback")
    assert resp.status_code == 200, resp.text
    assert resp.json()["mode"] == "all"


def test_profile_playback_mode_all_returns_public_tracks(client):
    _, headers = _user(client, "modeAllArtist")
    track = _upload(client, headers, "Todo Mi Musica")

    resp = client.get("/api/v1/users/modeAllArtist/profile-playback")
    body = resp.json()
    assert body["mode"] == "all"
    assert any(t["id"] == track["id"] for t in body["tracks"])


def test_profile_playback_mode_all_excludes_private_tracks(client):
    _, headers = _user(client, "modeAllPrivateArtist")
    track = _upload(client, headers, "Privada")
    client.put(f"/api/v1/tracks/{track['id']}", headers=headers, json={"visibility": "private"})

    resp = client.get("/api/v1/users/modeAllPrivateArtist/profile-playback")
    body = resp.json()
    assert all(t["id"] != track["id"] for t in body["tracks"])


def test_mark_track_favorite_has_real_playback_effect_in_favorites_mode(client):
    _, headers = _user(client, "favModeArtist")
    fav_track = _upload(client, headers, "Favorita")
    other_track = _upload(client, headers, "No Favorita")

    client.put(f"/api/v1/users/me", headers=headers, data={"profile_playback_mode": "favorites"})
    updated = client.put(f"/api/v1/tracks/{fav_track['id']}", headers=headers, json={"is_favorited": True})
    assert updated.status_code == 200
    assert updated.json()["is_favorited"] is True

    resp = client.get("/api/v1/users/favModeArtist/profile-playback")
    body = resp.json()
    assert body["mode"] == "favorites"
    ids = [t["id"] for t in body["tracks"]]
    assert fav_track["id"] in ids
    assert other_track["id"] not in ids


def test_favorites_mode_with_no_favorites_is_gracefully_empty(client):
    _, headers = _user(client, "favEmptyArtist")
    _upload(client, headers, "Sin marcar")
    client.put("/api/v1/users/me", headers=headers, data={"profile_playback_mode": "favorites"})

    resp = client.get("/api/v1/users/favEmptyArtist/profile-playback")
    body = resp.json()
    assert body["mode"] == "favorites"
    assert body["tracks"] == []


def test_unfavorite_removes_track_from_favorites_playback(client):
    _, headers = _user(client, "unfavArtist")
    track = _upload(client, headers, "Va y viene")
    client.put("/api/v1/users/me", headers=headers, data={"profile_playback_mode": "favorites"})
    client.put(f"/api/v1/tracks/{track['id']}", headers=headers, json={"is_favorited": True})
    client.put(f"/api/v1/tracks/{track['id']}", headers=headers, json={"is_favorited": False})

    resp = client.get("/api/v1/users/unfavArtist/profile-playback")
    assert all(t["id"] != track["id"] for t in resp.json()["tracks"])


def test_profile_playback_mode_radio_uses_chaplin_radio_source(client):
    _, headers = _user(client, "modeRadioArtist")
    _upload(client, headers, "Personal, no deberia sonar")
    client.put("/api/v1/users/me", headers=headers, data={"profile_playback_mode": "radio"})

    resp = client.get("/api/v1/users/modeRadioArtist/profile-playback")
    body = resp.json()
    assert body["mode"] == "radio"
    radio = client.get("/api/v1/playlists/chaplin-radio").json()
    assert [t["id"] for t in body["tracks"]] == [t["id"] for t in radio["tracks"]]


def test_profile_playback_mode_persists_across_requests(client):
    _, headers = _user(client, "persistModeArtist")
    client.put("/api/v1/users/me", headers=headers, data={"profile_playback_mode": "favorites"})

    me = client.get("/api/v1/users/me", headers=headers).json()
    assert me["profile_playback_mode"] == "favorites"

    resp = client.get("/api/v1/users/persistModeArtist/profile-playback")
    assert resp.json()["mode"] == "favorites"


def test_invalid_profile_playback_mode_rejected(client):
    _, headers = _user(client, "invalidModeArtist")
    resp = client.put("/api/v1/users/me", headers=headers, data={"profile_playback_mode": "bogus"})
    assert resp.status_code == 422


def test_profile_playback_unknown_user_404s(client):
    resp = client.get("/api/v1/users/does-not-exist-user/profile-playback")
    assert resp.status_code == 404


def test_only_owner_can_toggle_favorite_on_a_track(client):
    _, owner_headers = _user(client, "favOwnerArtist")
    track = _upload(client, owner_headers, "Mia")
    _, intruder_headers = _user(client, "favIntruderArtist")

    resp = client.put(f"/api/v1/tracks/{track['id']}", headers=intruder_headers, json={"is_favorited": True})
    assert resp.status_code == 403
