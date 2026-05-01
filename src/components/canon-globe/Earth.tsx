"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// Procedural basalt sphere — no earth daymap. Bucket is foundations of
// knowledge, not geography. Fragment shader stacks two octaves of value
// noise tinted in bucket's basalt range, with warm gold highlights along
// grain veins (smoothstep on a second axis).

interface EarthProps {
  targetRotationY: number;
  reducedMotion: boolean;
  children?: React.ReactNode;
}

const RADIUS = 1;

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function Earth({ targetRotationY, reducedMotion, children }: EarthProps) {
  const groupRef = useRef<THREE.Group>(null);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uBasaltDeep: { value: new THREE.Color("#1F1C16") }, // --basalt
        uBasaltMid:  { value: new THREE.Color("#2A261E") }, // --basalt-2
        uBasaltHi:   { value: new THREE.Color("#3A3529") }, // --basalt-3
        uGold:       { value: new THREE.Color("#B8861E") }, // --gold
        uLightDir:   { value: new THREE.Vector3(3, 2, 4).normalize() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vPos;
        uniform vec3 uBasaltDeep;
        uniform vec3 uBasaltMid;
        uniform vec3 uBasaltHi;
        uniform vec3 uGold;
        uniform vec3 uLightDir;

        float hash(vec3 p) {
          p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        float vnoise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float n000 = hash(i);
          float n100 = hash(i + vec3(1.0, 0.0, 0.0));
          float n010 = hash(i + vec3(0.0, 1.0, 0.0));
          float n110 = hash(i + vec3(1.0, 1.0, 0.0));
          float n001 = hash(i + vec3(0.0, 0.0, 1.0));
          float n101 = hash(i + vec3(1.0, 0.0, 1.0));
          float n011 = hash(i + vec3(0.0, 1.0, 1.0));
          float n111 = hash(i + vec3(1.0, 1.0, 1.0));
          return mix(
            mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
            mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
            f.z);
        }
        void main() {
          float n1 = vnoise(vPos * 4.0);
          float n2 = vnoise(vPos * 11.0);
          float stone = mix(n1, n2, 0.45);
          vec3 col = mix(uBasaltDeep, uBasaltMid, smoothstep(0.2, 0.7, stone));
          col = mix(col, uBasaltHi, smoothstep(0.7, 0.95, stone) * 0.5);
          // Warm gold grain veins
          float vein = smoothstep(0.78, 0.86, vnoise(vPos * 6.0 + n2 * 1.2));
          col = mix(col, uGold * 0.55, vein * 0.35);
          // Simple lambert + ambient
          float ndl = max(dot(normalize(vNormal), normalize(uLightDir)), 0.0);
          float lit = 0.35 + ndl * 0.85;
          gl_FragColor = vec4(col * lit, 1.0);
        }
      `,
    });
  }, []);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    if (reducedMotion) {
      groupRef.current.rotation.y = targetRotationY;
    } else {
      const auto = 0.03 * delta;
      const blendedTarget = targetRotationY + auto * 12;
      groupRef.current.rotation.y = damp(
        groupRef.current.rotation.y,
        blendedTarget,
        4,
        delta
      );
    }
  });

  return (
    <group ref={groupRef} rotation={[0.35, 0, 0]}>
      <mesh>
        <sphereGeometry args={[RADIUS, 96, 96]} />
        <primitive attach="material" object={material} />
      </mesh>
      {children}
    </group>
  );
}

export const EARTH_RADIUS = RADIUS;
