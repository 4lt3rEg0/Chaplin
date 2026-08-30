"""Presence status (online/away/invisible) — replaces the hardcoded
"Activo en Chaplin" badge and the real profile stats (followers/following/posts)."""
from conftest import register_user, login_user, auth_headers


def _user(client, username):
    user = register_user(client, username).json()
    token = login_user(client, username).json()["access_token"]
    return user, auth_headers(token)


def test_freshly_authenticated_user_shows_online(client):
    _, headers = _user(client, "presenceOnlineUser")
    me = client.get("/api/v1/users/me", headers=headers).json()
    assert me["status"] == "online"


def test_user_can_set_away_status(client):
    _, headers = _user(client, "presenceAwayUser")
    resp = client.put("/api/v1/users/me", headers=headers, data={"presence_status": "away"})
    assert resp.json()["status"] == "away"

    seen = client.get("/api/v1/users/by-username/presenceAwayUser").json()
    assert seen["status"] == "away"


def test_user_can_go_invisible(client):
    _, headers = _user(client, "presenceInvisibleUser")
    client.put("/api/v1/users/me", headers=headers, data={"presence_status": "invisible"})

    seen = client.get("/api/v1/users/by-username/presenceInvisibleUser").json()
    assert seen["status"] == "offline"
    assert seen["is_online"] is False


def test_invalid_presence_status_rejected(client):
    _, headers = _user(client, "presenceInvalidUser")
    resp = client.put("/api/v1/users/me", headers=headers, data={"presence_status": "banana"})
    assert resp.status_code == 422


def test_post_count_reflects_real_posts(client):
    _, headers = _user(client, "postCountUser")
    client.post("/api/v1/posts/", headers=headers, data={"content": "uno"})
    client.post("/api/v1/posts/", headers=headers, data={"content": "dos"})

    me = client.get("/api/v1/users/me", headers=headers).json()
    assert me["post_count"] == 2


def test_public_post_count_excludes_private_posts(client):
    _, headers = _user(client, "postCountPublicUser")
    client.post("/api/v1/posts/", headers=headers, data={"content": "publico"})
    client.post("/api/v1/posts/", headers=headers, data={"content": "privado", "is_public": "false"})

    seen = client.get("/api/v1/users/by-username/postCountPublicUser").json()
    assert seen["post_count"] == 1
