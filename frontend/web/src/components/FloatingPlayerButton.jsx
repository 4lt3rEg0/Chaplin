import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  ChevronUp
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import useSyncedLocalState from "../hooks/useSyncedLocalState";

const Fab = styled.button`
  position: ${({ $positionMode }) => ($positionMode === "follow" ? "absolute" : "fixed")};
  left: ${({ $positionMode }) => ($positionMode === "side" ? "auto" : "50%")};
  right: ${({ $positionMode }) => ($positionMode === "side" ? "-10px" : "auto")};
  top: ${({ $positionMode, $mobilePreviewMode }) => {
    if ($positionMode === "follow") return "auto";
    return $mobilePreviewMode ? "auto" : "auto";
  }};
  bottom: ${({ $positionMode }) => ($positionMode === "follow" ? "auto" : "calc(72px + env(safe-area-inset-bottom, 0px))")};
  transform: ${({ $positionMode }) => ($positionMode === "side" ? "none" : "translateX(-50%)")};
  z-index: 5000;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.primary || theme.colors.text};
  border-radius: 0;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: none;
  filter: drop-shadow(0 0 10px rgba(120, 237, 255, 0.58));
  animation: ${({ $pulse }) => ($pulse ? "chaplin-play-pulse 1.1s ease-in-out infinite" : "none")};
  transition: right 180ms ease, transform 180ms ease, filter 180ms ease;

  &:hover {
    ${({ $positionMode }) => ($positionMode === "side" ? "right: 14px;" : "transform: translateX(-50%) scale(1.08);")}
    filter: drop-shadow(0 0 14px rgba(120, 237, 255, 0.8));
  }

  @media (max-width: 640px) {
    width: 36px;
    height: 36px;
  }

  @keyframes chaplin-play-pulse {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(122, 247, 255, 0.45); }
    70% { transform: scale(1.04); box-shadow: 0 0 0 12px rgba(122, 247, 255, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(122, 247, 255, 0); }
  }
`;

const Panel = styled.section`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 4999;
  display: grid;
  gap: 8px;
  max-height: min(60vh, 420px);
  overflow-y: auto;
  padding: calc(8px + var(--safe-top)) 10px 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background:
    radial-gradient(circle at 8% 12%, ${({ theme }) => `${theme.colors.primary}55`}, transparent 45%),
    linear-gradient(180deg, rgba(4, 9, 17, 0.95), rgba(8, 16, 26, 0.94));
  backdrop-filter: blur(12px) saturate(140%);
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Meta = styled.div`
  min-width: 0;
`;

const Title = styled.div`
  font-size: 13px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Artist = styled.div`
  font-size: 11px;
  opacity: 0.82;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Controls = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

const IconButton = styled.button`
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.borderStrong : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? theme.colors.accentSoft : "rgba(255,255,255,0.05)")};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};

  &:disabled {
    cursor: not-allowed;
  }
`;

const Progress = styled.input`
  width: 100%;
`;

const UtilityRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
`;

const Time = styled.span`
  font-size: 11px;
  opacity: 0.84;
`;

const Volume = styled.input`
  width: 120px;
`;

const CloseRow = styled.div`
  display: grid;
  justify-items: center;
  padding-top: 2px;
`;

const Bars = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(2px, 1fr));
  gap: 3px;
  height: 34px;
  align-items: end;
`;

const Bar = styled.span`
  display: block;
  border-radius: 2px;
  background: linear-gradient(180deg, ${({ theme }) => theme.colors.surfaceAlt}, ${({ theme }) => theme.colors.background});
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
  height: ${({ $h }) => `${$h}px`};
  transition: height 120ms ease;
`;

const ViewModeSelect = styled.select`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(255, 255, 255, 0.06);
  color: ${({ theme }) => theme.colors.text};
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 11px;
`;

const fmtTime = (value) => {
  if (!Number.isFinite(value)) return "00:00";
  const safe = Math.max(0, Math.floor(value));
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export default function FloatingPlayerButton({ mobilePreviewMode = false }) {
  const [expanded, setExpanded] = useSyncedLocalState("chaplin_player_panel_expanded", false);
  const [manuallyCollapsedDuringPlayback, setManuallyCollapsedDuringPlayback] = useSyncedLocalState("chaplin_player_panel_hidden", false);
  const [floatingMode, setFloatingMode] = useSyncedLocalState("chaplin_floating_mode", "fixed");
  const [scrollY, setScrollY] = useState(0);
  const prevPlayingRef = useRef(false);
  const panelRef = useRef(null);
  const {
    current,
    playing,
    activeSource,
    duration,
    currentTime,
    volume,
    muted,
    repeatMode,
    shuffleEnabled,
    visualizerStateRef,
    play,
    pause,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeatMode,
    playFromSource,
    isPlaybackOwner
  } = usePlayer();

  const resolvedFloatingMode = mobilePreviewMode ? "fixed" : floatingMode;

  const bars = useMemo(() => {
    const v = visualizerStateRef.current || {};
    const bass = v.bass || 0;
    const mid = v.mid || 0;
    const treble = v.treble || 0;
    return Array.from({ length: 12 }, (_, i) => {
      const section = i < 4 ? bass : i < 8 ? mid : treble;
      const wobble = Math.sin((currentTime + i) * 2.1) * 0.15;
      const level = Math.max(0.02, Math.min(1, section * 1.35 + wobble));
      return Math.round(4 + level * 30);
    });
  }, [visualizerStateRef, currentTime]);

  const playOnly = async () => {
    if (playing && isPlaybackOwner) return;

    if (current?.src) {
      await play(current.src, current);
      return;
    }

    const startedFromActive = await playFromSource(activeSource || "chaplin");
    if (startedFromActive) return;
    const startedChaplin = await playFromSource("chaplin");
    if (startedChaplin) return;
    await playFromSource("personal");
  };

  const pauseOnly = () => {
    if (!playing) return;
    pause();
  };

  const showPanel = expanded || (playing && !manuallyCollapsedDuringPlayback);

  // The panel is `position: fixed` and reserves no space in normal document
  // flow, so it can cover page content underneath it (e.g. registration form
  // fields) on short viewports. Publish its real rendered height as a CSS
  // variable so page layouts can add matching top padding when it's visible.
  useEffect(() => {
    const root = document.documentElement;

    if (!showPanel || !panelRef.current) {
      root.style.setProperty("--chaplin-player-panel-offset", "0px");
      return undefined;
    }

    const el = panelRef.current;
    const updateOffset = () => {
      root.style.setProperty("--chaplin-player-panel-offset", `${el.offsetHeight}px`);
    };
    updateOffset();

    const observer = new ResizeObserver(updateOffset);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.setProperty("--chaplin-player-panel-offset", "0px");
    };
  }, [showPanel]);

  useEffect(() => {
    if (resolvedFloatingMode !== "follow") {
      return undefined;
    }

    const onScroll = () => setScrollY(window.scrollY || 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [resolvedFloatingMode]);

  const fabStyle = resolvedFloatingMode === "follow"
    ? { top: `${scrollY + 18}px`, left: "50%", transform: "translateX(-50%)" }
    : undefined;

  useEffect(() => {
    const startedNow = !prevPlayingRef.current && playing;
    if (startedNow && !manuallyCollapsedDuringPlayback) {
      setExpanded(true);
    }

    if (!playing) {
      setManuallyCollapsedDuringPlayback(false);
    }

    prevPlayingRef.current = playing;
  }, [playing, manuallyCollapsedDuringPlayback, setExpanded, setManuallyCollapsedDuringPlayback]);

  return (
    <>
      {!showPanel && (
        <Fab
          type="button"
          onClick={() => {
            setExpanded(true);
            setManuallyCollapsedDuringPlayback(false);
          }}
          aria-label="Abrir reproductor"
          $pulse={playing}
          $positionMode={resolvedFloatingMode}
          $mobilePreviewMode={mobilePreviewMode}
          style={fabStyle}
        >
          {playing ? <Pause size={21} /> : <Play size={21} />}
        </Fab>
      )}

      {showPanel && (
        <Panel ref={panelRef}>
          <Row>
            <Meta>
              <Title>{current?.title || "Chaplin Radio"}</Title>
              <Artist>{current?.artist || "Selecciona una canción para empezar"}</Artist>
            </Meta>

            <Controls>
              <IconButton type="button" onClick={previous} aria-label="Anterior"><SkipBack size={16} /></IconButton>
              <IconButton type="button" onClick={playOnly} $active={playing} disabled={playing && isPlaybackOwner} aria-label="Reproducir">
                <Play size={16} />
              </IconButton>
              <IconButton type="button" onClick={pauseOnly} $active={playing} disabled={!playing} aria-label="Pausar">
                <Pause size={16} />
              </IconButton>
              <IconButton type="button" onClick={next} aria-label="Siguiente"><SkipForward size={16} /></IconButton>
              <IconButton type="button" onClick={toggleShuffle} $active={shuffleEnabled} aria-label="Aleatorio"><Shuffle size={16} /></IconButton>
              <IconButton type="button" onClick={cycleRepeatMode} $active={repeatMode !== "off"} aria-label="Repetición">
                {repeatMode === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
              </IconButton>
              <ViewModeSelect
                value={resolvedFloatingMode}
                onChange={(e) => setFloatingMode(e.target.value)}
                disabled={mobilePreviewMode}
              >
                <option value="fixed">Botones fijos</option>
                <option value="follow">Seguir scroll</option>
                <option value="side">Ocultar lateral</option>
              </ViewModeSelect>
            </Controls>

          </Row>

          <UtilityRow>
            <Time>{fmtTime(currentTime)}</Time>
            <Progress
              type="range"
              min="0"
              max={Math.max(1, Math.floor(duration || 0))}
              value={Math.min(Math.floor(currentTime || 0), Math.max(1, Math.floor(duration || 0)))}
              onChange={(e) => seek(Number(e.target.value))}
            />
            <Time>{fmtTime(duration)}</Time>
          </UtilityRow>

          <UtilityRow>
            <IconButton type="button" onClick={toggleMute} aria-label="Silenciar">
              {muted || volume <= 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </IconButton>
            <Bars>
              {bars.map((h, idx) => <Bar key={`bar-${idx}`} $h={h} />)}
            </Bars>
            <Volume
              type="range"
              min="0"
              max="100"
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(e.target.value)}
            />
          </UtilityRow>

          <CloseRow>
            <IconButton
              type="button"
              onClick={() => {
                setExpanded(false);
                if (playing) {
                  setManuallyCollapsedDuringPlayback(true);
                }
              }}
              aria-label="Cerrar reproductor"
            >
              <ChevronUp size={16} />
            </IconButton>
          </CloseRow>
        </Panel>
      )}
    </>
  );
}
