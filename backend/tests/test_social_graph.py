"""Follow/unfollow, followers/following lists, and the online-now indicator —
the real system replacing the previously 100% fake "Amigos"/stats sidebar."""
from conftest import register_user, login_user, auth_headers


def _user(client, username):
    user = register_user(client, username).json()
    token = login_user(client, username).json()["access_token"]
    return user, auth_headers(token)


def test_follow_toggle(client):
    _, headers_a = _user(client, "followerA")
    register_user(client, "followedB")

    followed = client.post("/api/v1/users/followedB/follow", headers=headers_a).json()
    assert followed["is_following"] is True
    assert followed["follower_count"] == 1

    unfollowed = client.post("/api/v1/users/followedB/follow", headers=headers_a).json()
    assert unfollowed["is_following"] is False
    assert unfollowed["follower_count"] == 0


def test_cannot_follow_self(client):
    _, headers = _user(client, "selfFollower")
    resp = client.post("/api/v1/users/selfFollower/follow", headers=headers)
    assert resp.status_code == 400


def test_cannot_follow_nonexistent_user(client):
    _, headers = _user(client, "followerC")
    resp = client.post("/api/v1/users/does-not-exist/follow", headers=headers)
    assert resp.status_code == 404


def test_follower_and_following_counts(client):
    _, headers_a = _user(client, "countA")
    register_user(client, "countB")
    register_user(client, "countC")

    client.post("/api/v1/users/countB/follow", headers=headers_a)
    client.post("/api/v1/users/countC/follow", headers=headers_a)

    a_view = client.get("/api/v1/users/by-username/countA").json()
    assert a_view["following_count"] == 2

    b_view = client.get("/api/v1/users/by-username/countB").json()
    assert b_view["follower_count"] == 1


def test_followers_list_contents(client):
    _, headers_a = _user(client, "listFollowerA")
    _, headers_b = _user(client, "listFollowerB")
    register_user(client, "listFollowedC")

    client.post("/api/v1/users/listFollowedC/follow", headers=headers_a)
    client.post("/api/v1/users/listFollowedC/follow", headers=headers_b)

    followers = client.get("/api/v1/users/listFollowedC/followers").json()
    usernames = {f["username"] for f in followers}
    assert usernames == {"listFollowerA", "listFollowerB"}


def test_following_list_contents(client):
    _, headers_a = _user(client, "followingListerA")
    register_user(client, "followingTargetB")
    register_user(client, "followingTargetC")

    client.post("/api/v1/users/followingTargetB/follow", headers=headers_a)
    client.post("/api/v1/users/followingTargetC/follow", headers=headers_a)

    following = client.get("/api/v1/users/followingListerA/following").json()
    usernames = {f["username"] for f in following}
    assert usernames == {"followingTargetB", "followingTargetC"}


def test_is_following_reflects_viewer_not_global_state(client):
    _, headers_a = _user(client, "viewerA")
    _, headers_b = _user(client, "viewerB")
    register_user(client, "viewedC")

    client.post("/api/v1/users/viewedC/follow", headers=headers_a)

    seen_by_a = client.get("/api/v1/users/by-username/viewedC", headers=headers_a).json()
    seen_by_b = client.get("/api/v1/users/by-username/viewedC", headers=headers_b).json()
    seen_anonymously = client.get("/api/v1/users/by-username/viewedC").json()

    assert seen_by_a["is_following"] is True
    assert seen_by_b["is_following"] is False
    assert seen_anonymously["is_following"] is False


def test_user_is_online_right_after_authenticating(client):
    user, headers = _user(client, "onlineUser")
    seen = client.get("/api/v1/users/by-username/onlineUser", headers=headers).json()
    assert seen["is_online"] is True


def test_own_profile_response_includes_follow_counts(client):
    user, headers = _user(client, "ownCountsUser")
    register_user(client, "ownCountsTarget")
    client.post("/api/v1/users/ownCountsTarget/follow", headers=headers)

    me = client.get("/api/v1/users/me", headers=headers).json()
    assert me["following_count"] == 1
    assert me["follower_count"] == 0
