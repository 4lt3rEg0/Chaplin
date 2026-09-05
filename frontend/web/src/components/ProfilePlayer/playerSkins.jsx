import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Ear, SkipBack, SkipForward } from 'lucide-react';

/*
 * Selectable visual skins for the profile player. Each skin is a self-contained
 * presentational component sharing one prop contract. Five distinct visual
 * families, inspired by (never copying) real hardware/software language:
 *   retroLcd   -> monochrome pixel LCD (old MP3/MP4 digital displays)
 * portable   -> iPod-era portable player (clickwheel, small screen)
 * desktopApp -> classic desktop/browser embedded media player window
 * plugin     -> VST-style audio plugin rack unit (knobs, LEDs, VU meter)
 * hud3d      -> Blender/3D retro-futurist HUD (neon rings, depth, grid)
 * The ear icon is always rendered as part of that skin's own HUD language,
 * never as a generic button floating on top.
 */

const pulse = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

function TrackInfo({ track, mode, modeLabel, mono }) {
  if (!track) {
    return (
      <EmptyInfo $mono={mono}>
        {mode === 'favorites'
          ? 'Sin canciones favoritas todavía'
          : mode === 'radio'
            ? 'Radio Chaplin no tiene pistas activas'
            : 'Este perfil no tiene música pública'}
      </EmptyInfo>
    );
  }
  return (
    <InfoRow>
      {track.artwork_url && <Cover src={track.artwork_url} alt="" />}
      <InfoText>
        <TrackTitle title={track.title}>{track.title}</TrackTitle>
        <TrackSub>{modeLabel}{track.owner_username ? ` · @${track.owner_username}` : ''}</TrackSub>
      </InfoText>
    </InfoRow>
  );
}

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const Cover = styled.img`
  width: 28px;
  height: 28px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
`;

const InfoText = styled.div`
  min-width: 0;
  flex: 1;
`;

const EmptyInfo = styled.div`
  font-size: 12px;
  opacity: 0.65;
  font-family: ${({ $mono }) => ($mono ? "'Consolas', monospace" : 'inherit')};
`;

const TrackTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TrackSub = styled.div`
  font-size: 11px;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TransportBtn = styled.button`
  width: 26px;
  height: 26px;
  border-radius: 4px;
  border: 1px solid ${({ $border }) => $border || 'rgba(255,255,255,0.15)'};
  background: ${({ $bg }) => $bg || 'rgba(255,255,255,0.04)'};
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

/* ================= 1. RETRO LCD (monochrome pixel digital display) ================= */

const flicker = keyframes`
  0%, 100% { opacity: 1; }
  92% { opacity: 1; }
  93% { opacity: 0.82; }
  94% { opacity: 1; }
`;

const LcdShell = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 3px;
  background: #0d1a0d;
  border: 2px solid #1f3320;
  box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.6);
  color: #6fff8a;
  font-family: 'Consolas', 'VT323', monospace;
  letter-spacing: 0.06em;
  animation: ${flicker} 4s steps(1) infinite;

  @media (max-width: 480px) {
    grid-template-columns: 1fr auto;
    row-gap: 8px;
  }
`;

const LcdScreen = styled.div`
  min-width: 0;
  padding: 4px 8px;
  border: 1px solid #1f3320;
  background: #081108;
  text-transform: uppercase;

  @media (max-width: 480px) {
    grid-column: 1 / -1;
    order: 3;
  }
`;

const LcdBars = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 22px;
`;

const LcdBar = styled.span`
  width: 4px;
  background: #6fff8a;
  box-shadow: 0 0 4px #6fff8a;
  height: ${({ $h }) => $h}%;
  opacity: ${({ $active }) => ($active ? 1 : 0.25)};
  animation: ${({ $active }) => ($active ? css`${pulse} 700ms steps(4) infinite` : 'none')};
  animation-delay: ${({ $delay }) => $delay}ms;
`;

const LcdEarBtn = styled.button`
  width: 36px;
  height: 24px;
  border: 1px solid #6fff8a;
  background: ${({ $active }) => ($active ? '#123312' : '#081108')};
  color: #6fff8a;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 9px;
  text-transform: uppercase;
  gap: 3px;

  &:active { filter: brightness(1.3); }
`;

function RetroLcdSkin({ track, mode, modeLabel, isActive, isPlaying, hasQueue, onToggleEar, onPrev, onNext, ariaLabel }) {
  const bars = [30, 60, 90, 50, 75, 40];
  return (
    <LcdShell>
      <LcdBars>
        {bars.map((h, i) => <LcdBar key={i} $h={h} $active={isActive && isPlaying} $delay={i * 110} />)}
      </LcdBars>
      <LcdScreen>
        <TrackInfo track={track} mode={mode} modeLabel={modeLabel} mono />
      </LcdScreen>
      <div style={{ display: 'flex', gap: 4 }}>
        <TransportBtn $border="#1f3320" $bg="#081108" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior" style={{ color: '#6fff8a' }}>
          <SkipBack size={11} />
        </TransportBtn>
        <LcdEarBtn type="button" onClick={onToggleEar} $active={isActive} aria-label={ariaLabel} aria-pressed={isActive}>
          <Ear size={13} />
        </LcdEarBtn>
        <TransportBtn $border="#1f3320" $bg="#081108" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente" style={{ color: '#6fff8a' }}>
          <SkipForward size={11} />
        </TransportBtn>
      </div>
    </LcdShell>
  );
}

/* ================= 2. PORTABLE (iPod-era clickwheel player) ================= */

const PortableShell = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.surface || '#f4f4f4'};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);

  @media (max-width: 480px) {
    border-radius: 16px;
    padding: 10px 12px;
  }
`;

const PortableScreen = styled.div`
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.accentSoft || 'rgba(0,0,0,0.06)'};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const PortableWheel = styled.button`
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : (theme.colors.surfaceAlt || '#e2e2e2'))};
  color: ${({ $active, theme }) => ($active ? (theme.colors.onPrimary || '#fff') : theme.colors.text)};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 6px rgba(255, 255, 255, 0.25);

  &:active { transform: scale(0.95); }
`;

const PortableSideButton = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.8;
  flex-shrink: 0;

  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

function PortableSkin({ track, mode, modeLabel, isActive, hasQueue, onToggleEar, onPrev, onNext, ariaLabel }) {
  return (
    <PortableShell>
      <PortableScreen>
        <TrackInfo track={track} mode={mode} modeLabel={modeLabel} />
      </PortableScreen>
      <PortableSideButton type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
        <SkipBack size={14} />
      </PortableSideButton>
      <PortableWheel type="button" onClick={onToggleEar} $active={isActive} aria-label={ariaLabel} aria-pressed={isActive}>
        <Ear size={20} />
      </PortableWheel>
      <PortableSideButton type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
        <SkipForward size={14} />
      </PortableSideButton>
    </PortableShell>
  );
}

/* ================= 3. DESKTOP APP (classic embedded media-player window) ================= */

const DesktopShell = styled.div`
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #3a3f4a;
  background: #21242b;
  color: #d8dce2;
  font-family: 'Segoe UI', Tahoma, sans-serif;
`;

const DesktopTitleBar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: linear-gradient(180deg, #3a3f4a, #2b2e35);
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const DesktopDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $c }) => $c};
  display: inline-block;
`;

const DesktopBody = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
`;

const DesktopWave = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  height: 18px;
  margin-top: 4px;
`;

const DesktopWaveBar = styled.span`
  width: 2px;
  background: #5ec8ff;
  height: ${({ $h }) => $h}%;
  opacity: ${({ $active }) => ($active ? 0.9 : 0.3)};
`;

const DesktopEarBtn = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 4px;
  border: 1px solid #4a5060;
  background: ${({ $active }) => ($active ? '#3a6ea5' : '#2b2e35')};
  color: ${({ $active }) => ($active ? '#fff' : '#d8dce2')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
`;

function DesktopAppSkin({ track, mode, modeLabel, isActive, isPlaying, hasQueue, onToggleEar, onPrev, onNext, ariaLabel }) {
  const bars = [40, 70, 30, 90, 55, 20, 65, 45];
  return (
    <DesktopShell>
      <DesktopTitleBar>
        <DesktopDot $c="#ff5f57" />
        <DesktopDot $c="#febc2e" />
        <DesktopDot $c="#28c840" />
        <span style={{ marginLeft: 6, opacity: 0.75 }}>chaplin-player.exe</span>
      </DesktopTitleBar>
      <DesktopBody>
        <div style={{ minWidth: 0 }}>
          <TrackInfo track={track} mode={mode} modeLabel={modeLabel} />
          <DesktopWave>
            {bars.map((h, i) => <DesktopWaveBar key={i} $h={h} $active={isActive && isPlaying} />)}
          </DesktopWave>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <TransportBtn $border="#4a5060" $bg="#2b2e35" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
            <SkipBack size={12} />
          </TransportBtn>
          <DesktopEarBtn type="button" onClick={onToggleEar} $active={isActive} aria-label={ariaLabel} aria-pressed={isActive}>
            <Ear size={15} />
          </DesktopEarBtn>
          <TransportBtn $border="#4a5060" $bg="#2b2e35" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
            <SkipForward size={12} />
          </TransportBtn>
        </div>
      </DesktopBody>
    </DesktopShell>
  );
}

/* ================= 4. PLUGIN (VST-style audio plugin rack unit) ================= */

const PluginShell = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 10px;
  background: linear-gradient(180deg, #23262b 0%, #16181b 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 6px 18px rgba(0, 0, 0, 0.35);
  color: #e7e9ec;
  font-family: 'Consolas', 'SFMono-Regular', monospace;

  @media (max-width: 480px) {
    grid-template-columns: auto 1fr;
    row-gap: 10px;
  }
`;

const PluginMeter = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 28px;
`;

const PluginBar = styled.span`
  width: 3px;
  border-radius: 1px;
  background: ${({ $active, theme }) => ($active ? (theme.colors.primary || '#5ee6c8') : 'rgba(255,255,255,0.15)')};
  height: ${({ $h }) => $h}%;
  animation: ${({ $active }) => ($active ? css`${pulse} 900ms ease-in-out infinite` : 'none')};
  animation-delay: ${({ $delay }) => $delay}ms;
`;

const PluginKnob = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.2);
  position: relative;
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    top: 1px;
    left: 50%;
    width: 1.5px;
    height: 6px;
    background: ${({ theme }) => theme.colors.primary || '#5ee6c8'};
    transform: translateX(-50%);
  }
`;

const PluginEarButton = styled.button`
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 2px solid ${({ $active, theme }) => ($active ? (theme.colors.primary || '#5ee6c8') : 'rgba(255,255,255,0.25)')};
  background: ${({ $active, theme }) => ($active ? `${theme.colors.primary || '#5ee6c8'}22` : 'rgba(255,255,255,0.06)')};
  color: ${({ $active, theme }) => ($active ? (theme.colors.primary || '#5ee6c8') : '#e7e9ec')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 150ms ease, box-shadow 150ms ease;
  box-shadow: ${({ $active, theme }) => ($active ? `0 0 14px ${theme.colors.primary || '#5ee6c8'}55` : 'none')};

  &:active { transform: scale(0.94); }
`;

function PluginSkin({ track, mode, modeLabel, isActive, isPlaying, hasQueue, onToggleEar, onPrev, onNext, ariaLabel }) {
  const bars = [40, 70, 100, 65, 85, 50, 30];
  return (
    <PluginShell>
      <PluginMeter>
        {bars.map((h, i) => <PluginBar key={i} $h={h} $active={isActive && isPlaying} $delay={i * 90} />)}
      </PluginMeter>
      <div style={{ minWidth: 0 }}>
        <TrackInfo track={track} mode={mode} modeLabel={modeLabel} />
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <PluginKnob /><PluginKnob /><PluginKnob />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <TransportBtn onClick={onPrev} disabled={!hasQueue} aria-label="Anterior"><SkipBack size={12} /></TransportBtn>
        <PluginEarButton type="button" onClick={onToggleEar} $active={isActive} aria-label={ariaLabel} aria-pressed={isActive}>
          <Ear size={20} />
        </PluginEarButton>
        <TransportBtn onClick={onNext} disabled={!hasQueue} aria-label="Siguiente"><SkipForward size={12} /></TransportBtn>
      </div>
    </PluginShell>
  );
}

/* ================= 5. HUD 3D (Blender/3D retro-futurist) ================= */

const Hud3dShell = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  border-radius: 4px;
  background:
    linear-gradient(135deg, rgba(255, 0, 200, 0.08), rgba(0, 220, 255, 0.08)),
    #0a0a12;
  border: 1px solid rgba(0, 220, 255, 0.35);
  color: #d7f9ff;
  font-family: 'Consolas', 'SFMono-Regular', monospace;
  letter-spacing: 0.04em;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(0, 220, 255, 0.12) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 220, 255, 0.12) 1px, transparent 1px);
    background-size: 14px 14px;
    mask-image: linear-gradient(180deg, transparent, rgba(0,0,0,0.9) 60%, transparent);
    pointer-events: none;
  }
`;

const Hud3dInfo = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
  text-transform: uppercase;
  font-size: 11px;
`;

const Hud3dRing = styled.button`
  position: relative;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $active }) => ($active ? '#00e5ff' : '#8fb9c2')};

  &::before, &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1.5px solid transparent;
  }

  &::before {
    border-top-color: #ff00c8;
    border-right-color: #ff00c8;
    animation: ${({ $spin }) => ($spin ? css`${spin} 3s linear infinite` : 'none')};
  }

  &::after {
    inset: 6px;
    border-bottom-color: #00e5ff;
    border-left-color: #00e5ff;
    animation: ${({ $spin }) => ($spin ? css`${spin} 2.2s linear infinite reverse` : 'none')};
  }
`;

const Hud3dTransportBtn = styled.button`
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: 4px;
  border: 1px solid rgba(0, 220, 255, 0.3);
  background: rgba(0, 220, 255, 0.06);
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

function Hud3dSkin({ track, mode, modeLabel, isActive, isPlaying, hasQueue, onToggleEar, onPrev, onNext, ariaLabel }) {
  return (
    <Hud3dShell>
      <Hud3dTransportBtn onClick={onPrev} disabled={!hasQueue} aria-label="Anterior"><SkipBack size={12} /></Hud3dTransportBtn>
      <Hud3dInfo>
        <TrackInfo track={track} mode={mode} modeLabel={modeLabel} />
      </Hud3dInfo>
      <Hud3dRing type="button" onClick={onToggleEar} $active={isActive} $spin={isActive && isPlaying} aria-label={ariaLabel} aria-pressed={isActive}>
        <Ear size={18} />
      </Hud3dRing>
      <Hud3dTransportBtn onClick={onNext} disabled={!hasQueue} aria-label="Siguiente"><SkipForward size={12} /></Hud3dTransportBtn>
    </Hud3dShell>
  );
}

export const PLAYER_SKINS = {
  retroLcd: { id: 'retroLcd', label: 'LCD Retro', component: RetroLcdSkin },
  portable: { id: 'portable', label: 'Portátil', component: PortableSkin },
  desktopApp: { id: 'desktopApp', label: 'Escritorio', component: DesktopAppSkin },
  plugin: { id: 'plugin', label: 'Plugin VST', component: PluginSkin },
  hud3d: { id: 'hud3d', label: 'HUD 3D', component: Hud3dSkin }
};

export const PLAYER_SKIN_LIST = Object.values(PLAYER_SKINS);
export const DEFAULT_PLAYER_SKIN = 'plugin';
