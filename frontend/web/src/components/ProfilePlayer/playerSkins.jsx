import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Ear, SkipBack, SkipForward } from 'lucide-react';

/*
 * Selectable visual skins for the profile player. Each skin is a self-contained
 * presentational component — it receives the same prop contract and renders
 * transport + the "ear" activation control however it wants. Adding a new skin
 * later means adding one component + one registry entry, nothing else changes.
 */

const pulse = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

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

function TrackInfo({ track, mode, modeLabel }) {
  if (!track) {
    return (
      <EmptyInfo>
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

const EmptyInfo = styled.div`
  font-size: 12px;
  opacity: 0.65;
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

/* ================= Skin 1: DAW console (audio-plugin rack unit) ================= */

const DawShell = styled.div`
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

const DawMeter = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 28px;
`;

const DawBar = styled.span`
  width: 3px;
  border-radius: 1px;
  background: ${({ $active, theme }) => ($active ? (theme.colors.primary || '#5ee6c8') : 'rgba(255,255,255,0.15)')};
  height: ${({ $h }) => $h}%;
  animation: ${({ $active }) => ($active ? css`${pulse} 900ms ease-in-out infinite` : 'none')};
  animation-delay: ${({ $delay }) => $delay}ms;
`;

const DawInfo = styled.div`
  min-width: 0;
`;

const DawEarButton = styled.button`
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

  &:active {
    transform: scale(0.94);
  }
`;

const DawTransport = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DawTransportBtn = styled.button`
  width: 26px;
  height: 26px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

function DawSkin({ track, mode, modeLabel, isActive, isPlaying, hasQueue, onToggleEar, onPrev, onNext, ariaLabel }) {
  const bars = [40, 70, 100, 65, 85, 50, 30];
  return (
    <DawShell>
      <DawMeter>
        {bars.map((h, i) => (
          <DawBar key={i} $h={h} $active={isActive && isPlaying} $delay={i * 90} />
        ))}
      </DawMeter>
      <DawInfo>
        <TrackInfo track={track} mode={mode} modeLabel={modeLabel} />
      </DawInfo>
      <DawTransport>
        <DawTransportBtn type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
          <SkipBack size={12} />
        </DawTransportBtn>
        <DawEarButton type="button" onClick={onToggleEar} $active={isActive} aria-label={ariaLabel} aria-pressed={isActive}>
          <Ear size={20} />
        </DawEarButton>
        <DawTransportBtn type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
          <SkipForward size={12} />
        </DawTransportBtn>
      </DawTransport>
    </DawShell>
  );
}

/* ================= Skin 2: retro MP3 / iPod-esque ================= */

const IpodShell = styled.div`
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

const IpodScreen = styled.div`
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.accentSoft || 'rgba(0,0,0,0.06)'};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const IpodControls = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`;

const IpodSideButton = styled.button`
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

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const IpodWheel = styled.button`
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

  &:active {
    transform: scale(0.95);
  }
`;

function IpodSkin({ track, mode, modeLabel, isActive, hasQueue, onToggleEar, onPrev, onNext, ariaLabel }) {
  return (
    <IpodShell>
      <IpodScreen>
        <TrackInfo track={track} mode={mode} modeLabel={modeLabel} />
      </IpodScreen>
      <IpodControls>
        <IpodSideButton type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
          <SkipBack size={14} />
        </IpodSideButton>
        <IpodWheel type="button" onClick={onToggleEar} $active={isActive} aria-label={ariaLabel} aria-pressed={isActive}>
          <Ear size={20} />
        </IpodWheel>
        <IpodSideButton type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
          <SkipForward size={14} />
        </IpodSideButton>
      </IpodControls>
    </IpodShell>
  );
}

/* ================= Skin 3: Blender/3D retro-futurist HUD ================= */

const BlenderShell = styled.div`
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

const BlenderInfo = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
  text-transform: uppercase;
  font-size: 11px;
`;

const BlenderRing = styled.button`
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

const BlenderTransportBtn = styled.button`
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

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

function BlenderSkin({ track, mode, modeLabel, isActive, isPlaying, hasQueue, onToggleEar, onPrev, onNext, ariaLabel }) {
  return (
    <BlenderShell>
      <BlenderTransportBtn type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
        <SkipBack size={12} />
      </BlenderTransportBtn>
      <BlenderInfo>
        <TrackInfo track={track} mode={mode} modeLabel={modeLabel} />
      </BlenderInfo>
      <BlenderRing type="button" onClick={onToggleEar} $active={isActive} $spin={isActive && isPlaying} aria-label={ariaLabel} aria-pressed={isActive}>
        <Ear size={18} />
      </BlenderRing>
      <BlenderTransportBtn type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
        <SkipForward size={12} />
      </BlenderTransportBtn>
    </BlenderShell>
  );
}

export const PLAYER_SKINS = {
  daw: { id: 'daw', label: 'Consola DAW', component: DawSkin },
  ipod: { id: 'ipod', label: 'MP3 Retro', component: IpodSkin },
  blender3d: { id: 'blender3d', label: 'HUD 3D', component: BlenderSkin }
};

export const PLAYER_SKIN_LIST = Object.values(PLAYER_SKINS);
export const DEFAULT_PLAYER_SKIN = 'daw';
