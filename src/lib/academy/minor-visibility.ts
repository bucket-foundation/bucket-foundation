import type { GroupRow, MemberSummary } from "./groups";

export function summariesForGroup(
  group: Pick<GroupRow, "kind" | "owner_id">,
  sums: ReadonlyMap<string, MemberSummary>,
  minorParents: ReadonlyMap<string, string | null>,
): Map<string, MemberSummary> {
  const out = new Map(sums);
  minorParents.forEach((parentId, uid) => {
    if (!(group.kind === "family" && parentId !== null && parentId === group.owner_id)) out.delete(uid);
  });
  return out;
}
