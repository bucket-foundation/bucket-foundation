import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";

mock.module("./views/Globe3d", () => ({ default: () => <div data-testid="globe">globe</div> }));

beforeAll(() => GlobalRegistrator.register());
afterAll(() => GlobalRegistrator.unregister());

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

describe("canon view", () => {
  test("draws one point per marker and switches between circle and globe", async () => {
    const { act } = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { CanonView } = await import("./views/Canon");
    const { ALL_MARKERS } = await import("@/lib/canon-explorer/markers");
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => root.render(<CanonView />));
    expect(host.querySelectorAll(".circle-view .pt").length).toBe(ALL_MARKERS.length);
    const [circle, globe] = Array.from(host.querySelectorAll(".seg button")) as HTMLButtonElement[];
    await act(async () => globe.click());
    await act(async () => new Promise((r) => setTimeout(r, 20)));
    expect(host.querySelector(".circle-view")).toBeNull();
    expect(host.querySelector('[data-testid="globe"]')).not.toBeNull();
    await act(async () => circle.click());
    expect(host.querySelectorAll(".circle-view .pt").length).toBe(ALL_MARKERS.length);
    const box = host.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await act(async () => box.click());
    expect(host.querySelectorAll(".circle-view .pt").length).toBeLessThan(ALL_MARKERS.length);
    await act(async () => root.unmount());
  });
});
