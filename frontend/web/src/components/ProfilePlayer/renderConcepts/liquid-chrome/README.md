# Liquid Chrome — profile skin

Choose Liquid Chrome in the existing Settings appearance carousel and apply changes. It renders in the existing ProfilePlayer slot beneath the profile header. The Settings preview uses actual profile audio rather than no-op callbacks. The obsolete /dev/liquid-chrome route redirects to /profile.

The original concept PNG is preserved. liquid-chrome-transparent.png is an RGBA cutout with actual alpha, generated locally with explicit user permission. The backdrop and baked volume pointer are removed; the UI overlays the live display and controls. mode-button.png reuses the original transport button metal with the static glyph removed.

Controls: play/pause, previous/next, seeking (also before first play once metadata loads), volume by horizontal drag or arrow keys, and a mode button cycling ordered → repeat one → repeat list → shuffle. Repeat-one replays the ended track, repeat-list wraps to the first, shuffle skips the current track when possible, and ordered stops at the end. The volume pointer rotates over stationary glass material.

For the owner's Liquid Chrome, the saved personal playlist comes from /playlists/mine/personal, or the radio from /playlists/chaplin-radio according to the existing playback preference. Favorites filter that personal playlist. Visitors retain the existing public profile-playback endpoint contract. Empty lists and load/play errors are visible. No account settings or playlists are silently changed.

## Validation — 2026-09-10

verification/verify-profile.cjs exercises actual profile and Settings components in Edge with isolated API/auth fixtures and decoded PCM audio. Passed: initial metadata/seek, playback, pause, transport, volume, all four order modes including natural audio end events, Settings live preview, radio preference, and legacy-route redirect. Profile desktop/mobile screenshots and the live Settings carousel were captured; profile mobile and the button texture were visually inspected. No user credentials were used. The earlier real-radio check remains historical evidence; the revised private-account path was verified with isolated fixtures, not the user's login.

The cutout has transparent corners and retains the original 1774×887 canvas. See verification/profile-verification.json, profile-mobile.png, settings-live.png and build-v2.log. Local image-edit scripts are retained there.
