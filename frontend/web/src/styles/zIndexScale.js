// Documented z-index scale for Chaplin. This captures the tiers that already
// exist in the codebase today (verified via audit: no real overlap bugs were
// found — the floating-button cluster and the background layer are already
// internally consistent) rather than a redesign. New components should pick
// their z-index from here instead of inventing another ad-hoc number.
//
// Existing literals across the codebase have NOT been mass-migrated to these
// constants in this pass — that would touch many files for no functional gain
// and risks visual regressions without a full manual QA sweep. Treat this file
// as the reference new/changed code should follow.
export const Z_INDEX = {
  BACKGROUND: -1, // 3D/video background canvases (ChromedVortexThree, VideoBackground)
  BACKGROUND_CANVAS_WRAPPER: 0, // ChaplinAudioBackgroundCanvas's fixed wrapper div
  APP_CONTENT: 1, // route content wrapper (App.jsx)
  FEED_OVERLAY: 10, // in-card overlays (PostCard, etc.)
  STICKY_SECTION: 80, // sticky in-page elements (e.g. Feed's sticky header)
  BOTTOM_NAV: 85, // GlobalMobileDock
  STACKED_FEED: 1000, // SpiralFeed's per-card stacking (own local scale)
  UPLOADER_FAB: 1200, // FloatingUploaderButton
  FLOATING_CONTROLS_START: 4999, // FloatingPlayerButton (mini state)
  FLOATING_CONTROLS_END: 5005, // FloatingTopIcons — keep new floating controls inside this band
  TOAST: 9000, // reserved for future toast/notification layer
  MODAL: 9500, // reserved for future modal layer
  CRITICAL_OVERLAY: 9999 // top-of-stack scanline/noise overlays (Y2KTheme.jsx)
};
