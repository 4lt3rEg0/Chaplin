"""Profile visibility and the public-environment privacy whitelist.

The most important test here is `test_public_environment_never_leaks_unknown_keys`:
it plants a fake private key inside a user's raw `preferences` blob and asserts
the public environment endpoint never returns it — this is the concrete
regression test for the privacy boundary described in the product directives.
"""
import json
from conftest import register_user, login_user, auth_headers


def test_public_profile_is_visible_by_id_and_username(client):
    user = register_user(client, "pat").json()

    by_id = client.get(f"/api/v1/users/{user['id']}")
    assert by_id.status_code == 200
    assert by_id.json()["username"] == "pat"

    by_username = client.get("/api/v1/users/by-username/pat")
    assert by_username.status_code == 200
    assert by_username.json()["id"] == user["id"]


def test_private_profile_is_hidden_from_others(client):
    user = register_user(client, "quinn").json()
    token = login_user(client, "quinn").json()["access_token"]

    updated = client.put(
        "/api/v1/users/me",
        headers=auth_headers(token),
        data={"profile_public": "false"}
    )
    assert updated.status_code == 200
    assert updated.json()["profile_public"] is False

    by_id = client.get(f"/api/v1/users/{user['id']}")
    assert by_id.status_code == 404

    by_username = client.get("/api/v1/users/by-username/quinn")
    assert by_username.status_code == 404


def test_unknown_user_returns_404_not_a_crash(client):
    assert client.get("/api/v1/users/999999").status_code == 404
    assert client.get("/api/v1/users/by-username/does-not-exist").status_code == 404


def test_public_environment_never_leaks_unknown_keys(client):
    user = register_user(client, "riley").json()
    token = login_user(client, "riley").json()["access_token"]

    # Plant a fake "private" key directly in the raw preferences blob, exactly
    # as if some future feature (volume, draft state, admin flag...) added it
    # without ever intending it to be public.
    secret_prefs = json.dumps({
        "base_theme": "cyberpunk",
        "accent_color": "#ff00aa",
        "privateTestSecret": "THIS_MUST_NEVER_LEAK",
        "adminFlag": True,
        "deviceId": "should-stay-private"
    })
    saved = client.put(
        "/api/v1/users/me",
        headers=auth_headers(token),
        data={"preferences": secret_prefs}
    )
    assert saved.status_code == 200

    env = client.get(f"/api/v1/users/{user['id']}/environment")
    assert env.status_code == 200
    raw_text = env.text

    assert "privateTestSecret" not in raw_text
    assert "THIS_MUST_NEVER_LEAK" not in raw_text
    assert "adminFlag" not in raw_text
    assert "deviceId" not in raw_text
    assert "should-stay-private" not in raw_text

    # But the fields that ARE meant to be public still come through correctly.
    body = env.json()
    assert body["theme"]["baseTheme"] == "cyberpunk"
    assert body["theme"]["accent"] == "#ff00aa"


def test_environment_endpoint_never_returns_raw_preferences_field(client):
    user = register_user(client, "sam").json()
    token = login_user(client, "sam").json()["access_token"]
    client.put(
        "/api/v1/users/me",
        headers=auth_headers(token),
        data={"preferences": json.dumps({"base_theme": "y2k"})}
    )

    env = client.get(f"/api/v1/users/{user['id']}/environment")
    assert env.status_code == 200
    body = env.json()
    # The response shape must be the whitelisted {theme, background} DTO —
    # never the raw preferences dict itself.
    assert set(body.keys()) == {"theme", "background"}


def test_environment_endpoint_hidden_for_private_profile(client):
    user = register_user(client, "taylor").json()
    token = login_user(client, "taylor").json()["access_token"]
    client.put("/api/v1/users/me", headers=auth_headers(token), data={"profile_public": "false"})

    env = client.get(f"/api/v1/users/{user['id']}/environment")
    assert env.status_code == 404


def test_full_visual_identity_roundtrip_exposes_only_the_whitelist(client):
    """CHAPLIN MOBILE ALPHA, Prioridad 9 — User B configures the complete
    visual identity surface (theme/material/HUD/layout/fonts/shape/density/
    ornament/secondary accent/surface colors + background/vortex config).
    A visiting user must see exactly that identity, and a planted private
    secret sitting alongside it in the same preferences blob must never leak.
    """
    user_b = register_user(client, "identityB").json()
    token_b = login_user(client, "identityB").json()["access_token"]

    full_identity = {
        "base_theme": "cyberpunk",
        "theme_variant": "chrome",
        "accent_color": "#ff00aa",
        "secondary_accent": "#00ffee",
        "animated_background": True,
        "layout_background": "#0a0a12",
        "layout_border": "#333344",
        "layout_text": "#f5f5ff",
        "font_primary": "Orbitron",
        "font_secondary": "Inter",
        "font_ui": "Rajdhani",
        "font_mono": "JetBrains Mono",
        "layout_opacity": 0.88,
        "material_id": "chrome-brushed",
        "hud_grammar_id": "hud-tactical",
        "layout_composition_id": "shrine",
        "typography_profile_id": "display-heavy",
        "shape_language_id": "faceted",
        "visual_density": "compact",
        "ornament_level": 3,
        "material_intensity": 0.65,
        "vortex_background_style": "nightVisionLandscape",
        "vortex_finish_type": "chrome",
        "vortex_color": "#e5e5e5",
        "vortex_visualizer_preset": "chaplin_hyper",
        "vortex_reactivity": 1.2,
        "vortex_deform_intensity": 0.9,
        "vortex_motion_intensity": 1.1,
        "vortex_bass_boost": 1.3,
        "vortex_treble_boost": 0.7,
        # Planted secrets that must never reach the public response.
        "privateTestSecret": "THIS_MUST_NEVER_LEAK",
        "deviceId": "should-stay-private",
        "lastOpenedEditorTab": "materials"
    }
    saved = client.put(
        "/api/v1/users/me",
        headers=auth_headers(token_b),
        data={"preferences": json.dumps(full_identity)}
    )
    assert saved.status_code == 200

    env = client.get(f"/api/v1/users/{user_b['id']}/environment")
    assert env.status_code == 200
    raw_text = env.text

    for secret in ("privateTestSecret", "THIS_MUST_NEVER_LEAK", "deviceId", "should-stay-private", "lastOpenedEditorTab"):
        assert secret not in raw_text

    body = env.json()
    theme = body["theme"]
    background = body["background"]

    assert theme["baseTheme"] == "cyberpunk"
    assert theme["variant"] == "chrome"
    assert theme["accent"] == "#ff00aa"
    assert theme["secondaryAccent"] == "#00ffee"
    assert theme["animatedBackground"] is True
    assert theme["surfaceBackground"] == "#0a0a12"
    assert theme["surfaceBorder"] == "#333344"
    assert theme["surfaceText"] == "#f5f5ff"
    assert theme["fontDisplay"] == "Orbitron"
    assert theme["fontBody"] == "Inter"
    assert theme["fontUI"] == "Rajdhani"
    assert theme["fontMono"] == "JetBrains Mono"
    assert theme["materialId"] == "chrome-brushed"
    assert theme["hudId"] == "hud-tactical"
    assert theme["layoutId"] == "shrine"
    assert theme["typographyId"] == "display-heavy"
    assert theme["shapeId"] == "faceted"
    assert theme["density"] == "compact"
    assert theme["ornament"] == 3
    assert theme["materialIntensity"] == 0.65
    assert background["style"] == "nightVisionLandscape"
    assert background["finish"] == "chrome"
    assert background["color"] == "#e5e5e5"
    assert background["visualizerPreset"] == "chaplin_hyper"


def test_public_user_lookup_never_leaks_email_or_raw_preferences(client):
    """GET /users/{id} and /users/by-username/{username} are unauthenticated —
    any visitor can call them for any public profile. They must never return
    the owner's email or their raw preferences blob, even though UserResponse
    (used by the authenticated /users/me) legitimately includes both.
    """
    user = register_user(client, "morgan", email="morgan-private@example.com").json()
    token = login_user(client, "morgan").json()["access_token"]
    client.put(
        "/api/v1/users/me",
        headers=auth_headers(token),
        data={"preferences": json.dumps({"base_theme": "y2k", "deviceId": "secret-device-123"})}
    )

    for resp in (
        client.get(f"/api/v1/users/{user['id']}"),
        client.get("/api/v1/users/by-username/morgan"),
    ):
        assert resp.status_code == 200
        assert "morgan-private@example.com" not in resp.text
        assert "secret-device-123" not in resp.text
        assert "preferences" not in resp.json()
        assert "email" not in resp.json()

    # Meanwhile the owner's own authenticated view still has both — this is
    # not a regression on /users/me, only on the two public lookups above.
    me = client.get("/api/v1/users/me", headers=auth_headers(token))
    assert "morgan-private@example.com" in me.text
    assert "secret-device-123" in me.text
