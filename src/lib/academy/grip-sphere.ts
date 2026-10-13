import { BRANCH_ORDER, bareBranch } from "../../components/canon-globe/projections";
import { fusedConceptMastery, proficiencyScore, type StoredEngineState } from "./mastery";

export interface GripBranchInput {
  branch: string;
  atomIds: string[];
  state: StoredEngineState | null;
}

export interface GripAxis {
  branch: string;
  index: number;
  angle: number;
  atoms: number;
  current: number;
  peak: number;
}

export interface GripSphere {
  axes: GripAxis[];
  radius: number;
  peakRadius: number;
  atomWeighted: number;
  atoms: number;
}

const TAU = Math.PI * 2;

export function branchAngle(index: number): number {
  return (TAU * index) / BRANCH_ORDER.length + Math.PI / 2;
}

export function atomCurrentAndPeak(state: StoredEngineState | null, id: string): { current: number; peak: number } {
  const card = state?.cards?.[id];
  const prof = state?.prof?.[id];
  const { mastery } = fusedConceptMastery(card, prof);
  const peak = card && prof && prof.n ? Math.max(mastery, proficiencyScore(prof)) : mastery;
  return { current: mastery, peak };
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function gripSphere(inputs: GripBranchInput[]): GripSphere {
  const byBranch = new Map<string, { current: number[]; peak: number[] }>();
  for (const input of inputs) {
    const name = bareBranch(input.branch);
    if (!(BRANCH_ORDER as readonly string[]).includes(name)) continue;
    const slot = byBranch.get(name) ?? { current: [], peak: [] };
    for (const id of input.atomIds) {
      const { current, peak } = atomCurrentAndPeak(input.state, id);
      slot.current.push(current);
      slot.peak.push(peak);
    }
    byBranch.set(name, slot);
  }

  const axes: GripAxis[] = [];
  BRANCH_ORDER.forEach((branch, index) => {
    const slot = byBranch.get(branch);
    if (!slot || slot.current.length === 0) return;
    axes.push({
      branch,
      index,
      angle: branchAngle(index),
      atoms: slot.current.length,
      current: mean(slot.current),
      peak: mean(slot.peak),
    });
  });

  const all = Array.from(byBranch.values()).flatMap((s) => s.current);
  return {
    axes,
    radius: mean(axes.map((a) => a.current)),
    peakRadius: mean(axes.map((a) => a.peak)),
    atomWeighted: mean(all),
    atoms: all.length,
  };
}
