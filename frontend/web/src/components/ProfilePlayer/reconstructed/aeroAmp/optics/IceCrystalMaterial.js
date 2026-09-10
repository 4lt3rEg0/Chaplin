// FASE 14.2 — ICE REFRACTION MATERIAL
//
// Wraps iceShader.js into a real Three.js material usable as JSX
// (<iceCrystalMaterial />) via drei's shaderMaterial() + R3F's extend(),
// the standard pattern for custom materials in react-three-fiber — this is
// what lets uTime/uMouse/uAudioBass/uRefractionStrength/uFresnelPower/
// uIceDensity exist as real named uniforms instead of a generic
// ShaderMaterial with a manually-managed uniforms object.
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import { iceVertexShader, iceFragmentShader, ICE_UNIFORM_DEFAULTS } from './iceShader';

export const IceCrystalMaterialImpl = shaderMaterial(
  {
    ...ICE_UNIFORM_DEFAULTS,
    uMouse: new THREE.Vector2(...ICE_UNIFORM_DEFAULTS.uMouse),
    uIceTint: new THREE.Color(...ICE_UNIFORM_DEFAULTS.uIceTint),
    uEnvMap: null
  },
  iceVertexShader,
  iceFragmentShader,
  (material) => {
    // transparent + double-sided so the chamfered ice reads correctly from
    // the inside faces too (a thin box mesh has front and back faces both
    // pointed at the camera at grazing angles).
    material.transparent = true;
    material.side = THREE.DoubleSide;
    material.depthWrite = false;
  }
);

extend({ IceCrystalMaterial: IceCrystalMaterialImpl });
