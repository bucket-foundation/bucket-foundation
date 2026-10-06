"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { loadLandmask } from "@/components/canon-globe/landmaskFromImage";

import { useSceneTheme } from "./useSceneTheme";

interface EarthProps {
  targetRotationY: number;
  reducedMotion: boolean;
  landmaskUrl: string;
  dotOpacity?: number;
  dotDetail?: number;
  dotColor?: number;
  limbScale?: number;
  children?: React.ReactNode;
  sampleCount?: number;
  dotRadius?: number;
  visibility?: number;
  instantFade?: boolean;
}

const RADIUS = 1;
const EARTH_TILT = 0.35;

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function fibonacciPoints(n: number): Array<{ lat: number; lng: number }> {
  const out: Array<{ lat: number; lng: number }> = [];
  const phi = Math.PI * (Math.sqrt(5) - 1);
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const lat = Math.asin(y) * (180 / Math.PI);
    const lng = Math.atan2(z, x) * (180 / Math.PI);
    out.push({ lat, lng });
  }
  return out;
}

export function EarthV2({
  targetRotationY,
  reducedMotion,
  landmaskUrl,
  dotOpacity = 1,
  dotDetail = 8,
  dotColor = 0xffffff,
  limbScale = 1,
  children,
  sampleCount = 36000,
  dotRadius = 0.0038,
  visibility = 1,
  instantFade = false,
}: EarthProps) {
  const theme = useSceneTheme();
  const fadeRef = useRef(visibility);
  const shellMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [count, setCount] = useState(0);
  const [failed, setFailed] = useState(false);
  const invalidate = useThree((state) => state.invalidate);

  const transforms = useMemo(
    () => ({
      matrices: new Float32Array(sampleCount * 16),
      colors: new Float32Array(sampleCount * 3),
    }),
    [sampleCount]
  );

  useEffect(() => {
    let cancelled = false;
    setCount(0);
    setFailed(false);
    const dummy = new THREE.Object3D();
    const baseColor = new THREE.Color(theme.ink);
    const warm = new THREE.Color(theme.accent);

    loadLandmask(landmaskUrl).then((mask) => {
      if (cancelled) return;
      const candidates = fibonacciPoints(sampleCount);
      const surface = RADIUS;
      let kept = 0;
      const tmpColor = new THREE.Color();
      for (let i = 0; i < candidates.length; i++) {
        const { lat, lng } = candidates[i];
        if (!mask.isLand(lat, lng)) continue;

        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        const x = surface * Math.sin(phi) * Math.sin(theta);
        const y = surface * Math.cos(phi);
        const z = surface * Math.sin(phi) * Math.cos(theta);
        dummy.position.set(x, y, z);
        dummy.lookAt(x * 2, y * 2, z * 2);
        dummy.updateMatrix();
        dummy.matrix.toArray(transforms.matrices, kept * 16);

        const w = Math.pow(Math.cos(lat * (Math.PI / 180)), 2);
        tmpColor.copy(baseColor).lerp(warm, w * 0.45);
        tmpColor.toArray(transforms.colors, kept * 3);

        kept++;
      }

      if (cancelled) return;
      const mesh = meshRef.current;
      if (!mesh) return;
      if (!mesh.instanceColor) {
        mesh.instanceColor = new THREE.InstancedBufferAttribute(
          new Float32Array(sampleCount * 3),
          3
        );
      }
      const tmpMat = new THREE.Matrix4();
      const tmpCol = new THREE.Color();
      for (let i = 0; i < kept; i++) {
        tmpMat.fromArray(transforms.matrices, i * 16);
        mesh.setMatrixAt(i, tmpMat);
        tmpCol.fromArray(transforms.colors, i * 3);
        mesh.setColorAt(i, tmpCol);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.count = kept;
      setCount(kept);
      invalidate();
    }).catch(() => {
      if (!cancelled) setFailed(true);
    });

    return () => { cancelled = true; };
  }, [landmaskUrl, sampleCount, transforms, invalidate, theme.ink, theme.accent]);

  useEffect(() => { invalidate(); }, [visibility, invalidate]);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    const prevFade = fadeRef.current;
    const nextFade = instantFade ? visibility : damp(prevFade, visibility, 5, Math.min(delta, 0.1));
    fadeRef.current = Math.abs(nextFade - visibility) < 1e-3 ? visibility : nextFade;
    const f = fadeRef.current;
    if (reducedMotion) {
      groupRef.current.rotation.y = targetRotationY * f;
    } else {
      const auto = 0.03 * delta;
      const blendedTarget = (targetRotationY + auto * 12) * f;
      groupRef.current.rotation.y = damp(
        groupRef.current.rotation.y,
        blendedTarget,
        4,
        delta
      );
    }
    groupRef.current.rotation.x = EARTH_TILT * f;
    dotMat.opacity = dotOpacity * f;
    dotMat.transparent = dotOpacity * f < 1;
    if (meshRef.current) meshRef.current.visible = f > 0.01;
    if (shellMatRef.current) shellMatRef.current.opacity = 0.04 * f;
    if (f !== visibility) invalidate();
  });

  const dotGeo = useMemo(
    () => new THREE.SphereGeometry(dotRadius, dotDetail, Math.max(3, Math.round(dotDetail / 2))),
    [dotRadius, dotDetail]
  );
  const dotMat = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: dotColor,
      toneMapped: false,
      transparent: dotOpacity < 1,
      opacity: dotOpacity,
    });
    if (limbScale < 1) {
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uLimbScale = { value: limbScale };
        shader.vertexShader =
          "uniform float uLimbScale;\n" +
          shader.vertexShader.replace(
            "#include <begin_vertex>",
            `vec3 transformed = vec3(position);
            #ifdef USE_INSTANCING
              vec3 dotNormal = normalize((modelMatrix * instanceMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
              vec3 dotCenter = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
              float facing = clamp(dot(dotNormal, normalize(cameraPosition - dotCenter)), 0.0, 1.0);
              transformed *= mix(uLimbScale, 1.0, facing);
            #endif`
          );
      };
      mat.customProgramCacheKey = () => "limb-" + limbScale;
    }
    return mat;
  }, [dotOpacity, dotColor, limbScale]);

  useEffect(() => () => dotGeo.dispose(), [dotGeo]);
  useEffect(() => () => dotMat.dispose(), [dotMat]);

  return (
    <group ref={groupRef} rotation={[EARTH_TILT, 0, 0]}>
      {failed && <>
        <mesh><sphereGeometry args={[RADIUS, 32, 24]} /><meshBasicMaterial color={theme.muted} wireframe transparent opacity={0.15} /></mesh>
        <Html position={[0, -1.2, 0]} center><span role="status" style={{ color: theme.ink, background: theme.paper, whiteSpace: "nowrap", fontSize: 12 }}>Land outline unavailable. Source markers remain selectable.</span></Html>
      </>}
      <mesh>
        <sphereGeometry args={[RADIUS * 0.998, 64, 64]} />
        <meshBasicMaterial
          ref={shellMatRef}
          color={theme.paper}
          transparent
          opacity={0.04}
          depthWrite={false}
        />
      </mesh>

      <instancedMesh
        ref={meshRef}
        args={[dotGeo, dotMat, sampleCount]}
        count={count}
        frustumCulled={false}
      />

      {children}
    </group>
  );
}

export const EARTH_RADIUS = RADIUS;
