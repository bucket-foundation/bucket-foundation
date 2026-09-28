export const MAX_CLOSURE_NODES = 5000;
export const MAX_CLOSURE_EDGES = 25000;

export type Parents = ReadonlyMap<string, readonly string[]>;

export type PlanResult =
  | {
      status: "ready";
      target: string;
      required: string[];
      mastered: string[];
      remaining: string[];
      ready: string[];
      studyOrder: string[];
      chain: string[];
    }
  | { status: "cycle"; target: string }
  | { status: "missing_node"; target: string }
  | { status: "mastery_conflict"; target: string; nodes: string[] }
  | { status: "limit"; target: string };

function sortedParents(parents: Parents, v: string): string[] {
  return Array.from(new Set(parents.get(v) ?? [])).sort();
}

export function closureOrder(parents: Parents, target: string, maxNodes = MAX_CLOSURE_NODES): { order: string[] } | { error: "cycle" | "missing_node" | "limit" } {
  if (!parents.has(target)) return { error: "missing_node" };
  const done = new Set<string>();
  const onStack = new Set<string>();
  const order: string[] = [];
  const stack: { v: string; ps: string[]; i: number }[] = [{ v: target, ps: sortedParents(parents, target), i: 0 }];
  onStack.add(target);
  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    if (top.i < top.ps.length) {
      const p = top.ps[top.i++];
      if (!parents.has(p)) return { error: "missing_node" };
      if (onStack.has(p)) return { error: "cycle" };
      if (done.has(p)) continue;
      if (done.size + onStack.size >= maxNodes) return { error: "limit" };
      onStack.add(p);
      stack.push({ v: p, ps: sortedParents(parents, p), i: 0 });
      continue;
    }
    stack.pop();
    onStack.delete(top.v);
    done.add(top.v);
    order.push(top.v);
  }
  return { order };
}

export function explanatoryChain(parents: Parents, target: string, closure: ReadonlySet<string>): string[] {
  const prev = new Map<string, string | null>([[target, null]]);
  let frontier = [target];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const v of frontier.slice().sort()) {
      const ps = sortedParents(parents, v).filter((p) => closure.has(p));
      if (ps.length === 0) {
        const chain: string[] = [];
        for (let cur: string | null = v; cur !== null; cur = prev.get(cur) ?? null) chain.push(cur);
        return chain;
      }
      for (const p of ps) {
        if (!prev.has(p)) {
          prev.set(p, v);
          next.push(p);
        }
      }
    }
    frontier = next;
  }
  return [target];
}

export function checkCertificate(parents: Parents, mastered: ReadonlySet<string>, target: string, order: readonly string[], remaining: readonly string[]): boolean {
  if (order.length !== remaining.length) return false;
  const need = new Set(remaining);
  const known = new Set(mastered);
  for (const v of order) {
    if (!need.has(v) || known.has(v)) return false;
    if (!sortedParents(parents, v).every((p) => known.has(p))) return false;
    known.add(v);
  }
  if (!known.has(target)) return false;
  return Array.from(need).every((v) => known.has(v));
}

export function planPath(parents: Parents, target: string, mastery: ReadonlySet<string>, maxNodes = MAX_CLOSURE_NODES): PlanResult {
  const walked = closureOrder(parents, target, maxNodes);
  if ("error" in walked) return { status: walked.error, target };
  const closure = new Set(walked.order);
  const mastered = walked.order.filter((v) => mastery.has(v));
  const conflicts = mastered.filter((v) => !sortedParents(parents, v).every((p) => mastery.has(p)));
  if (conflicts.length > 0) return { status: "mastery_conflict", target, nodes: conflicts.sort() };
  const masteredSet = new Set(mastered);
  const remaining = walked.order.filter((v) => !masteredSet.has(v));
  const ready = remaining.filter((v) => sortedParents(parents, v).every((p) => masteredSet.has(p))).sort();
  if (!checkCertificate(parents, masteredSet, target, remaining, remaining) && remaining.length > 0) return { status: "limit", target };
  return {
    status: "ready",
    target,
    required: walked.order.slice().sort(),
    mastered: mastered.slice().sort(),
    remaining: remaining.slice().sort(),
    ready,
    studyOrder: remaining,
    chain: explanatoryChain(parents, target, closure),
  };
}
