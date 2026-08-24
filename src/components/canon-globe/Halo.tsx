"use client";
import { useMemo } from "react";
import * as THREE from "three";

// Atmospheric halo. Adapted from janarosmonaliev/github-globe (MIT), a
// back-side fresnel sphere that softly tints the silhouette.
// Tinted with bucket's --gold (#B8861E) at low alpha to bloom into bone.

interface HaloProps {
  radius?: number;
  color?: string;
  enabled?: boolean;
}

export function Halo({
  radius = 1.05,
  color = "#B8861E",
  enabled = true,
}: HaloProps) {
  // Inner crisp gold rim, sits just off the surface, sharp fresnel.
  const innerMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
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
            float fres = pow(1.0 - dot(vNormal, vViewDir), 3.5);
            float a = smoothstep(0.2, 1.0, fres) * 0.55;
            gl_FragColor = vec4(uColor, a);
          }
        `,
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    [color]
  );

  // Outer atmospheric bloom, wider, softer, gives the planet a glow halo.
  const outerMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
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
            float fres = pow(1.0 - dot(vNormal, vViewDir), 1.6);
            float a = smoothstep(0.0, 1.0, fres) * 0.22;
            gl_FragColor = vec4(uColor, a);
          }
        `,
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    [color]
  );

  if (!enabled) return null;
  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, 64, 64]} />
        <primitive attach="material" object={innerMat} />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius * 1.18, 64, 64]} />
        <primitive attach="material" object={outerMat} />
      </mesh>
    </group>
  );
}
