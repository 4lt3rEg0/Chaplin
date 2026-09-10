// LIQUID ICE SHELL — synthetic studio environment. These Lightformers are
// rendered into an offscreen cubemap by drei's <Environment>; the shell's
// MeshTransmissionMaterial then samples that cubemap for its reflections.
// This is deliberately the ONLY source of the shell's highlights/ribbons —
// no hand-drawn <path stroke="white">. If a highlight is missing, the fix
// is a lightformer here, not a shape in AeroAmpSkin.jsx.
//
// Four sources, matching the same key/fill/rim/accent rig the SVG shell's
// own (2D, hand-placed) highlights already implied:
// KEY   — big white rect, upper-left/front — the dominant giant-softbox
//         ribbon the reference images show.
// FILL  — wide cyan strip, right side — softer secondary fill light.
// RIM   — cold blue/white strip, back/top — separates the shell from the
//         page background.
// ACCENT — small, low-intensity pale pink/lilac — enough for the material's
//         iridescence to have something to catch; not a themed light.
import React from 'react';
import { Environment, Lightformer } from '@react-three/drei';

export default function AeroStudioEnvironment() {
  return (
    <Environment resolution={512} frames={1}>
      <Lightformer
        form="rect"
        color="#ffffff"
        intensity={10}
        position={[-4, 3, 4]}
        scale={[7, 1.2, 1]}
        rotation={[0, -0.45, -0.25]}
      />
      <Lightformer
        form="rect"
        color="#c8fbff"
        intensity={7}
        position={[3.5, 1.5, 3]}
        scale={[1.0, 6, 1]}
        rotation={[0, 0.55, 0.18]}
      />
      <Lightformer
        form="rect"
        color="#53dfff"
        intensity={5}
        position={[-1, -3, 2]}
        scale={[8, 0.8, 1]}
        rotation={[0, 0, 0.12]}
      />
      <Lightformer
        form="rect"
        color="#ffb6ee"
        intensity={1.2}
        position={[4, -1.5, 1]}
        scale={[1.5, 0.45, 1]}
        rotation={[0, 0.2, -0.4]}
      />
    </Environment>
  );
}
