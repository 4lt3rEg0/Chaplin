"""Authorization matrix / IDOR / mass-assignment tests.

These call the API directly with manipulated IDs and payloads rather than
going through any UI — the backend must never rely on the frontend to
enforce ownership or field whitelisting (CHAPLIN BETA HARDENING V5, Fase E/F/G).
"""
import io
import json
from conftest import register_user, login_user, auth_headers


def _user(client, username):
    user = register_user(client, username).json()
    token = login_user(client, username).json()["access_token"]
    return user, auth_headers(token)


REAL_MP3_BYTES = b"ID3" + b"\x00" * 61


def _upload_audio_post(client, headers, filename="song.mp3"):
    files = {"file": (filename, io.BytesIO(REAL_MP3_BYTES), "audio/mpeg")}
    resp = client.post("/api/v1/posts/", headers=headers, data={"content": "my track"}, files=files)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _make_track(client, headers, post_id, visibility="public"):
    resp = client.post(
        f"/api/v1/tracks/from-post/{post_id}",
        headers=headers,
        json={"visibility": visibility}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# Fase E/F — direct object reference tests with a real token + someone else's ID
# ---------------------------------------------------------------------------

def test_idor_user_a_cannot_add_items_to_user_b_playlist(client):
    user_a, headers_a = _user(client, "idorA")
    user_b, headers_b = _user(client, "idorB")

    post = _upload_audio_post(client, headers_b)
    track = _make_track(client, headers_b, post["id"])
    playlist_b = client.get("/api/v1/playlists/mine/personal", headers=headers_b).json()

    resp = client.post(
        f"/api/v1/playlists/{playlist_b['id']}/items",
        headers=headers_a,
        json={"track_id": track["id"]}
    )
    assert resp.status_code == 403


def test_idor_user_a_cannot_reorder_user_b_playlist(client):
    _, headers_a = _user(client, "idorC")
    _, headers_b = _user(client, "idorD")
    playlist_b = client.get("/api/v1/playlists/mine/personal", headers=headers_b).json()

    resp = client.put(
        f"/api/v1/playlists/{playlist_b['id']}/reorder",
        headers=headers_a,
        json={"track_ids": []}
    )
    assert resp.status_code == 403


def test_idor_user_a_cannot_remove_items_from_user_b_playlist(client):
    _, headers_a = _user(client, "idorE")
    user_b, headers_b = _user(client, "idorF")
    post = _upload_audio_post(client, headers_b)
    track = _make_track(client, headers_b, post["id"])
    playlist_b = client.get("/api/v1/playlists/mine/personal", headers=headers_b).json()
    client.post(f"/api/v1/playlists/{playlist_b['id']}/items", headers=headers_b, json={"track_id": track["id"]})

    resp = client.delete(f"/api/v1/playlists/{playlist_b['id']}/items/{track['id']}", headers=headers_a)
    assert resp.status_code == 403


def test_normal_user_cannot_add_item_to_chaplin_radio(client):
    register_user(client, "root")  # curator
    root_headers = auth_headers(login_user(client, "root").json()["access_token"])
    radio = client.post(
        "/api/v1/playlists/",
        headers=root_headers,
        json={"name": "Chaplin Radio", "kind": "chaplin_radio", "visibility": "public"}
    ).json()

    _, headers_normal = _user(client, "notACurator")
    resp = client.put(f"/api/v1/playlists/{radio['id']}", headers=headers_normal, json={"name": "Hijacked Radio"})
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Fase D9 / F1 — private track must not be fetchable by raw ID by a stranger
# ---------------------------------------------------------------------------

def test_private_track_not_fetchable_by_id_without_auth(client):
    _, headers_owner = _user(client, "privTrackOwner")
    post = _upload_audio_post(client, headers_owner)
    track = _make_track(client, headers_owner, post["id"], visibility="private")

    resp = client.get(f"/api/v1/tracks/{track['id']}")
    assert resp.status_code == 404


def test_private_track_not_fetchable_by_id_by_another_user(client):
    _, headers_owner = _user(client, "privTrackOwner2")
    post = _upload_audio_post(client, headers_owner)
    track = _make_track(client, headers_owner, post["id"], visibility="private")

    _, headers_stranger = _user(client, "strangerX")
    resp = client.get(f"/api/v1/tracks/{track['id']}", headers=headers_stranger)
    assert resp.status_code == 404


def test_private_track_is_fetchable_by_its_own_owner(client):
    _, headers_owner = _user(client, "privTrackOwner3")
    post = _upload_audio_post(client, headers_owner)
    track = _make_track(client, headers_owner, post["id"], visibility="private")

    resp = client.get(f"/api/v1/tracks/{track['id']}", headers=headers_owner)
    assert resp.status_code == 200


def test_public_track_still_fetchable_by_anyone(client):
    _, headers_owner = _user(client, "pubTrackOwner")
    post = _upload_audio_post(client, headers_owner)
    track = _make_track(client, headers_owner, post["id"], visibility="public")

    resp = client.get(f"/api/v1/tracks/{track['id']}")
    assert resp.status_code == 200


def test_track_made_private_after_joining_public_playlist_is_hidden_from_playlist_view(client):
    """A track can be added to a public profile playlist while public, then
    flipped private afterwards — the public playlist read path must re-check
    each track's own visibility, not just trust the playlist's visibility."""
    _, headers_owner = _user(client, "flipOwner")
    post = _upload_audio_post(client, headers_owner)
    track = _make_track(client, headers_owner, post["id"], visibility="public")

    profile_playlist = client.get("/api/v1/playlists/mine/profile", headers=headers_owner).json()
    client.post(f"/api/v1/playlists/{profile_playlist['id']}/items", headers=headers_owner, json={"track_id": track["id"]})

    # Confirm it shows up while still public.
    public_view = client.get("/api/v1/playlists/profile/flipOwner").json()
    assert len(public_view["tracks"]) == 1

    # Flip the track private without touching the playlist.
    client.put(f"/api/v1/tracks/{track['id']}", headers=headers_owner, json={"visibility": "private"})

    public_view_after = client.get("/api/v1/playlists/profile/flipOwner").json()
    assert public_view_after["tracks"] == []

    # But the owner's own view of their playlist still has it.
    owner_view = client.get("/api/v1/playlists/mine/profile", headers=headers_owner).json()
    assert len(owner_view["tracks"]) == 1

    # Flip it public again — the visitor must see it reappear, and it must
    # still be the same single item, not duplicated by the visibility churn.
    client.put(f"/api/v1/tracks/{track['id']}", headers=headers_owner, json={"visibility": "public"})
    public_view_again = client.get("/api/v1/playlists/profile/flipOwner").json()
    assert len(public_view_again["tracks"]) == 1
    assert public_view_again["tracks"][0]["id"] == track["id"]


def test_chaplin_radio_never_surfaces_a_private_track(client):
    register_user(client, "root")
    root_headers = auth_headers(login_user(client, "root").json()["access_token"])
    radio = client.post(
        "/api/v1/playlists/",
        headers=root_headers,
        json={"name": "Chaplin Radio", "kind": "chaplin_radio", "visibility": "public"}
    ).json()

    post = _upload_audio_post(client, root_headers)
    track = _make_track(client, root_headers, post["id"], visibility="public")
    client.post(f"/api/v1/playlists/{radio['id']}/items", headers=root_headers, json={"track_id": track["id"]})

    assert len(client.get("/api/v1/playlists/chaplin-radio").json()["tracks"]) == 1

    client.put(f"/api/v1/tracks/{track['id']}", headers=root_headers, json={"visibility": "private"})
    assert client.get("/api/v1/playlists/chaplin-radio").json()["tracks"] == []


# ---------------------------------------------------------------------------
# Fase A3/D — private post comments must not be a side-channel
# ---------------------------------------------------------------------------

def test_comments_on_private_post_not_visible_to_anyone(client):
    _, headers_owner = _user(client, "privPostOwner")
    post_resp = client.post("/api/v1/posts/", headers=headers_owner, data={"content": "secret post", "is_public": "false"})
    assert post_resp.status_code == 200
    post = post_resp.json()
    assert post["is_public"] is False

    resp = client.get(f"/api/v1/posts/{post['id']}/comments")
    assert resp.status_code == 404


def test_cannot_comment_on_private_post_you_cannot_see(client):
    _, headers_owner = _user(client, "privPostOwner2")
    post = client.post("/api/v1/posts/", headers=headers_owner, data={"content": "secret", "is_public": "false"}).json()

    _, headers_stranger = _user(client, "commenterX")
    resp = client.post(
        f"/api/v1/posts/{post['id']}/comments",
        headers=headers_stranger,
        json={"content": "sneaky comment"}
    )
    assert resp.status_code == 404


def test_comments_on_public_post_still_visible(client):
    _, headers_owner = _user(client, "pubPostOwner")
    post = client.post("/api/v1/posts/", headers=headers_owner, data={"content": "public post"}).json()
    client.post(f"/api/v1/posts/{post['id']}/comments", headers=headers_owner, json={"content": "hi"})

    resp = client.get(f"/api/v1/posts/{post['id']}/comments")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


# ---------------------------------------------------------------------------
# Fase G — mass assignment: PUT /users/me must not accept protected fields
# ---------------------------------------------------------------------------

def test_update_me_cannot_change_id_or_email_via_form_fields(client):
    user, headers = _user(client, "massAssignVictim")
    original_id = user["id"]

    # Even though these aren't declared Form() params, send them anyway —
    # FastAPI must silently ignore anything not in the endpoint's signature.
    resp = client.put(
        "/api/v1/users/me",
        headers=headers,
        data={
            "id": "999999",
            "email": "hijacked@evil.com",
            "hashed_password": "not-a-real-hash",
            "bio": "legit bio update"
        }
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == original_id
    assert body["email"] == f"massAssignVictim@example.com"
    assert body["bio"] == "legit bio update"


def test_update_me_rejects_oversized_preferences(client):
    _, headers = _user(client, "hugePrefsUser")
    huge_prefs = json.dumps({"padding": "x" * 100_000})
    resp = client.put("/api/v1/users/me", headers=headers, data={"preferences": huge_prefs})
    assert resp.status_code == 413


def test_update_me_accepts_reasonably_sized_preferences(client):
    _, headers = _user(client, "normalPrefsUser")
    prefs = json.dumps({"base_theme": "y2k", "material_id": "chrome", "hud_grammar_id": "hud-1"})
    resp = client.put("/api/v1/users/me", headers=headers, data={"preferences": prefs})
    assert resp.status_code == 200


def test_update_me_rejects_invalid_json_preferences(client):
    _, headers = _user(client, "badJsonUser")
    resp = client.put("/api/v1/users/me", headers=headers, data={"preferences": "{not valid json"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# CRITICAL — a private Track's metadata being gated is meaningless if its raw
# audio file is still a public URL. This is the "private resource = public
# URL" bug class called out explicitly in CHAPLIN BETA HARDENING V6.
# ---------------------------------------------------------------------------

def test_private_track_raw_media_is_blocked_for_anonymous(client):
    _, headers_owner = _user(client, "mediaPrivOwner")
    post = _upload_audio_post(client, headers_owner)
    track = _make_track(client, headers_owner, post["id"], visibility="private")

    resp = client.get(track["media_url"])
    assert resp.status_code == 404


def test_private_track_raw_media_is_blocked_for_another_user(client):
    _, headers_owner = _user(client, "mediaPrivOwner2")
    post = _upload_audio_post(client, headers_owner)
    track = _make_track(client, headers_owner, post["id"], visibility="private")

    _, headers_stranger = _user(client, "mediaStranger")
    resp = client.get(track["media_url"], headers=headers_stranger)
    assert resp.status_code == 404


def test_private_track_raw_media_is_accessible_by_owner(client):
    _, headers_owner = _user(client, "mediaPrivOwner3")
    post = _upload_audio_post(client, headers_owner)
    track = _make_track(client, headers_owner, post["id"], visibility="private")

    resp = client.get(track["media_url"], headers=headers_owner)
    assert resp.status_code == 200


def test_public_track_raw_media_is_accessible_anonymously(client):
    _, headers_owner = _user(client, "mediaPubOwner")
    post = _upload_audio_post(client, headers_owner)
    track = _make_track(client, headers_owner, post["id"], visibility="public")

    resp = client.get(track["media_url"])
    assert resp.status_code == 200


def test_private_post_media_is_blocked_for_anonymous_even_without_a_track(client):
    """The same bypass exists at the Post level independently of Track —
    a private post's attached image/audio must not be a public URL either."""
    _, headers_owner = _user(client, "privPostMediaOwner")
    files = {"file": ("photo.png", io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 32), "image/png")}
    resp = client.post(
        "/api/v1/posts/",
        headers=headers_owner,
        data={"content": "secret pic", "is_public": "false"},
        files=files
    )
    assert resp.status_code == 200
    media_url = resp.json()["media_url"]

    anon = client.get(media_url)
    assert anon.status_code == 404

    owner_view = client.get(media_url, headers=headers_owner)
    assert owner_view.status_code == 200


def test_media_route_rejects_path_traversal(client):
    resp = client.get("/media/..%2f..%2fmain.py")
    assert resp.status_code in (404, 400)


def test_media_route_404_for_nonexistent_file(client):
    resp = client.get("/media/does-not-exist-at-all.mp3")
    assert resp.status_code == 404


def test_spa_catchall_never_swallows_api_or_media_prefixed_paths(client):
    """CHAPLIN MOBILE ALPHA: the SPA fallback route (registered last, catches
    anything unmatched) must never mask a malformed/unmatched /api/ or
    /media/ request as a 200 index.html — that's what let the path-traversal
    test above regress silently to 200 when the frontend build first existed
    on disk during test runs."""
    for path in ("/api/v1/this-route-does-not-exist", "/media/nested/not-a-real-file.mp3"):
        resp = client.get(path)
        assert resp.status_code == 404, f"{path} returned {resp.status_code}"
        assert "<!DOCTYPE html>" not in resp.text


def test_media_blocked_if_either_linked_entity_is_private(client):
    """A Track created from-post shares its media_url with the source Post,
    but their visibility can diverge afterwards. The gate must be conservative:
    block for a stranger if EITHER the Track or the Post considers it private,
    even if the other one still says public."""
    _, headers_owner = _user(client, "sharedUrlOwner")
    post = _upload_audio_post(client, headers_owner)  # public by default
    track = _make_track(client, headers_owner, post["id"], visibility="public")

    # Both public — anonymous access works.
    assert client.get(track["media_url"]).status_code == 200

    # Post stays public, but the Track derived from it goes private.
    client.put(f"/api/v1/tracks/{track['id']}", headers=headers_owner, json={"visibility": "private"})
    assert client.get(track["media_url"]).status_code == 404

    # Owner can still reach it.
    assert client.get(track["media_url"], headers=headers_owner).status_code == 200


# ---------------------------------------------------------------------------
# Private post: the owner must still see/comment their own post — the privacy
# gate is "public OR owner", not just "public" (CHAPLIN BETA HARDENING V6,
# Prioridad 3).
# ---------------------------------------------------------------------------

def test_owner_can_view_their_own_private_post(client):
    _, headers_owner = _user(client, "privPostSelfView")
    post = client.post("/api/v1/posts/", headers=headers_owner, data={"content": "mine", "is_public": "false"}).json()

    resp = client.get(f"/api/v1/posts/{post['id']}", headers=headers_owner)
    assert resp.status_code == 200


def test_owner_can_comment_on_their_own_private_post(client):
    _, headers_owner = _user(client, "privPostSelfComment")
    post = client.post("/api/v1/posts/", headers=headers_owner, data={"content": "mine", "is_public": "false"}).json()

    resp = client.post(f"/api/v1/posts/{post['id']}/comments", headers=headers_owner, json={"content": "note to self"})
    assert resp.status_code == 200


def test_owner_can_read_comments_on_their_own_private_post(client):
    _, headers_owner = _user(client, "privPostSelfReadComments")
    post = client.post("/api/v1/posts/", headers=headers_owner, data={"content": "mine", "is_public": "false"}).json()
    client.post(f"/api/v1/posts/{post['id']}/comments", headers=headers_owner, json={"content": "hi"})

    resp = client.get(f"/api/v1/posts/{post['id']}/comments", headers=headers_owner)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_stranger_still_cannot_view_private_post(client):
    _, headers_owner = _user(client, "privPostStranger1")
    post = client.post("/api/v1/posts/", headers=headers_owner, data={"content": "mine", "is_public": "false"}).json()

    _, headers_stranger = _user(client, "privPostStrangerVisitor")
    resp = client.get(f"/api/v1/posts/{post['id']}", headers=headers_stranger)
    assert resp.status_code == 404
