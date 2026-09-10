// LIQUID ICE SHELL — real extruded geometry, not a RoundedBox. Derived from
// the EXACT same chamfered silhouette AeroAmpSkin.jsx already draws in 2D
// (see chamferedRectPath() there): "Outer silhouette" uses
// chamferedRectPath(8, 8, 584, 284, 32) inside a 600x300 viewBox. This file
// re-derives the same rectangle/chamfer proportions in Three.js world units
// instead of inventing a new silhouette, so the 3D shell's footprint lines
// up with the 2D shell underneath.
import * as THREE from 'three';

// viewBox units -> world units. 1/150 makes the full 600x300 viewBox map to
// a 4x2 world rectangle (matches the "width=4.0 height=2.0" target), and
// keeps the math traceable back to the real SVG coordinates instead of a
// guessed scale.
const VIEWBOX_TO_WORLD = 1 / 150;

// Same numbers as chamferedRectPath(8, 8, 584, 284, 32) in AeroAmpSkin.jsx.
const SHELL_W_VB = 584;
const SHELL_H_VB = 284;
const SHELL_C_VB = 32;

export function createAeroShellGeometry({
  depth = 0.24,
  bevelThickness = 0.07,
  bevelSize = 0.06,
  bevelSegments = 10,
  curveSegments = 24,
} = {}) {
  const W = SHELL_W_VB * VIEWBOX_TO_WORLD;
  const H = SHELL_H_VB * VIEWBOX_TO_WORLD;
  const C = SHELL_C_VB * VIEWBOX_TO_WORLD;

  const shape = new THREE.Shape();
  shape.moveTo(-W / 2 + C, H / 2);
  shape.lineTo(W / 2 - C, H / 2);
  shape.lineTo(W / 2, H / 2 - C);
  shape.lineTo(W / 2, -H / 2 + C);
  shape.lineTo(W / 2 - C, -H / 2);
  shape.lineTo(-W / 2 + C, -H / 2);
  shape.lineTo(-W / 2, -H / 2 + C);
  shape.lineTo(-W / 2, H / 2 - C);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelOffset: 0,
    bevelSegments,
    curveSegments,
  });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

// Exposed so LiquidIceShell's camera frustum can be derived from the same
// real numbers instead of a second guessed constant.
export const AERO_SHELL_WORLD_WIDTH = SHELL_W_VB * VIEWBOX_TO_WORLD;
export const AERO_SHELL_WORLD_HEIGHT = SHELL_H_VB * VIEWBOX_TO_WORLD;
export const AERO_VIEWBOX_TO_WORLD = VIEWBOX_TO_WORLD;
