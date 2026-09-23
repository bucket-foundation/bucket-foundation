"use client";
import { useMemo } from "react";
import * as THREE from "three";

interface HaloProps {
  radius?: number;
  color?: string;
  enabled?: boolean;
  alpha?: number;
  fade?: [number, number];
}

export function Halo({
  radius = 1.05,
  color = "#B8861E",
  enabled = true,
  alpha = 1,
  fade = [10, 11],
}: HaloProps) {
  const innerMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(color) }, uAlpha: { value: alpha }, uFade: { value: new THREE.Vector2(fade[0], fade[1]) } },
        vertexShader:  `
          varying vec3 vNormal;
          varying vec3 vViewDir;
          varying vec2 vNdc;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vViewDir = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
            vNdc = gl_Position.xy / gl_Position.w;
          }
        `,
        fragmentShader:  `
          varying vec3 vNormal;
          varying vec3 vViewDir;
          uniform vec3 uColor;
          uniform float uAlpha;
          uniform vec2 uFade;
          varying vec2 vNdc;
          void main() {
            float fres = pow(1.0 - dot(vNormal, vViewDir), 3.5);
            float a = smoothstep(0.2, 1.0, fres) * 0.55 * uAlpha;
            a *= 1.0 - smoothstep(uFade.x, uFade.y, length(vNdc));
            gl_FragColor = vec4(uColor, a);
          }
        `,
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    [color, alpha, fade]
  );

  const outerMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(color) }, uAlpha: { value: alpha }, uFade: { value: new THREE.Vector2(fade[0], fade[1]) } },
        vertexShader:  `
          varying vec3 vNormal;
          varying vec3 vViewDir;
          varying vec2 vNdc;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vViewDir = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
            vNdc = gl_Position.xy / gl_Position.w;
          }
        `,
        fragmentShader:  `
          varying vec3 vNormal;
          varying vec3 vViewDir;
          uniform vec3 uColor;
          uniform float uAlpha;
          uniform vec2 uFade;
          varying vec2 vNdc;
          void main() {
            float fres = pow(1.0 - dot(vNormal, vViewDir), 1.6);
            float a = smoothstep(0.0, 1.0, fres) * 0.22 * uAlpha;
            a *= 1.0 - smoothstep(uFade.x, uFade.y, length(vNdc));
            gl_FragColor = vec4(uColor, a);
          }
        `,
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    [color, alpha, fade]
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
