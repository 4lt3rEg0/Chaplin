import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { PLAYER_SKINS, resolvePlayerPalette } from '../../components/ProfilePlayer/reconstructed';
import { AQUA_WAVE_BODY_PATH, AQUA_WAVE_HIGHLIGHT_PATHS } from '../../components/ProfilePlayer/reconstructed/aquaFlow/waveGeometry';
import bubblegumGlossManifest from '../../assets/profilePlayers/bubblegum-gloss/manifest.json';

// Per-skin measured contour geometry for CONTOURS mode (reference vs.
// implementation). Circles are the same Hough-measured button geometry used
// in the skin's own SVG (tools/player-reconstruction/scripts/
// extract_key_geometry.py), kept here too so this mode can draw them
// without importing skin internals. `rects` (asset-based players) come
// straight from the player's own manifest.json layer/control placements —
// real extraction coordinates, not re-measured.
const CONTOUR_GEOMETRY = {
  'aqua-flow': {
    paths: [AQUA_WAVE_BODY_PATH, ...AQUA_WAVE_HIGHLIGHT_PATHS],
    circles: [
      [66.6, 235.8, 19.3], [123, 238.2, 18], [174.6, 237, 19.3],
      [82.2, 298.2, 32.7], [150.6, 299.4, 31.4], [222.6, 298.2, 31.2],
    ],
  },
  'bubblegum-gloss': {
    rects: [
      ...bubblegumGlossManifest.layers.map((l) => [l.x, l.y, l.width, l.height]),
      ...Object.values(bubblegumGlossManifest.controls).map((c) => [c.x, c.y, c.width, c.height]),
      [bubblegumGlossManifest.slider.track.x, bubblegumGlossManifest.slider.track.y, bubblegumGlossManifest.slider.track.width, bubblegumGlossManifest.slider.track.height],
      [bubblegumGlossManifest.slider.thumb.x, bubblegumGlossManifest.slider.thumb.y, bubblegumGlossManifest.slider.thumb.width, bubblegumGlossManifest.slider.thumb.height],
      [bubblegumGlossManifest.screen.x, bubblegumGlossManifest.screen.y, bubblegumGlossManifest.screen.width, bubblegumGlossManifest.screen.height],
    ],
  },
};

/*
 * Dev-only visual regression tool ("Player Lab"). Renders one skin isolated,
 * at its canonical reference size (no page chrome, no profile, no other
 * players), with Reference / Live / Overlay / Diff / Blink modes so a
 * reconstruction can be checked pixel-region-by-pixel-region against the
 * sketch it's tracing. Only mounted behind import.meta.env.DEV in App.jsx —
 * never shipped to real users.
 */

const DEMO_TRACK = { id: 'demo', title: 'Aqua Flow', owner_username: 'chaplin_lab', is_favorited: false };

const Page = styled.div`
  min-height: 100vh;
  background: #1a1a1a;
  color: #eee;
  font-family: 'Segoe UI', system-ui, sans-serif;
  padding: 24px;
`;

const Toolbar = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 20px;
  padding: 10px 14px;
  background: #262626;
  border-radius: 8px;
`;

const ModeBtn = styled.button`
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid ${({ $active }) => ($active ? '#5ad4f5' : '#444')};
  background: ${({ $active }) => ($active ? '#0d3f5e' : '#333')};
  color: #eee;
  cursor: pointer;
  font-size: 13px;
`;

const Stage = styled.div`
  position: relative;
  width: ${({ $w }) => $w}px;
  height: ${({ $h }) => $h}px;
  background: #000000;

  [data-skin-root] {
    max-width: none !important;
    width: ${({ $w }) => $w}px !important;
    height: ${({ $h }) => $h}px !important;
    aspect-ratio: unset !important;
  }
`;

const RefImg = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: ${({ $opacity }) => $opacity};
  pointer-events: none;
`;

const Info = styled.pre`
  margin-top: 16px;
  font-size: 12px;
  color: #999;
  white-space: pre-wrap;
`;

export default function PlayerLab() {
  const { skinId } = useParams();
  const skin = PLAYER_SKINS[skinId];
  const [mode, setMode] = useState('live');
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [blinkOn, setBlinkOn] = useState(true);
  const [demoState, setDemoState] = useState({ isPlaying: true, isActive: true, isFavorited: false, currentTime: 34, duration: 214, volume: 0.7 });

  React.useEffect(() => {
    if (mode !== 'blink') return undefined;
    const t = setInterval(() => setBlinkOn((v) => !v), 600);
    return () => clearInterval(t);
  }, [mode]);

  if (!skin) {
    return <Page>No player skin registered with id "{skinId}". Known ids: {Object.keys(PLAYER_SKINS).join(', ') || '(none)'}</Page>;
  }

  const SkinComponent = skin.component;
  const palette = resolvePlayerPalette(skin.id, 'default', {}, {});
  const refSrc = skin.referenceImage;
  const w = skin.referenceWidth || Math.round((skin.maxWidth || 480));
  const h = skin.referenceHeight || Math.round(w / (skin.aspectRatio || 1.7));

  return (
    <Page>
      <h2 style={{ marginTop: 0 }}>Player Lab — {skin.label} <span style={{ color: '#666', fontSize: 13 }}>({skinId})</span></h2>
      <Toolbar>
        {['live', 'reference', 'overlay', 'contours', 'blink'].map((m) => (
          <ModeBtn key={m} type="button" $active={mode === m} onClick={() => setMode(m)}>{m.toUpperCase()}</ModeBtn>
        ))}
        {mode === 'overlay' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            reference opacity
            <input type="range" min="0" max="100" value={overlayOpacity} onChange={(e) => setOverlayOpacity(Number(e.target.value))} />
            {overlayOpacity}%
          </label>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888' }}>{w}×{h}px canonical</span>
      </Toolbar>

      <Toolbar>
        <button type="button" onClick={() => setDemoState((s) => ({ ...s, isPlaying: !s.isPlaying, isActive: true }))}>
          {demoState.isPlaying ? 'Pause' : 'Play'} (demo)
        </button>
        <button type="button" onClick={() => setDemoState((s) => ({ ...s, isFavorited: !s.isFavorited }))}>
          Toggle favorite ({String(demoState.isFavorited)})
        </button>
        <button type="button" onClick={() => setDemoState((s) => ({ ...s, isActive: !s.isActive }))}>
          Toggle Profile Listen ({String(demoState.isActive)})
        </button>
      </Toolbar>

      <Stage $w={w} $h={h} data-player-lab-stage>
        {(mode === 'live' || mode === 'overlay' || (mode === 'blink' && blinkOn)) && (
          <SkinComponent
            manifest={skin}
            avatarUrl={null}
            track={DEMO_TRACK}
            mode="all"
            modeLabel="Vista previa"
            isActive={demoState.isActive}
            isPlaying={demoState.isPlaying}
            hasQueue
            onToggleEar={() => setDemoState((s) => ({ ...s, isActive: !s.isActive }))}
            onTogglePlay={() => setDemoState((s) => ({ ...s, isPlaying: !s.isPlaying, isActive: true }))}
            onPrev={() => {}}
            onNext={() => {}}
            ariaLabel="Profile listen"
            currentTime={demoState.currentTime}
            duration={demoState.duration}
            volume={demoState.volume}
            onVolumeChange={(v) => setDemoState((s) => ({ ...s, volume: v }))}
            onSeek={(t) => setDemoState((s) => ({ ...s, currentTime: t }))}
            isFavorited={demoState.isFavorited}
            canFavorite
            onToggleFavorite={() => setDemoState((s) => ({ ...s, isFavorited: !s.isFavorited }))}
            queue={[DEMO_TRACK]}
            onSelectTrack={() => {}}
            palette={palette}
          />
        )}
        {(mode === 'reference' || (mode === 'blink' && !blinkOn)) && (
          <RefImg src={refSrc} alt="reference" $opacity={1} />
        )}
        {mode === 'overlay' && (
          <RefImg src={refSrc} alt="reference overlay" $opacity={overlayOpacity / 100} />
        )}
        {mode === 'contours' && (
          <>
            <RefImg src={refSrc} alt="reference" $opacity={1} />
            {CONTOUR_GEOMETRY[skinId] && (
              <svg
                viewBox={`0 0 ${skin.referenceWidth || w} ${skin.referenceHeight || h}`}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              >
                {(CONTOUR_GEOMETRY[skinId].paths || []).map((d, i) => (
                  <path key={i} d={d} fill="none" stroke={i === 0 ? '#00ff6a' : '#ff2ec4'} strokeWidth="1.5" />
                ))}
                {(CONTOUR_GEOMETRY[skinId].circles || []).map(([cx, cy, r], i) => (
                  <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke="#ffe600" strokeWidth="1.5" />
                ))}
                {(CONTOUR_GEOMETRY[skinId].rects || []).map(([x, y, rw, rh], i) => (
                  <rect key={i} x={x} y={y} width={rw} height={rh} fill="none" stroke="#00e5ff" strokeWidth="1.5" />
                ))}
              </svg>
            )}
          </>
        )}
      </Stage>

      <Info>{JSON.stringify({ id: skin.id, sourceFile: skin.sourceFile, sourceCell: skin.sourceCell, defaultPalette: skin.defaultPalette }, null, 2)}</Info>
    </Page>
  );
}
