import { describe, expect, test } from "bun:test";

describe("canon markers", () => {
  test("counts follow the year, kind and branch filters", async () => {
    const { ALL_EVENTS, ALL_SITES, ALL_MARKERS, MAX_YEAR, markersAt } = await import("@/lib/canon-explorer/markers");
    expect(ALL_MARKERS.length).toBe(ALL_EVENTS.length + ALL_SITES.length);
    expect(markersAt(MAX_YEAR, { figures: true, sites: true })).toHaveLength(ALL_MARKERS.length);
    expect(markersAt(MAX_YEAR, { figures: true, sites: false })).toHaveLength(ALL_EVENTS.length);
    expect(markersAt(MAX_YEAR, { figures: false, sites: true })).toHaveLength(ALL_SITES.length);
    expect(markersAt(0, { figures: true, sites: true }).every((m) => (m.year ?? 0) <= 0)).toBe(true);
    const physics = markersAt(MAX_YEAR, { figures: true, sites: true, branch: "physics" });
    expect(physics.length).toBeGreaterThan(0);
    expect(physics.every((m) => m.branch.replace(/^\d+-/, "") === "physics")).toBe(true);
  });
});
