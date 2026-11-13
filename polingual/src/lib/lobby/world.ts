export const MAP_W = 720;
export const MAP_H = 360;

export interface Topology {
  transform: { scale: [number, number]; translate: [number, number] };
  arcs: [number, number][][];
  objects: Record<string, { type: string; geometries?: { type: string; arcs: number[][][] | number[][] }[] }>;
}

export function project(lon: number, lat: number): [number, number] {
  return [((lon + 180) / 360) * MAP_W, ((90 - lat) / 180) * MAP_H];
}

export function unproject(x: number, y: number): [number, number] {
  return [90 - (y / MAP_H) * 180, (x / MAP_W) * 360 - 180];
}

export function decodeArcs(topo: Topology): [number, number][][] {
  const [sx, sy] = topo.transform.scale;
  const [tx, ty] = topo.transform.translate;
  return topo.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * sx + tx, y * sy + ty] as [number, number];
    });
  });
}

function ring(arcs: [number, number][][], indices: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const i of indices) {
    const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
    out.push(...(out.length ? a.slice(1) : a));
  }
  return out;
}

export function landPath(topo: Topology, name = "land"): string {
  const arcs = decodeArcs(topo);
  const parts: string[] = [];
  for (const g of topo.objects[name]?.geometries ?? []) {
    const polygons = (g.type === "Polygon" ? [g.arcs] : g.arcs) as number[][][];
    for (const poly of polygons) {
      for (const r of poly) {
        const pts = ring(arcs, r).map(([lon, lat]) => project(lon, lat));
        if (pts.length < 3) continue;
        let d = "";
        let prev: [number, number] | null = null;
        for (const p of pts) {
          const jump = prev && Math.abs(p[0] - prev[0]) > MAP_W / 2;
          d += `${!prev || jump ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
          prev = p;
        }
        parts.push(`${d}Z`);
      }
    }
  }
  return parts.join("");
}
