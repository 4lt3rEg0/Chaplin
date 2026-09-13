"""Post edit/delete, post/comment likes, avatar upload, role, and DM
messaging — the feature set added after physical-phone QA on CHAPLIN MOBILE
ALPHA surfaced these as missing/broken."""
import io
from conftest import register_user, login_user, auth_headers

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


def _user(client, username):
    user = register_user(client, username).json()
    token = login_user(client, username).json()["access_token"]
    return user, auth_headers(token)


# ---------------------------------------------------------------------------
# Post edit / delete
# ---------------------------------------------------------------------------

def test_owner_can_edit_their_post(client):
    _, headers = _user(client, "editOwner")
    post = client.post("/api/v1/posts/", headers=headers, data={"content": "original"}).json()

    resp = client.put(f"/api/v1/posts/{post['id']}", headers=headers, data={"content": "edited"})
    assert resp.status_code == 200
    assert resp.json()["content"] == "edited"


def test_owner_can_replace_post_media(client):
    _, headers = _user(client, "editMediaOwner")
    files = {"file": ("first.png", io.BytesIO(PNG_BYTES), "image/png")}
    post = client.post("/api/v1/posts/", headers=headers, data={"content": "with photo"}, files=files).json()
    first_media_url = post["media_url"]
    assert first_media_url

    new_files = {"file": ("second.png", io.BytesIO(PNG_BYTES), "image/png")}
    resp = client.put(f"/api/v1/posts/{post['id']}", headers=headers, files=new_files)
    assert resp.status_code == 200
    assert resp.json()["media_url"] != first_media_url
    assert resp.json()["media_url"] is not None


def test_owner_can_remove_post_media(client):
    _, headers = _user(client, "editMediaOwner2")
    files = {"file": ("photo.png", io.BytesIO(PNG_BYTES), "image/png")}
    post = client.post("/api/v1/posts/", headers=headers, data={"content": "with photo"}, files=files).json()
    assert post["media_url"]

    resp = client.put(f"/api/v1/posts/{post['id']}", headers=headers, data={"remove_media": "true"})
    assert resp.status_code == 200
    assert resp.json()["media_url"] is None
    assert resp.json()["media_type"] is None


def test_non_owner_cannot_edit_post(client):
    _, headers_owner = _user(client, "editOwner2")
    post = client.post("/api/v1/posts/", headers=headers_owner, data={"content": "mine"}).json()

    _, headers_other = _user(client, "editStranger")
    resp = client.put(f"/api/v1/posts/{post['id']}", headers=headers_other, data={"content": "hijacked"})
    assert resp.status_code == 403


def test_owner_can_delete_their_post(client):
    _, headers = _user(client, "deleteOwner")
    post = client.post("/api/v1/posts/", headers=headers, data={"content": "temp"}).json()

    resp = client.delete(f"/api/v1/posts/{post['id']}", headers=headers)
    assert resp.status_code == 200
    assert client.get(f"/api/v1/posts/{post['id']}", headers=headers).status_code == 404


def test_non_owner_cannot_delete_post(client):
    _, headers_owner = _user(client, "deleteOwner2")
    post = client.post("/api/v1/posts/", headers=headers_owner, data={"content": "mine"}).json()

    _, headers_other = _user(client, "deleteStranger")
    resp = client.delete(f"/api/v1/posts/{post['id']}", headers=headers_other)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Post likes (real, persisted — replacing the old client-only fake likes)
# ---------------------------------------------------------------------------

def test_like_toggle_on_post(client):
    _, headers_owner = _user(client, "likeOwner")
    post = client.post("/api/v1/posts/", headers=headers_owner, data={"content": "likeable"}).json()
    assert post["like_count"] == 0
    assert post["liked_by_me"] is False

    _, headers_liker = _user(client, "liker1")
    liked = client.post(f"/api/v1/posts/{post['id']}/like", headers=headers_liker).json()
    assert liked["like_count"] == 1
    assert liked["liked_by_me"] is True

    unliked = client.post(f"/api/v1/posts/{post['id']}/like", headers=headers_liker).json()
    assert unliked["like_count"] == 0
    assert unliked["liked_by_me"] is False


def test_like_count_shared_across_viewers(client):
    _, headers_owner = _user(client, "likeOwner2")
    post = client.post("/api/v1/posts/", headers=headers_owner, data={"content": "popular"}).json()

    _, headers_a = _user(client, "likerA")
    _, headers_b = _user(client, "likerB")
    client.post(f"/api/v1/posts/{post['id']}/like", headers=headers_a)
    client.post(f"/api/v1/posts/{post['id']}/like", headers=headers_b)

    seen_by_owner = client.get(f"/api/v1/posts/{post['id']}", headers=headers_owner).json()
    assert seen_by_owner["like_count"] == 2
    assert seen_by_owner["liked_by_me"] is False  # owner never liked it themselves


def test_cannot_like_private_post_as_stranger(client):
    _, headers_owner = _user(client, "likePrivOwner")
    post = client.post("/api/v1/posts/", headers=headers_owner, data={"content": "secret", "is_public": "false"}).json()

    _, headers_stranger = _user(client, "likePrivStranger")
    resp = client.post(f"/api/v1/posts/{post['id']}/like", headers=headers_stranger)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Comment likes
# ---------------------------------------------------------------------------

def test_like_toggle_on_comment(client):
    _, headers_owner = _user(client, "commentLikeOwner")
    post = client.post("/api/v1/posts/", headers=headers_owner, data={"content": "post"}).json()
    comment = client.post(f"/api/v1/posts/{post['id']}/comments", headers=headers_owner, json={"content": "hi"}).json()
    assert comment["like_count"] == 0

    _, headers_liker = _user(client, "commentLiker")
    liked = client.post(f"/api/v1/comments/{comment['id']}/like", headers=headers_liker).json()
    assert liked["like_count"] == 1
    assert liked["liked_by_me"] is True

    unliked = client.post(f"/api/v1/comments/{comment['id']}/like", headers=headers_liker).json()
    assert unliked["like_count"] == 0


# ---------------------------------------------------------------------------
# Avatar upload
# ---------------------------------------------------------------------------

def test_avatar_upload_and_reflected_in_public_profile(client):
    user, headers = _user(client, "avatarUser")
    files = {"file": ("avatar.png", io.BytesIO(PNG_BYTES), "image/png")}
    resp = client.post("/api/v1/users/me/avatar", headers=headers, files=files)
    assert resp.status_code == 200
    avatar_url = resp.json()["avatar_url"]
    assert avatar_url and avatar_url.startswith("/media/")

    # Public lookup must also reflect it (avatar_url was added to PublicUserResponse).
    public = client.get(f"/api/v1/users/{user['id']}").json()
    assert public["avatar_url"] == avatar_url


def test_avatar_upload_rejects_non_image(client):
    _, headers = _user(client, "avatarBadUser")
    files = {"file": ("clip.mp4", io.BytesIO(b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 20), "video/mp4")}
    resp = client.post("/api/v1/users/me/avatar", headers=headers, files=files)
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Role (cosmetic user/artist)
# ---------------------------------------------------------------------------

def test_role_defaults_to_casual_and_can_switch_to_artist(client):
    # "casual" has been the real registration default since the role-selector
    # feature shipped (UserCreate.role default) - this test predates that and
    # was still asserting the old "user" default, silently broken since.
    user, headers = _user(client, "roleUser")
    assert user["role"] == "casual"

    resp = client.put("/api/v1/users/me", headers=headers, data={"role": "artist"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "artist"


def test_role_rejects_invalid_value(client):
    _, headers = _user(client, "roleUser2")
    resp = client.put("/api/v1/users/me", headers=headers, data={"role": "admin"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Direct messages
# ---------------------------------------------------------------------------

def test_start_conversation_and_send_message(client):
    _, headers_a = _user(client, "dmAlice")
    register_user(client, "dmBob")
    headers_b = auth_headers(login_user(client, "dmBob").json()["access_token"])

    convo = client.post("/api/v1/conversations/", headers=headers_a, json={"username": "dmBob"})
    assert convo.status_code == 200
    convo_id = convo.json()["id"]

    sent = client.post(f"/api/v1/conversations/{convo_id}/messages", headers=headers_a, json={"content": "hola"})
    assert sent.status_code == 200
    assert sent.json()["content"] == "hola"

    # Bob sees it too, from his side of the same conversation.
    bob_messages = client.get(f"/api/v1/conversations/{convo_id}/messages", headers=headers_b)
    assert bob_messages.status_code == 200
    assert len(bob_messages.json()) == 1
    assert bob_messages.json()[0]["content"] == "hola"


def test_starting_conversation_twice_reuses_same_conversation(client):
    _, headers_a = _user(client, "dmCarol")
    register_user(client, "dmDave")

    first = client.post("/api/v1/conversations/", headers=headers_a, json={"username": "dmDave"}).json()
    second = client.post("/api/v1/conversations/", headers=headers_a, json={"username": "dmDave"}).json()
    assert first["id"] == second["id"]


def test_conversation_started_from_either_side_is_the_same(client):
    _, headers_a = _user(client, "dmEve")
    register_user(client, "dmFrank")
    headers_b = auth_headers(login_user(client, "dmFrank").json()["access_token"])

    from_a = client.post("/api/v1/conversations/", headers=headers_a, json={"username": "dmFrank"}).json()
    from_b = client.post("/api/v1/conversations/", headers=headers_b, json={"username": "dmEve"}).json()
    assert from_a["id"] == from_b["id"]


def test_non_participant_cannot_read_conversation(client):
    _, headers_a = _user(client, "dmGrace")
    register_user(client, "dmHenry")
    convo = client.post("/api/v1/conversations/", headers=headers_a, json={"username": "dmHenry"}).json()

    _, headers_stranger = _user(client, "dmStranger")
    resp = client.get(f"/api/v1/conversations/{convo['id']}/messages", headers=headers_stranger)
    assert resp.status_code == 404


def test_non_participant_cannot_send_to_conversation(client):
    _, headers_a = _user(client, "dmIvy")
    register_user(client, "dmJack")
    convo = client.post("/api/v1/conversations/", headers=headers_a, json={"username": "dmJack"}).json()

    _, headers_stranger = _user(client, "dmStranger2")
    resp = client.post(f"/api/v1/conversations/{convo['id']}/messages", headers=headers_stranger, json={"content": "sneaky"})
    assert resp.status_code == 404


def test_conversation_list_shows_last_message_and_unread_count(client):
    _, headers_a = _user(client, "dmKate")
    register_user(client, "dmLeo")
    headers_b = auth_headers(login_user(client, "dmLeo").json()["access_token"])

    convo = client.post("/api/v1/conversations/", headers=headers_a, json={"username": "dmLeo"}).json()
    client.post(f"/api/v1/conversations/{convo['id']}/messages", headers=headers_a, json={"content": "primero"})
    client.post(f"/api/v1/conversations/{convo['id']}/messages", headers=headers_a, json={"content": "segundo"})

    leo_list = client.get("/api/v1/conversations/", headers=headers_b).json()
    assert len(leo_list) == 1
    assert leo_list[0]["last_message"] == "segundo"
    assert leo_list[0]["unread_count"] == 2

    # Reading the messages marks them read — unread count resets for Leo.
    client.get(f"/api/v1/conversations/{convo['id']}/messages", headers=headers_b)
    leo_list_after = client.get("/api/v1/conversations/", headers=headers_b).json()
    assert leo_list_after[0]["unread_count"] == 0


def test_cannot_message_yourself(client):
    _, headers = _user(client, "dmSelf")
    resp = client.post("/api/v1/conversations/", headers=headers, json={"username": "dmSelf"})
    assert resp.status_code == 400


def test_empty_message_rejected(client):
    _, headers_a = _user(client, "dmMia")
    register_user(client, "dmNoah")
    convo = client.post("/api/v1/conversations/", headers=headers_a, json={"username": "dmNoah"}).json()

    resp = client.post(f"/api/v1/conversations/{convo['id']}/messages", headers=headers_a, json={"content": "   "})
    assert resp.status_code == 422
