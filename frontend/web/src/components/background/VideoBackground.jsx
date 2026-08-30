import React, { memo, useEffect, useMemo, useRef } from 'react';

export const VIDEO_BACKGROUNDS = Array.from({ length: 38 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return `/visualizers/visualizer${number}.mp4`;
});

export const VIDEO_STYLE_TO_INDEX = Object.fromEntries(
  Array.from({ length: 38 }, (_, index) => [
    `video${String(index + 1).padStart(2, '0')}`,
    index
  ])
);

export const VIDEO_BACKGROUND_STYLE_SET = new Set(Object.keys(VIDEO_STYLE_TO_INDEX));

const VideoBackground = memo(function VideoBackground({ currentBg = 0 }) {
  const videoRef = useRef(null);
  const watchdogRef = useRef(0);
  const stallWindowRef = useRef([]);

  const src = useMemo(() => {
    if (!VIDEO_BACKGROUNDS.length) {
      return '';
    }
    const normalized = ((currentBg % VIDEO_BACKGROUNDS.length) + VIDEO_BACKGROUNDS.length) % VIDEO_BACKGROUNDS.length;
    return VIDEO_BACKGROUNDS[normalized];
  }, [currentBg]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return undefined;
    }

    let disposed = false;

    const forcePlay = () => {
      if (disposed || !video) {
        return;
      }
      if (video.ended) {
        video.currentTime = 0;
      }
      video.muted = true;
      video.defaultMuted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.loop = true;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    };

    const onCanPlay = () => forcePlay();
    const onLoadedData = () => forcePlay();
    const onPause = () => {
      if (!video.ended) {
        forcePlay();
      }
    };
    const onEnded = () => {
      video.currentTime = 0;
      forcePlay();
    };
    const onStall = () => forcePlay();
    const onVisibility = () => {
      if (!document.hidden) {
        forcePlay();
      }
    };

    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('stalled', onStall);
    video.addEventListener('suspend', onStall);
    video.addEventListener('waiting', onStall);
    document.addEventListener('visibilitychange', onVisibility);

    stallWindowRef.current = [];
    watchdogRef.current = window.setInterval(() => {
      if (disposed || document.hidden) {
        return;
      }

      const now = Date.now();
      stallWindowRef.current.push({ t: now, ct: video.currentTime });
      stallWindowRef.current = stallWindowRef.current.filter((s) => now - s.t <= 1400);

      const stalled =
        stallWindowRef.current.length >= 3 &&
        Math.abs(stallWindowRef.current[stallWindowRef.current.length - 1].ct - stallWindowRef.current[0].ct) < 0.02;

      if (video.paused || stalled) {
        forcePlay();
      }
    }, 350);

    forcePlay();

    return () => {
      disposed = true;
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('stalled', onStall);
      video.removeEventListener('suspend', onStall);
      video.removeEventListener('waiting', onStall);
      document.removeEventListener('visibilitychange', onVisibility);
      if (watchdogRef.current) {
        window.clearInterval(watchdogRef.current);
      }
      stallWindowRef.current = [];
    };
  }, [src]);

  if (!src) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none'
      }}
    >
      <video
        ref={videoRef}
        key={src}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        controls={false}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          zIndex: -1,
          pointerEvents: 'none'
        }}
      />
    </div>
  );
});

export default VideoBackground;
