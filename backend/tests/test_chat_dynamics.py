"""Messenger-style chat dynamics: emoji reactions on messages and the
"nudge"/buzz that shakes+vibrates the other side's chat window."""
from conftest import register_user, login_user, auth_headers


def _user(client, username):
    user = register_user(client, username).json()
    token = login_user(client, username).json()["access_token"]
    return user, auth_headers(token)


def _start_conversation(client, headers_a, username_b):
    return client.post("/api/v1/conversations/", headers=headers_a, json={"username": username_b}).json()


def test_react_to_message_adds_reaction(client):
    _, headers_a = _user(client, "reactSenderA")
    _, headers_b = _user(client, "reactSenderB")
    convo = _start_conversation(client, headers_a, "reactSenderB")
    message = client.post(
        f"/api/v1/conversations/{convo['id']}/messages", headers=headers_a, json={"content": "hola"}
    ).json()

    resp = client.post(f"/api/v1/messages/{message['id']}/react", headers=headers_b, json={"emoji": "❤️"})
    assert resp.status_code == 200
    reactions = resp.json()["reactions"]
    assert reactions == [{"emoji": "❤️", "count": 1, "reacted_by_me": True}]


def test_reacting_twice_with_same_emoji_removes_it(client):
    _, headers_a = _user(client, "reactToggleA")
    _, headers_b = _user(client, "reactToggleB")
    convo = _start_conversation(client, headers_a, "reactToggleB")
    message = client.post(
        f"/api/v1/conversations/{convo['id']}/messages", headers=headers_a, json={"content": "hola"}
    ).json()

    client.post(f"/api/v1/messages/{message['id']}/react", headers=headers_b, json={"emoji": "😂"})
    resp = client.post(f"/api/v1/messages/{message['id']}/react", headers=headers_b, json={"emoji": "😂"})
    assert resp.json()["reactions"] == []


def test_changing_reaction_emoji_replaces_previous(client):
    _, headers_a = _user(client, "reactChangeA")
    _, headers_b = _user(client, "reactChangeB")
    convo = _start_conversation(client, headers_a, "reactChangeB")
    message = client.post(
        f"/api/v1/conversations/{convo['id']}/messages", headers=headers_a, json={"content": "hola"}
    ).json()

    client.post(f"/api/v1/messages/{message['id']}/react", headers=headers_b, json={"emoji": "😂"})
    resp = client.post(f"/api/v1/messages/{message['id']}/react", headers=headers_b, json={"emoji": "🔥"})
    assert resp.json()["reactions"] == [{"emoji": "🔥", "count": 1, "reacted_by_me": True}]


def test_non_participant_cannot_react(client):
    _, headers_a = _user(client, "reactPrivateA")
    _, headers_b = _user(client, "reactPrivateB")
    _, headers_c = _user(client, "reactPrivateC")
    convo = _start_conversation(client, headers_a, "reactPrivateB")
    message = client.post(
        f"/api/v1/conversations/{convo['id']}/messages", headers=headers_a, json={"content": "hola"}
    ).json()

    resp = client.post(f"/api/v1/messages/{message['id']}/react", headers=headers_c, json={"emoji": "😂"})
    assert resp.status_code == 404


def test_nudge_creates_a_nudge_type_message(client):
    _, headers_a = _user(client, "nudgeSenderA")
    _, headers_b = _user(client, "nudgeSenderB")
    convo = _start_conversation(client, headers_a, "nudgeSenderB")

    resp = client.post(f"/api/v1/conversations/{convo['id']}/nudge", headers=headers_a)
    assert resp.status_code == 200
    assert resp.json()["message_type"] == "nudge"

    messages = client.get(f"/api/v1/conversations/{convo['id']}/messages", headers=headers_b).json()
    assert any(m["message_type"] == "nudge" for m in messages)


def test_nudge_is_rate_limited(client):
    _, headers_a = _user(client, "nudgeRateA")
    _, headers_b = _user(client, "nudgeRateB")
    convo = _start_conversation(client, headers_a, "nudgeRateB")

    first = client.post(f"/api/v1/conversations/{convo['id']}/nudge", headers=headers_a)
    assert first.status_code == 200
    second = client.post(f"/api/v1/conversations/{convo['id']}/nudge", headers=headers_a)
    assert second.status_code == 429


def test_non_participant_cannot_nudge(client):
    _, headers_a = _user(client, "nudgePrivateA")
    _, headers_b = _user(client, "nudgePrivateB")
    _, headers_c = _user(client, "nudgePrivateC")
    convo = _start_conversation(client, headers_a, "nudgePrivateB")

    resp = client.post(f"/api/v1/conversations/{convo['id']}/nudge", headers=headers_c)
    assert resp.status_code == 404
