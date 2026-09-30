"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import type { AtlasProduction } from "@/lib/research-os/solvability-atlas";
import {
  ERAS,
  SPHERE_RADIUS,
  axisPoint,
  eraOf,
  place,
  ringPoint,
  sharedTokenEdges,
  sliceRows,
  smoothedRadius,
  spaceRadius,
  type SpaceView,
  type Vec3,
} from "@/lib/research-os/solvability-space";

type Props = {
  rows: AtlasProduction[];
  view: SpaceView;
  year: number;
  selected: string | null;
  colors: Record<string, string>;
  onSelect: (id: string) => void;
  onSlice: (era: number) => void;
};

const CAMERA: Record<SpaceView, Vec3> = { circle: [0, 0, 16], sphere: [0, 4, 15], slices: [-4, 17, 12], helix: [-4, 17, 12] };

function resolve(el: HTMLElement, c: string): THREE.Color {
  const m = c.match(/^var\((--[^)]+)\)$/);
  const v = m ? getComputedStyle(el).getPropertyValue(m[1]).trim() : c;
  return new THREE.Color(v || "#888");
}

function lineOf(pts: Vec3[], color: THREE.Color, opacity: number): THREE.Line {
  const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(...p)));
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

function surfaceOf(pos: number[], idx: number[], color: THREE.Color, opacity: number): THREE.Group {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const out = new THREE.Group();
  out.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false })));
  out.add(new THREE.LineSegments(new THREE.WireframeGeometry(g), new THREE.LineBasicMaterial({ color, transparent: true, opacity: opacity * 0.6 })));
  return out;
}

function buildGuides(view: SpaceView, rows: AtlasProduction[], ink: THREE.Color, accent: THREE.Color): THREE.Group {
  const out = new THREE.Group();
  const A = 64;
  const ring = (f: (a: number) => Vec3) => Array.from({ length: A + 1 }, (_, k) => f((k / A) * Math.PI * 2));
  if (view === "circle") {
    [0, 0.5, 1].forEach((s) => out.add(lineOf(ring((a) => [Math.cos(a) * spaceRadius(s) * 2.2, Math.sin(a) * spaceRadius(s) * 2.2, 0]), ink, 0.3)));
    return out;
  }
  if (view === "sphere") {
    out.add(new THREE.Mesh(new THREE.SphereGeometry(SPHERE_RADIUS * 0.985, 48, 32), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.08, depthWrite: false })));
    for (let e = 0; e <= ERAS.length; e++) {
      const lat = (e / ERAS.length - 0.5) * Math.PI * 0.9;
      const l = lineOf(ring((a) => [Math.cos(lat) * Math.cos(a) * SPHERE_RADIUS, Math.sin(lat) * SPHERE_RADIUS, Math.cos(lat) * Math.sin(a) * SPHERE_RADIUS]), ink, 0.3);
      if (e < ERAS.length) l.userData.era = e;
      out.add(l);
    }
    return out;
  }
  out.add(lineOf([axisPoint(0), axisPoint(ERAS.length)], ink, 0.6));
  ERAS.forEach((_, e) => {
    const u = view === "slices" ? e + 0.5 : e;
    const l = lineOf(ring((a) => ringPoint(u, 2.5, a)), ink, view === "slices" ? 0.5 : 0.3);
    l.userData.era = e;
    out.add(l);
  });
  const pos: number[] = [];
  const idx: number[] = [];
  const S = 48;
  if (view === "helix") {
    const U = 72;
    for (let i = 0; i <= U; i++) {
      const u = (i / U) * ERAS.length;
      for (let j = 0; j <= S; j++) {
        const a = (j / S) * Math.PI * 2;
        pos.push(...ringPoint(u, smoothedRadius(rows, u, a, "helix"), a));
      }
    }
    for (let i = 0; i < U; i++)
      for (let j = 0; j < S; j++) {
        const q = i * (S + 1) + j;
        idx.push(q, q + 1, q + S + 1, q + 1, q + S + 2, q + S + 1);
      }
    out.add(surfaceOf(pos, idx, accent, 0.1));
    return out;
  }
  ERAS.forEach((_, e) => {
    const u = e + 0.5;
    const b = pos.length / 3;
    pos.push(...axisPoint(u));
    for (let j = 0; j <= S; j++) {
      const a = (j / S) * Math.PI * 2;
      pos.push(...ringPoint(u, smoothedRadius(rows.filter((p) => eraOf(p.posed) === e), u, a, "slices"), a));
    }
    for (let j = 0; j < S; j++) idx.push(b, b + 1 + j, b + 2 + j);
  });
  out.add(surfaceOf(pos, idx, accent, 0.16));
  return out;
}

export default function SolvabilitySpace({ rows, view, year, selected, colors, onSelect, onSlice }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ setView: (v: SpaceView, rows: AtlasProduction[], year: number, selected: string | null) => void } | null>(null);
  const handlers = useRef({ onSelect, onSlice });
  handlers.current = { onSelect, onSlice };

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    const ink = resolve(el, "var(--basalt-3)");
    const accent = resolve(el, "var(--gold-deep)");
    const dot = new THREE.SphereGeometry(0.17, 14, 10);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.35, depthWrite: false }));
    halo.visible = false;
    scene.add(halo);
    const meshes = new Map<string, THREE.Mesh>();
    let guides = new THREE.Group();
    scene.add(guides);
    let tween: { from: Map<string, THREE.Vector3>; t0: number } | null = null;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setView = (v: SpaceView, rs: AtlasProduction[], y: number, sel: string | null) => {
      const visible = rs.filter((p) => p.posed <= y);
      const from = new Map<string, THREE.Vector3>();
      meshes.forEach((m, id) => from.set(id, m.position.clone()));
      const keep = new Set(visible.map((p) => p.id));
      meshes.forEach((m, id) => {
        if (!keep.has(id)) {
          scene.remove(m);
          meshes.delete(id);
        }
      });
      for (const p of visible) {
        let m = meshes.get(p.id);
        if (!m) {
          m = new THREE.Mesh(dot, new THREE.MeshBasicMaterial({ color: resolve(el, colors[p.branch] ?? "#888"), transparent: true }));
          m.position.set(...place(p, v));
          m.userData.p = p;
          scene.add(m);
          meshes.set(p.id, m);
        }
        const solved = p.resolved != null && p.resolved <= y;
        (m.material as THREE.MeshBasicMaterial).opacity = solved ? 1 : 0.55;
        m.scale.setScalar(solved ? 1.25 : 1);
        m.userData.target = new THREE.Vector3(...place(p, v));
      }
      scene.remove(guides);
      guides = buildGuides(v, visible, ink, accent);
      scene.add(guides);
      const sm = sel ? meshes.get(sel) : undefined;
      halo.visible = !!sm;
      halo.userData.follow = sm ?? null;
      if (camera.userData.view !== v) {
        camera.position.set(...CAMERA[v]);
        controls.target.set(0, 0, 0);
        camera.userData.view = v;
      }
      tween = still ? null : { from, t0: performance.now() };
      if (still) meshes.forEach((m) => m.position.copy(m.userData.target));
    };
    api.current = { setView };

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const ray = new THREE.Raycaster();
    const mp = new THREE.Vector2();
    let down: [number, number] | null = null;
    const pick = (ev: PointerEvent) => {
      const b = renderer.domElement.getBoundingClientRect();
      mp.set(((ev.clientX - b.left) / b.width) * 2 - 1, -((ev.clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(mp, camera);
      ray.params.Line = { threshold: 0.15 };
      const eraLines = guides.children.filter((g) => g.userData.era !== undefined);
      return ray.intersectObjects([...Array.from(meshes.values()), ...eraLines])[0];
    };
    const onDown = (ev: PointerEvent) => (down = [ev.clientX, ev.clientY]);
    const onUp = (ev: PointerEvent) => {
      if (!down || Math.hypot(ev.clientX - down[0], ev.clientY - down[1]) > 5) return;
      const hit = pick(ev);
      if (!hit) return;
      const p = hit.object.userData.p as AtlasProduction | undefined;
      if (p) {
        handlers.current.onSelect(p.id);
        handlers.current.onSlice(eraOf(p.posed));
      } else handlers.current.onSlice(hit.object.userData.era as number);
    };
    const onMove = (ev: PointerEvent) => {
      const hit = pick(ev);
      renderer.domElement.style.cursor = hit ? "pointer" : "grab";
      renderer.domElement.title = (hit?.object.userData.p as AtlasProduction | undefined)?.title ?? (hit ? ERAS[hit.object.userData.era as number]?.label ?? "" : "");
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointermove", onMove);

    let raf = 0;
    const loop = () => {
      if (tween) {
        const k = Math.min(1, (performance.now() - tween.t0) / 700);
        const e = k * k * (3 - 2 * k);
        meshes.forEach((m, id) => {
          const f = tween!.from.get(id);
          if (f) m.position.lerpVectors(f, m.userData.target, e);
          else m.position.copy(m.userData.target);
        });
        if (k >= 1) tween = null;
      }
      const f = halo.userData.follow as THREE.Mesh | null;
      if (f) halo.position.copy(f.position);
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      api.current = null;
    };
  }, [colors]);

  useEffect(() => {
    api.current?.setView(view, rows, year, selected);
  }, [view, rows, year, selected]);

  return <div ref={host} className="relative w-full h-[520px] border border-[color:var(--hairline)] bg-white/40" />;
}

export function SliceCircle({ rows, era, year, selected, colors, onSelect }: { rows: AtlasProduction[]; era: number; year: number; selected: string | null; colors: Record<string, string>; onSelect: (id: string) => void }) {
  const ns = useMemo(() => sliceRows(rows, era, year), [rows, era, year]);
  const edges = useMemo(() => sharedTokenEdges(ns), [ns]);
  const W = 420;
  const c = W / 2;
  const R = c - 40;
  const at = (p: AtlasProduction) => {
    const r = R * p.solvability;
    return [c + Math.cos(p.theta) * r, c - Math.sin(p.theta) * r] as const;
  };
  const byId = new Map(ns.map((p) => [p.id, p]));
  const solved = ns.filter((p) => p.resolved != null && p.resolved <= year).length;
  return (
    <figure className="flex flex-col gap-2 min-w-0">
      <figcaption className="text-[13px] text-[color:var(--basalt-2)]">
        <b className="text-[color:var(--basalt)]">{ERAS[era].label}.</b> {ns.length} problems posed, {solved} resolved by {year}. Angle is embedding rank, distance from the centre is solvability, lines join problems that share a keyword.
      </figcaption>
      <svg viewBox={`0 0 ${W} ${W}`} className="w-full max-w-[420px]" role="img" aria-label={`circle graph for ${ERAS[era].label}`}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <circle key={f} cx={c} cy={c} r={R * f} fill="none" stroke="var(--hairline)" />
        ))}
        <text x={c + 4} y={c - R + 12} fontSize="10" fill="var(--basalt-3)">1.0</text>
        <text x={c + 4} y={c - R / 2 + 12} fontSize="10" fill="var(--basalt-3)">0.5</text>
        {edges.map(([a, b]) => {
          const [x1, y1] = at(byId.get(a)!);
          const [x2, y2] = at(byId.get(b)!);
          return <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--basalt-3)" strokeOpacity="0.25" />;
        })}
        {ns.map((p) => {
          const [x, y] = at(p);
          const done = p.resolved != null && p.resolved <= year;
          const on = p.id === selected;
          return (
            <g key={p.id} role="button" tabIndex={0} aria-label={p.title} className="cursor-pointer" onClick={() => onSelect(p.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(p.id)}>
              <circle cx={x} cy={y} r={on ? 8 : 5.5} fill={done ? colors[p.branch] : "var(--bone, #fff)"} stroke={colors[p.branch]} strokeWidth="2" />
              {(on || ns.length <= 24) && (
                <text x={x + (x > c ? 9 : -9)} y={y + 3} fontSize="10" textAnchor={x > c ? "start" : "end"} fill="var(--basalt)">
                  {p.title.length > 28 ? `${p.title.slice(0, 27)}…` : p.title}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

