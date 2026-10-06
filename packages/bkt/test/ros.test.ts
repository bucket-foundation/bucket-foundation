import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { staffData } from "../src/pack/staff";
import { BUNDLED_ROS, bundledRos, rosRoutes } from "../src/ros";

const REPO = join(import.meta.dir, "../../..");

describe("staff-gated Research OS data", () => {
  test("is left out of the build unless BKT_INCLUDE_STAFF_DATA=1", () => {
    expect(staffData(REPO, {})).toEqual({});
    expect(staffData(REPO, { BKT_INCLUDE_STAFF_DATA: "true" })).toEqual({});
    expect(Object.keys(staffData(REPO, { BKT_INCLUDE_STAFF_DATA: "1" })).sort()).toEqual(["patents", "similarity", "software", "solvability"]);
  });

  test("the default content ships no staff data and the routes answer 404", async () => {
    expect(Object.values(BUNDLED_ROS).filter(Boolean)).toEqual([]);
    const routes = rosRoutes(bundledRos({}));
    for (const r of ["solvability", "software", "patents", "primes"]) {
      const res = await routes[`GET /local/ros/${r}`](new Request(`http://x/local/ros/${r}`), new URL(`http://x/local/ros/${r}`));
      expect(res.status).toBe(404);
    }
  });
});
