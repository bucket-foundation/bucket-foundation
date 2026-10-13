export const MARK_RING = { radius: 2.2, tube: 0.28, grow: 1.25 } as const;

export function markRing(node: { id: string; size: number }, marked: ReadonlySet<string> | undefined): { radius: number; tube: number; size: number } | null {
  if (!marked?.has(node.id)) return null;
  return { radius: node.size * MARK_RING.radius, tube: node.size * MARK_RING.tube, size: node.size * MARK_RING.grow };
}
