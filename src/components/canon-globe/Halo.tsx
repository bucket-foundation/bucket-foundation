"use client";
import { useMemo } from "react";
import * as THREE from "three";

// Atmospheric halo. Adapted from janarosmonaliev/github-globe (MIT) — a
// back-side fresnel sphere that softly tints the silhouette.
// Tinted with bucket's --gold (#B8861E) at low alpha to bloom into bone.

interface HaloProps {
  radius?: number;
  color?: string;
  enabled?: boolean;
}

export function Halo({
  radius = 1.18,
  color = "#B8861E",
  enabled = true,
}: HaloProps) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) } },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        uniform vec3 uColor;
        void main() {
          // Light-theme tuned: thinner alpha smoothstep so the gold halo
          // doesn't bloom too heavy on bone background.
          float fres = pow(1.0 - dot(vNormal, vViewDir), 2.8);
          float a = smoothstep(0.15, 1.0, fres) * 0.25;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      // NormalBlending on bone reads as a soft gold rim instead of a
      // washed-out white smear (which Additive gives on light bg).
      blending: THREE.NormalBlending,
    });
  }, [color]);

  if (!enabled) return null;
  return (
    <mesh>
      <sphereGeometry args={[radius, 64, 64]} />
      <primitive attach="material" object={material} />
    </mesh>
  );
}
