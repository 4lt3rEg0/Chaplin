import React, {
  useRef,
  useEffect,
  useState,
  useMemo
} from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  animate
} from 'framer-motion';
import PostCard from './PostCard';
import styled from 'styled-components';

/* ===================== STYLES ===================== */

const SpiralContainer = styled.div`
  position: relative;
  height: 200vh;
  background: linear-gradient(45deg, #0a0a0f 0%, #1a1a2e 100%);
  overflow: hidden;
`;

const CRTEffect = styled.div`
  position: fixed;
  inset: 0;
  background: linear-gradient(
    0deg,
    transparent 50%,
    rgba(0, 255, 136, 0.03) 50%
  );
  background-size: 100% 4px;
  pointer-events: none;
  z-index: 1000;
  mix-blend-mode: overlay;
`;

const SpiralTrack = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: center;
  touch-action: none;
`;

const SpiralPost = styled(motion.div)`
  position: absolute;
  width: 300px;
  transform-style: preserve-3d;
`;

const Radar = styled.canvas`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 160px;
  height: 160px;
  border: 1px solid #00ff88;
  background: rgba(0,0,0,0.4);
  z-index: 900;
`;

/* ===================== CONSTANTS ===================== */

const MAX_POSTS = 60;

/* ===================== COMPONENT ===================== */

const SpiralFeed = ({ posts }) => {
  const containerRef = useRef(null);
  const positionsRef = useRef({});
  const radarRef = useRef(null);
  const focusedIndexRef = useRef(0);

  /* ---------- viewport ---------- */
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const onResize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ---------- scroll ---------- */
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  });

  const rotateScroll = useTransform(scrollYProgress, [0, 1], [0, 720]);

  /* ---------- spatial motion ---------- */
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const zoom = useMotionValue(1);
  const orbitalVelocity = useMotionValue(0);

  /* ---------- zoom wheel ---------- */
  useEffect(() => {
    const onWheel = e => {
      const delta = -e.deltaY * 0.001;
      zoom.set(Math.min(2, Math.max(0.6, zoom.get() + delta)));
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, [zoom]);

  /* ---------- exhibition mode (auto rotation) ---------- */
  useEffect(() => {
    let raf;
    const loop = () => {
      orbitalVelocity.set(orbitalVelocity.get() * 0.98 + 0.002);
      dragX.set(dragX.get() + Math.cos(Date.now() * 0.0002) * orbitalVelocity.get() * 2);
      dragY.set(dragY.get() + Math.sin(Date.now() * 0.0002) * orbitalVelocity.get() * 2);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!posts || posts.length === 0) {
    return (
      <SpiralContainer>
        <CRTEffect />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#00ff88',
          fontFamily: 'Orbitron'
        }}>
          NO SIGNAL
        </div>
      </SpiralContainer>
    );
  }

  const visiblePosts = posts.slice(0, MAX_POSTS);
  const baseRadius = viewport.width < 768 ? 220 : 400;
  const step = viewport.width < 768 ? 14 : 20;

  /* ---------- positions ---------- */
  const spiralPosts = useMemo(() => {
    return visiblePosts.map((post, index) => {
      if (positionsRef.current[post.id]) return positionsRef.current[post.id];

      const angle = (index / visiblePosts.length) * Math.PI * 4;
      const radius = baseRadius + index * step;

      const data = {
        ...post,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        rotation: angle * (180 / Math.PI),
        zIndex: 1000 - index * 10
      };

      positionsRef.current[post.id] = data;
      return data;
    });
  }, [visiblePosts, baseRadius, step]);

  /* ---------- keyboard navigation ---------- */
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowRight') focusedIndexRef.current++;
      if (e.key === 'ArrowLeft') focusedIndexRef.current--;
      focusedIndexRef.current = Math.max(0, Math.min(spiralPosts.length - 1, focusedIndexRef.current));

      const target = spiralPosts[focusedIndexRef.current];
      if (target) {
        animate(dragX, -target.x, { type: 'spring', stiffness: 120 });
        animate(dragY, -target.y, { type: 'spring', stiffness: 120 });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [spiralPosts]);

  /* ---------- radar ---------- */
  useEffect(() => {
    const ctx = radarRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 160, 160);
    ctx.strokeStyle = '#00ff88';
    ctx.strokeRect(0, 0, 160, 160);

    spiralPosts.forEach(p => {
      const x = 80 + p.x * 0.05;
      const y = 80 + p.y * 0.05;
      ctx.fillRect(x, y, 2, 2);
    });
  }, [spiralPosts, dragX.get(), dragY.get()]);

  return (
    <SpiralContainer ref={containerRef}>
      <CRTEffect />
      <Radar ref={radarRef} width={160} height={160} />

      <SpiralTrack
        drag
        dragMomentum={false}
        onDrag={(e, info) => {
          orbitalVelocity.set(info.velocity.x * 0.001);
        }}
        style={{
          x: dragX,
          y: dragY,
          scale: zoom,
          rotate: rotateScroll,
          xPercent: -50,
          yPercent: -50
        }}
      >
        {spiralPosts.map((post, index) => (
          <SpiralPost
            key={post.id}
            style={{
              x: post.x,
              y: post.y,
              rotate: post.rotation,
              zIndex: post.zIndex
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 90,
              damping: 14,
              delay: index * 0.04
            }}
          >
            <PostCard post={post} />
          </SpiralPost>
        ))}
      </SpiralTrack>
    </SpiralContainer>
  );
};

export default SpiralFeed;
