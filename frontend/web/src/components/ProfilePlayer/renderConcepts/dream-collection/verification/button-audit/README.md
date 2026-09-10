# Player control audit
All 16 registered skins passed browser checks using isolated account/API fixtures and real decoded PCM audio.
- Twelve Dream skins and Liquid Chrome: play/pause, previous/next, seeking, actual media-element volume (0, 1 and intermediate), real spectrum, LED, natural repeat-song, repeat-list, shuffle and ordered stop.
- Aqua Flow, AeroAmp and Y2K Bubblegum Gloss: all transport buttons, including duplicate mini controls; volume slider/popover; available favorites, queue selection, visualization, mute/unmute and profile listening controls.
- Fixed Settings carousel: authenticated previews now use ProfilePlayer for every skin. The three legacy previews previously received no-op handlers.
- Rechecked all legacy controls within Settings after the fix.
- Catalog and live preview/radio regression passed. Production and PWA build passed.
No private account data or live favorite/playlist writes were used. Audio routing was verified in the browser, not through physical speakers.
Scripts use the existing local Playwright installation and Edge. Run from this folder with Node; jobs.json is included. Results are in the attached JSON files.
