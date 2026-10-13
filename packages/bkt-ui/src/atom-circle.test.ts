import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { elementCircle, isotopesOf, particleCircle, particleCounts } from "./explore/atom-circle";
import isotopes from "./explore/isotopes.json";

describe("atom circle data", () => {
  test("every element has unique valid isotopes and an available default", () => {
    expect(isotopes.elements.length).toBe(118);
    expect(new Set(isotopes.elements.map((entry) => entry.z)).size).toBe(118);
    for (const entry of isotopes.elements) {
      expect(Number.isSafeInteger(entry.z)).toBe(true);
      expect(entry.masses).toContain(entry.defaultMass);
      expect(new Set(entry.masses).size).toBe(entry.masses.length);
      expect(entry.masses.every((mass) => Number.isSafeInteger(mass) && mass >= entry.z)).toBe(true);
    }
    expect(isotopesOf(6).defaultMass).toBe(12);
    expect(isotopesOf(28).defaultMass).toBe(58);
    expect(isotopesOf(92).defaultMass).toBe(238);
  });

  test("neutral particle counts replay Lean vectors", () => {
    const vectors = readFileSync(new URL("../../../lean/vectors/atom-counts.txt", import.meta.url), "utf8").trim().split("\n");
    for (const line of vectors) {
      const [z, mass, proton, neutron, electron] = line.split(" ").map(Number);
      expect(particleCounts(z, mass)).toEqual({ proton, neutron, electron });
    }
    for (const [z, mass] of [[0, 0], [119, 300], [6, 5], [6, 12.5], [NaN, 12], [6, Infinity]]) {
      expect(() => particleCounts(z, mass)).toThrow();
    }
  });

  test("each catalog isotope puts every particle on one circle", () => {
    for (const { z, masses } of isotopes.elements) for (const mass of masses) {
      const points = particleCircle(z, mass);
      expect(points.length).toBe(mass + z);
      expect(points.filter((point) => point.kind === "proton").length).toBe(z);
      expect(points.filter((point) => point.kind === "neutron").length).toBe(mass - z);
      expect(points.filter((point) => point.kind === "electron").length).toBe(z);
      expect(points.every((point) => Math.abs(Math.hypot(...point.position) - 180) < 1e-9)).toBe(true);
    }
  });

  test("the element circle contains all 118 elements in atomic-number order", () => {
    const points = elementCircle();
    expect(points.map((point) => point.z)).toEqual(Array.from({ length: 118 }, (_, index) => index + 1));
    expect(points.every((point) => Math.abs(Math.hypot(...point.position) - 180) < 1e-9)).toBe(true);
  });
});
