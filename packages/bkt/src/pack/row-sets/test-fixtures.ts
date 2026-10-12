import { MODE_IDS, type AssembleContext, type RowSetDraft } from "./contract";
import { FEDERAL, REGISTRY, RESTRICTED, type LicenceEntry } from "./licences";

export const FIXTURE_REGISTRY: LicenceEntry[] = [
  { id: "open", match: { system: ["open"] }, licence: FEDERAL, share_alike: false, public: "rows", attribution: { source: "Open source", url: "https://example.org/open", notice: "A public domain fixture." } },
  { id: "by", match: { system: ["by"] }, licence: "CC-BY-4.0", share_alike: false, public: "rows", attribution: { source: "Attributed source", url: "https://example.org/by", notice: "Used under CC BY 4.0." } },
  { id: "alike", match: { system: ["alike"] }, licence: "CC-BY-SA-4.0", share_alike: true, public: "rows", attribution: { source: "Share-alike source", url: "https://example.org/alike", notice: "Used under CC BY-SA 4.0." } },
  { id: "codes", match: { system: ["codes"] }, licence: "CC-BY-4.0", share_alike: false, public: "codes", attribution: { source: "Codes source", url: "https://example.org/codes", notice: "Codes alone." } },
  { id: "closed", match: { system: ["closed"] }, licence: RESTRICTED, share_alike: false, public: "none", attribution: { source: "Closed source", url: "", notice: "" } },
];

export function fixtureContext(over: Partial<AssembleContext> = {}): AssembleContext {
  return { registry: FIXTURE_REGISTRY, modes: MODE_IDS, reserved: new Set(["canon", "sample", "advisors"]), places: new Set(["US", "CL"]), atoms: null, built: "fixture", ...over };
}

export function repoFixtureContext(): AssembleContext {
  return fixtureContext({ registry: REGISTRY, places: new Set() });
}

export function fixtureDraft(over: Partial<RowSetDraft> = {}): RowSetDraft {
  return {
    id: "fixture-set",
    label: "Fixture set",
    audience: "public",
    modes: ["graph"],
    groups: [
      { id: "a", label: "Group A", color: "#2f6f8f" },
      { id: "b", label: "Group B", color: "#8a5a2b" },
    ],
    rows: [
      { key: "one", title: "First row", sub: "A-1", group: "a", source: "open", year: 1990, url: "https://example.org/one", links: [{ to: "two", weight: 3 }, { to: "three", weight: 1 }], from: 1980, to: 1995, weight: 12 },
      { key: "two", title: "Second row", sub: "B-2", group: "b", source: "by", year: null, url: null, links: [{ to: "three", weight: 2 }], from: 1985, to: null, weight: 4 },
      { key: "three", title: "Third row", sub: "3 rows", group: "a", source: "open", links: [], from: null, to: 2020, weight: null },
    ],
    axis: { from: 1980, to: 2020, scale: "linear", unit: "year" },
    layout: "ring",
    ...over,
  };
}
