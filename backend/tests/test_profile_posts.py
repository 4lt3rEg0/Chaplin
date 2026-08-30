"""GET /posts/by-user/{username} — backs the Instagram-style profile tabs
(Publicaciones grid = media posts, Bitácora = text-only posts)."""
import io
from conftest import register_user, login_user, auth_headers

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


def _user(client, username):
    user = register_user(client, username).json()
    token = login_user(client, username).json()["access_token"]
    return user, auth_headers(token)


def test_media_filter_returns_only_image_and_video_posts(client):
    _, headers = _user(client, "profilePostsMediaUser")
    client.post("/api/v1/posts/", headers=headers, data={"content": "solo texto"})
    files = {"file": ("p.png", io.BytesIO(PNG_BYTES), "image/png")}
    client.post("/api/v1/posts/", headers=headers, data={"content": "con foto"}, files=files)

    resp = client.get("/api/v1/posts/by-user/profilePostsMediaUser?media=media")
    assert resp.status_code == 200
    posts = resp.json()
    assert len(posts) == 1
    assert posts[0]["media_type"] == "image"


def test_text_filter_returns_only_bitacora_posts(client):
    _, headers = _user(client, "profilePostsTextUser")
    client.post("/api/v1/posts/", headers=headers, data={"content": "entrada de diario"})
    files = {"file": ("p.png", io.BytesIO(PNG_BYTES), "image/png")}
    client.post("/api/v1/posts/", headers=headers, data={"content": "con foto"}, files=files)

    resp = client.get("/api/v1/posts/by-user/profilePostsTextUser?media=text")
    posts = resp.json()
    assert len(posts) == 1
    assert posts[0]["content"] == "entrada de diario"


def test_private_posts_hidden_from_strangers(client):
    _, headers = _user(client, "profilePostsPrivateUser")
    client.post("/api/v1/posts/", headers=headers, data={"content": "privado", "is_public": "false"})

    resp = client.get("/api/v1/posts/by-user/profilePostsPrivateUser")
    assert resp.json() == []

    own_view = client.get("/api/v1/posts/by-user/profilePostsPrivateUser", headers=headers)
    assert len(own_view.json()) == 1


def test_posts_hidden_for_private_profile(client):
    _, headers = _user(client, "profilePostsPrivateProfile")
    client.put("/api/v1/users/me", headers=headers, data={"profile_public": "false"})
    client.post("/api/v1/posts/", headers=headers, data={"content": "hola"})

    resp = client.get("/api/v1/posts/by-user/profilePostsPrivateProfile")
    assert resp.status_code == 404

    own_view = client.get("/api/v1/posts/by-user/profilePostsPrivateProfile", headers=headers)
    assert own_view.status_code == 200
    assert len(own_view.json()) == 1
