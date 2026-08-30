"""User search — the missing "buscar/agregar usuarios" feature backing the
social discovery flow (find someone by username or name, then follow them)."""
from conftest import register_user, login_user, auth_headers


def test_search_matches_username_substring(client):
    register_user(client, "searchTargetNova")
    resp = client.get("/api/v1/users/search?q=Nova")
    assert resp.status_code == 200
    usernames = {u["username"] for u in resp.json()}
    assert "searchTargetNova" in usernames


def test_search_matches_first_or_last_name(client):
    register_user(client, "searchByNameUser")
    resp = client.get("/api/v1/users/search?q=Test")
    usernames = {u["username"] for u in resp.json()}
    assert "searchByNameUser" in usernames


def test_search_excludes_private_profiles(client):
    token = login_user(client, register_user(client, "searchPrivateUser").json()["username"]).json()["access_token"]
    headers = auth_headers(token)
    client.put("/api/v1/users/me", data={"profile_public": "false"}, headers=headers)

    resp = client.get("/api/v1/users/search?q=searchPrivateUser")
    usernames = {u["username"] for u in resp.json()}
    assert "searchPrivateUser" not in usernames


def test_search_excludes_the_requesting_user_themselves(client):
    user = register_user(client, "searchSelfExclude").json()
    token = login_user(client, "searchSelfExclude").json()["access_token"]
    headers = auth_headers(token)

    resp = client.get("/api/v1/users/search?q=searchSelfExclude", headers=headers)
    usernames = {u["username"] for u in resp.json()}
    assert "searchSelfExclude" not in usernames


def test_search_is_case_insensitive(client):
    register_user(client, "caseSensitiveNameXyz")
    resp = client.get("/api/v1/users/search?q=CASESENSITIVE")
    usernames = {u["username"] for u in resp.json()}
    assert "caseSensitiveNameXyz" in usernames


def test_search_requires_query_param(client):
    resp = client.get("/api/v1/users/search")
    assert resp.status_code == 422


def test_search_result_includes_follow_state(client):
    register_user(client, "searchFollowStateB")
    token = login_user(client, register_user(client, "searchFollowStateA").json()["username"]).json()["access_token"]
    headers = auth_headers(token)
    client.post("/api/v1/users/searchFollowStateB/follow", headers=headers)

    resp = client.get("/api/v1/users/search?q=searchFollowStateB", headers=headers)
    match = next(u for u in resp.json() if u["username"] == "searchFollowStateB")
    assert match["is_following"] is True
