import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import { BookOpen, Pause, Play, Radio, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";

const Bar = styled.div`
  position: fixed;
  top: calc(8px + env(safe-area-inset-top, 0px));
  left: calc(10px + env(safe-area-inset-left, 0px));
  right: calc(10px + env(safe-area-inset-right, 0px));
  z-index: 5005;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: transparent;
`;

const IconButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.primary || theme.colors.text};
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  cursor: pointer;
  filter: drop-shadow(0 0 8px rgba(120, 237, 255, 0.45));
  transition: transform 150ms ease, filter 150ms ease, background-color 150ms ease;

  &:hover {
    transform: scale(1.06);
    filter: drop-shadow(0 0 10px rgba(120, 237, 255, 0.65));
  }
`;

export default function FloatingTopIcons() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    current,
    playing,
    activeSource,
    play,
    pause,
    playFromSource,
    setActiveSource,
    isPlaybackOwner
  } = usePlayer();

  const customizeTimeoutRef = useRef(null);

  useEffect(() => () => {
    if (customizeTimeoutRef.current) {
      window.clearTimeout(customizeTimeoutRef.current);
    }
  }, []);

  const makePathWithFlags = (path, extras = {}) => {
    const currentParams = new URLSearchParams(location.search);
    const next = new URLSearchParams();

    ["mobile", "allpages"].forEach((key) => {
      const value = currentParams.get(key);
      if (value != null) {
        next.set(key, value);
      }
    });

    Object.entries(extras).forEach(([key, value]) => {
      if (value == null) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });

    const query = next.toString();
    return query ? `${path}?${query}` : path;
  };

  const togglePlay = async () => {
    if (playing) {
      pause();
      return;
    }

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

  const openDiary = () => {
    navigate(makePathWithFlags("/feed", { compose: 1, mode: "diary" }));
  };

  const openStation = async () => {
    setActiveSource("chaplin");
    await playFromSource("chaplin");
  };

  const openCustomize = () => {
    navigate(makePathWithFlags("/profile"));
    if (customizeTimeoutRef.current) {
      window.clearTimeout(customizeTimeoutRef.current);
    }
    customizeTimeoutRef.current = window.setTimeout(() => {
      customizeTimeoutRef.current = null;
      if (window.location.pathname === "/profile") {
        window.location.hash = "customize";
      }
    }, 0);
  };

  return (
    <Bar>
      <IconButton type="button" onClick={openDiary} aria-label="Querido diario">
        <BookOpen size={20} />
      </IconButton>

      <IconButton type="button" onClick={togglePlay} aria-label="Play">
        {playing && isPlaybackOwner ? <Pause size={20} /> : <Play size={20} />}
      </IconButton>

      <IconButton type="button" onClick={openStation} aria-label="Emisora">
        <Radio size={20} />
      </IconButton>

      <IconButton type="button" onClick={openCustomize} aria-label="Personalizar">
        <Sparkles size={20} />
      </IconButton>
    </Bar>
  );
}
