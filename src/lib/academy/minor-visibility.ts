import type { GroupRow, MemberSummary } from "./groups";

export function summariesForGroup(
  group: Pick<GroupRow, "kind" | "owner_id">,
  sums: ReadonlyMap<string, MemberSummary>,
  minorParents: ReadonlyMap<string, string | null>,
  ownerHashes: ReadonlyMap<string, string>,
): Map<string, MemberSummary> {
  const out = new Map(sums);
  if (minorParents.size === 0) return out;
  const ownerHash = ownerHashes.get(group.owner_id) ?? null;
  minorParents.forEach((parentHash, uid) => {
    const visible = group.kind === "family" && parentHash !== null && ownerHash !== null && ownerHash === parentHash;
    if (!visible) out.delete(uid);
  });
  return out;
}
