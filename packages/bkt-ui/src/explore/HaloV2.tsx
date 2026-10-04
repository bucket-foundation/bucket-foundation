"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

interface HaloProps {
  radius?: number;
  color?: string;
  enabled?: boolean;
  alpha?: number;
  fade?: [number, number];
  visibility?: number;
  instantFade?: boolean;
}

export function HaloV2({
  radius = 1.05,
  color = "#B8861E",
  enabled = true,
  alpha = 1,
  fade = [10, 11],
  visibility = 1,
  instantFade = false,
}: HaloProps) {
  const fadeRef = useRef(visibility);
  const invalidate = useThree((state) => state.invalidate);
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
    [color, alpha, fade[0], fade[1]]
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
    [color, alpha, fade[0], fade[1]]
  );

  useEffect(() => () => innerMat.dispose(), [innerMat]);
  useEffect(() => () => outerMat.dispose(), [outerMat]);

  useEffect(() => { invalidate(); }, [visibility, invalidate]);

  useFrame((_state, delta) => {
    const prev = fadeRef.current;
    const next = instantFade ? visibility : prev + (visibility - prev) * (1 - Math.exp(-5 * Math.min(delta, 0.1)));
    fadeRef.current = Math.abs(next - visibility) < 1e-3 ? visibility : next;
    innerMat.uniforms.uAlpha.value = alpha * fadeRef.current;
    outerMat.uniforms.uAlpha.value = alpha * fadeRef.current;
    if (fadeRef.current !== visibility) invalidate();
  });

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
