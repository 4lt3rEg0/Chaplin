import { useEffect, useState } from "react";
import { usePlayer } from "../context/PlayerContext";

export default function useAudioEnergy() {
  const { visualizerStateRef } = usePlayer();
  const [energy, setEnergy] = useState(0);

  useEffect(() => {
    let rafId = 0;

    const tick = () => {
      const v = visualizerStateRef?.current || {};
      const next = Math.max(
        0,
        Math.min(1, (v.pulse || 0) * 0.6 + (v.bass || 0) * 0.4)
      );
      setEnergy((prev) => prev * 0.82 + next * 0.18);
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [visualizerStateRef]);

  return energy;
}
