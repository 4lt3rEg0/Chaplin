"""Search across posts, tracks and hashtags — backs the new "Explorar" page
(discovery: users, posts, hashtags, music, all in one place)."""
import io
from conftest import register_user, login_user, auth_headers

REAL_MP3_BYTES = b"ID3" + b"\x00" * 61


def _user(client, username):
    user = register_user(client, username).json()
    token = login_user(client, username).json()["access_token"]
    return user, auth_headers(token)


def test_search_posts_matches_content_substring(client):
    _, headers = _user(client, "explorePostsUser")
    client.post("/api/v1/posts/", headers=headers, data={"content": "un atardecer synthwave increible"})

    resp = client.get("/api/v1/posts/search?q=synthwave")
    assert resp.status_code == 200
    contents = [p["content"] for p in resp.json()]
    assert any("synthwave" in c for c in contents)


def test_search_posts_excludes_private(client):
    _, headers = _user(client, "explorePostsPrivateUser")
    client.post("/api/v1/posts/", headers=headers, data={"content": "secreto vaporwave", "is_public": "false"})

    resp = client.get("/api/v1/posts/search?q=vaporwave")
    assert resp.json() == []


def test_search_tracks_matches_title(client):
    _, headers = _user(client, "exploreTracksUser")
    files = {"file": ("song.mp3", io.BytesIO(REAL_MP3_BYTES), "audio/mpeg")}
    post = client.post("/api/v1/posts/", headers=headers, data={"content": "cancion"}, files=files).json()
    client.post(f"/api/v1/tracks/from-post/{post['id']}", headers=headers, json={"title": "Neon Dreams Remix"})

    resp = client.get("/api/v1/tracks/search?q=Neon")
    assert resp.status_code == 200
    titles = [t["title"] for t in resp.json()]
    assert "Neon Dreams Remix" in titles


def test_search_tags_counts_matching_hashtags(client):
    _, headers = _user(client, "exploreTagsUser")
    client.post("/api/v1/posts/", headers=headers, data={"content": "amo el #cyberpunk# de noche"})
    client.post("/api/v1/posts/", headers=headers, data={"content": "otro post #cyberpunk# mas"})
    client.post("/api/v1/posts/", headers=headers, data={"content": "algo #cybersecurity# distinto"})

    resp = client.get("/api/v1/tags/search?q=cyber")
    assert resp.status_code == 200
    by_tag = {row["tag"]: row["count"] for row in resp.json()}
    assert by_tag.get("cyberpunk") == 2
    assert by_tag.get("cybersecurity") == 1
