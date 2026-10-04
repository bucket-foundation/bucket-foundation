export function surfaceEligible(atoms: readonly { x?: number; y?: number; z?: number }[]): boolean {
  if (!atoms.length || atoms.length > 3000) return false;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const atom of atoms) {
    const point = [atom.x, atom.y, atom.z];
    for (let axis = 0; axis < 3; axis++) {
      const value = point[axis];
      if (value === undefined || !Number.isFinite(value)) return false;
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
    }
  }
  const extent = max.map((value, axis) => value - min[axis] + 8);
  return Math.max(...extent) <= 150 && extent.reduce((volume, value) => volume * value, 1) <= 1_000_000;
}
