import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { findBackgroundEntry } from './backgroundCatalog';

const Frame = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #05070b;
`;

/* Catalogs can list dozens of video-backed backgrounds at once — mounting a
   real <video> for every card simultaneously is what actually crashes/locks
   up constrained browsers (mobile Safari in particular caps concurrent media
   elements hard). Each card only mounts its real preview once it has
   scrolled into view at least once, then keeps it (no re-teardown on scroll
   away, to avoid flicker). On top of that, only the selected background's
   video actually plays (see VideoThumb) — every other card just shows one
   static decoded frame, so at most one video ever decodes at a time. */
function useMountOnceVisible(skip) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(skip);

  useEffect(() => {
    if (skip || visible || !ref.current || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [skip, visible]);

  return [ref, visible];
}

const VideoEl = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
`;

/* The demo sandbox (the one real autoPlay instance) actually plays the
   video. Every grid card shows ONLY its pre-extracted poster frame
   (visualizers/posters/*.jpg, a few KB) with no `src` set at all — not
   even a metadata fetch — so browsing a catalog of dozens of these (some
   files run well over 100MB) never touches the network for anything but
   the poster, no matter how many cards are on screen. The real file for
   a style only ever loads once that style is actually selected/active. */
function VideoThumb({ src, poster, autoPlay }) {
  const ref = useRef(null);

  if (autoPlay) {
    return <VideoEl ref={ref} src={src} poster={poster} muted loop playsInline preload="metadata" autoPlay />;
  }

  return <VideoEl ref={ref} poster={poster} muted loop playsInline preload="none" />;
}

const waveMove = keyframes`
  0% { background-position: 0 0, 0 0; }
  100% { background-position: 200px 0, -160px 0; }
`;

const Wave = styled.div`
  width: 100%;
  height: 100%;
  background:
    repeating-linear-gradient(100deg, ${({ $b }) => $b}55 0 8px, transparent 8px 22px),
    linear-gradient(180deg, ${({ $a }) => $a}, #05070b);
  animation: ${waveMove} 6s linear infinite;
`;

const swirlSpin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Swirl = styled.div`
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: ${({ $a }) => $a};
  overflow: hidden;

  &::before {
    content: '';
    width: 180%;
    height: 180%;
    background: conic-gradient(from 0deg, ${({ $b }) => $b}, transparent 30%, ${({ $b }) => $b}88, transparent 70%, ${({ $b }) => $b});
    animation: ${swirlSpin} 5s linear infinite;
    filter: blur(2px);
  }
`;

const blobMorph = keyframes`
  0%, 100% { border-radius: 42% 58% 60% 40% / 40% 40% 60% 60%; transform: scale(1); }
  50% { border-radius: 60% 40% 40% 60% / 60% 60% 40% 40%; transform: scale(1.08); }
`;

const Blob = styled.div`
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: ${({ $a }) => $a};

  &::before {
    content: '';
    width: 70%;
    height: 70%;
    background: radial-gradient(circle at 35% 35%, ${({ $b }) => $b}, ${({ $b }) => $b}33 70%);
    animation: ${blobMorph} 4s ease-in-out infinite;
  }
`;

const twinkle = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
`;

const Particles = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  background: ${({ $a }) => $a};

  span {
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: ${({ $b }) => $b};
    animation: ${twinkle} 2s ease-in-out infinite;
  }
`;

const PARTICLE_POSITIONS = [
  [10, 20, 0], [25, 60, 0.3], [40, 15, 0.6], [55, 75, 0.2], [70, 30, 0.8],
  [85, 55, 0.4], [15, 85, 0.7], [65, 10, 0.1], [90, 80, 0.5], [35, 45, 0.9]
];

function ParticlesThumb({ a, b }) {
  return (
    <Particles $a={a} $b={b}>
      {PARTICLE_POSITIONS.map(([x, y, delay], i) => (
        <span key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }} />
      ))}
    </Particles>
  );
}

const gridScroll = keyframes`
  from { background-position: 0 0; }
  to { background-position: 0 24px; }
`;

const Grid = styled.div`
  width: 100%;
  height: 100%;
  background:
    linear-gradient(${({ $b }) => $b}33 1px, transparent 1px) 0 0 / 100% 24px,
    linear-gradient(90deg, ${({ $b }) => $b}33 1px, transparent 1px) 0 0 / 24px 100%,
    linear-gradient(180deg, ${({ $a }) => $a}, #000);
  animation: ${gridScroll} 1.2s linear infinite;
`;

const rainFall = keyframes`
  from { background-position: 0 -40px; }
  to { background-position: 0 40px; }
`;

const Rain = styled.div`
  width: 100%;
  height: 100%;
  background:
    repeating-linear-gradient(180deg, ${({ $b }) => $b}66 0 2px, transparent 2px 14px),
    ${({ $a }) => $a};
  animation: ${rainFall} 0.6s linear infinite;
`;

const orbPulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.15); opacity: 1; }
`;

const Orb = styled.div`
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: ${({ $a }) => $a};

  &::before {
    content: '';
    width: 60%;
    height: 60%;
    border-radius: 50%;
    background: radial-gradient(circle, ${({ $b }) => $b}, transparent 70%);
    animation: ${orbPulse} 2.4s ease-in-out infinite;
  }
`;

const bandsShift = keyframes`
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(6%); }
`;

const Bands = styled.div`
  width: 100%;
  height: 100%;
  background: ${({ $a }) => $a};
  overflow: hidden;

  &::before {
    content: '';
    display: block;
    width: 130%;
    height: 100%;
    background: repeating-linear-gradient(70deg, ${({ $b }) => $b}55 0 10px, transparent 10px 28px);
    animation: ${bandsShift} 3.5s ease-in-out infinite;
  }
`;

const PATTERN_COMPONENTS = {
  wave: Wave,
  swirl: Swirl,
  blob: Blob,
  grid: Grid,
  rain: Rain,
  orb: Orb,
  bands: Bands
};

export default function BackgroundThumb({ id, autoPlay = false }) {
  const entry = findBackgroundEntry(id);
  // The one autoPlay instance (the live demo sandbox) is never part of a
  // large grid, so it can mount immediately — only catalog grids lazy-load.
  const [ref, visible] = useMountOnceVisible(autoPlay);

  if (!visible) {
    return <Frame ref={ref} />;
  }

  if (entry.kind === 'video') {
    return (
      <Frame ref={ref}>
        <VideoThumb src={entry.src} poster={entry.poster} autoPlay={autoPlay} />
      </Frame>
    );
  }

  if (entry.pattern === 'particles') {
    return <Frame ref={ref}><ParticlesThumb a={entry.colorA} b={entry.colorB} /></Frame>;
  }

  const PatternComponent = PATTERN_COMPONENTS[entry.pattern] || Wave;
  return (
    <Frame ref={ref}>
      <PatternComponent $a={entry.colorA} $b={entry.colorB} />
    </Frame>
  );
}
