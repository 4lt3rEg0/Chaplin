// FASE 15 — replaces Fase 14's IceCrystalMaterial.js. Same registration
// pattern (drei's shaderMaterial() + R3F's extend(), so it exists as a real
// JSX intrinsic — <iceMaterial /> — with named uniforms instead of a
// generic ShaderMaterial + manual uniforms object), now wired to
// RefractionShader.js's screen-space-refraction model and its uSceneTex /
// uEnvMap / uHasScene inputs.
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import { iceVertexShader, iceFragmentShader, ICE_UNIFORM_DEFAULTS } from './RefractionShader';

export const IceMaterialImpl = shaderMaterial(
  {
    ...ICE_UNIFORM_DEFAULTS,
    uMouse: new THREE.Vector2(...ICE_UNIFORM_DEFAULTS.uMouse),
    uIceTint: new THREE.Color(...ICE_UNIFORM_DEFAULTS.uIceTint),
    uSceneTex: null,
    uEnvMap: null
  },
  iceVertexShader,
  iceFragmentShader,
  (material) => {
    material.transparent = true;
    // FASE 16 — DoubleSide (Fase 15's original choice, for the back faces
    // to read at grazing angles) turned out to be the actual cause of a
    // bad artifact: with depthWrite off on a transparent RoundedBox, both
    // front- and back-face triangles rasterize and blend in whatever order
    // Three.js happens to draw them — not reliably back-to-front sorted —
    // so the front face's own fragments were getting mixed with back-face
    // fragments carrying a DIFFERENT local UV, which is what produced a
    // solid bright vertical band across the LCD/mascot regardless of any
    // edgeFactor tuning (confirmed by rendering the material alone with a
    // false-color UV debug output — the "flat center" assumption held for
    // the front face but not for what was blending on top of it). This
    // player's camera never really gets behind the shell, so FrontSide
    // alone reads correctly and removes the artifact entirely.
    material.side = THREE.FrontSide;
    material.depthWrite = false;
  }
);

extend({ IceMaterial: IceMaterialImpl });
