import { ELEMENTS, elementByZ } from "@/lib/explore/modes/atom";
import isotopes from "./isotopes.json";

export type AtomView = "particles" | "elements" | "shells";
export type ParticleKind = "proton" | "neutron" | "electron";
export const PARTICLE_COLORS: Record<ParticleKind, string> = { proton: "#bd6946", neutron: "#7b8b76", electron: "#5686b1" };

export function isotopesOf(z: number) {
  return isotopes.elements.find((entry) => entry.z === z)!;
}

export function particleCounts(z: number, mass: number) {
  if (!Number.isSafeInteger(z) || !Number.isSafeInteger(mass) || z < 1 || z > 118 || mass < z || mass > 400) {
    throw new Error("Choose a valid isotope.");
  }
  return { proton: z, neutron: mass - z, electron: z };
}

export function circlePoint(index: number, count: number, radius = 180): [number, number] {
  const angle = index / Math.max(1, count) * Math.PI * 2 - Math.PI / 2;
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

export function particleCircle(z: number, mass: number) {
  const counts = particleCounts(z, mass);
  const kinds = (Object.keys(counts) as ParticleKind[]).flatMap((kind) => Array.from({ length: counts[kind] }, () => kind));
  return kinds.map((kind, index) => ({ id: `${kind}:${index}`, kind, position: circlePoint(index, kinds.length), color: PARTICLE_COLORS[kind] }));
}

export function elementCircle() {
  return ELEMENTS.map((element, index) => ({ ...element, position: circlePoint(index, ELEMENTS.length) }));
}

export function isotopeName(z: number, mass: number) {
  return `${elementByZ(z).name}-${mass}`;
}
