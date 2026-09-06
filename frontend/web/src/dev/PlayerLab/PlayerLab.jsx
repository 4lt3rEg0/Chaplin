import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { PLAYER_SKINS, resolvePlayerPalette } from '../../components/ProfilePlayer/reconstructed';

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
        {['live', 'reference', 'overlay', 'blink'].map((m) => (
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
      </Stage>

      <Info>{JSON.stringify({ id: skin.id, sourceFile: skin.sourceFile, sourceCell: skin.sourceCell, defaultPalette: skin.defaultPalette }, null, 2)}</Info>
    </Page>
  );
}
