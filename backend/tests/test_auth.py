"""Auth: register, login, invalid login, private-route rejection."""
from conftest import register_user, login_user, auth_headers, TEST_PASSWORD


def test_register_creates_user(client):
    resp = register_user(client, "alice")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["username"] == "alice"
    assert "id" in body
    assert "hashed_password" not in body  # never leak the hash


def test_register_rejects_invalid_invitation_code(client):
    resp = register_user(client, "bob", invitation_code="NOT-A-REAL-CODE")
    assert resp.status_code == 403


def test_register_rejects_duplicate_username(client):
    assert register_user(client, "carol").status_code == 200
    dup = register_user(client, "carol", email="carol2@example.com")
    assert dup.status_code == 400


def test_login_with_valid_credentials(client):
    register_user(client, "dave")
    resp = login_user(client, "dave")
    assert resp.status_code == 200, resp.text
    assert "access_token" in resp.json()


def test_login_with_wrong_password_is_rejected(client):
    register_user(client, "erin")
    resp = login_user(client, "erin", password="WrongPassword!")
    assert resp.status_code in (400, 401)


def test_login_unknown_user_is_rejected(client):
    resp = login_user(client, "nobody-registered")
    assert resp.status_code in (400, 401)


def test_me_endpoint_requires_token(client):
    resp = client.get("/api/v1/users/me")
    assert resp.status_code == 401


def test_me_endpoint_rejects_garbage_token(client):
    resp = client.get("/api/v1/users/me", headers=auth_headers("not-a-real-jwt"))
    assert resp.status_code == 401


def test_me_endpoint_works_with_valid_token(client):
    register_user(client, "frank")
    token = login_user(client, "frank").json()["access_token"]
    resp = client.get("/api/v1/users/me", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["username"] == "frank"


def test_health_endpoint_never_leaks_filesystem_paths(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert "version" in body
    assert "process_started_at" in body
    # Whatever fields it exposes, none should ever contain an absolute path.
    assert "C:\\" not in resp.text
    assert "/Users/" not in resp.text
    assert "/home/" not in resp.text
