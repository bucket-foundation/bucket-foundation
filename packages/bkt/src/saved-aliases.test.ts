import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { serializeSaved, type SavedState } from "../../../src/lib/explore/saved";
import { SavedStore } from "./explore";

const ALIASES = { "row:coverage-by-country:CL": "row:coverage-by-country:CHL" };
const item = (id: string) => ({ id, kind: "work", title: "Chile", authors: "", year: null, citation: "", url: null, savedAt: "2026-10-01T00:00:00Z" });

function stored(ids: string[]): Database {
  const db = new Database(":memory:");
  new SavedStore(db);
  const state = { v: 1, items: ids.map(item), noticeSeen: true } as unknown as SavedState;
  db.query("insert into explore_saved (k, v) values ('list', ?)").run(serializeSaved(state));
  return db;
}

describe("saved rows keyed by two-letter codes", () => {
  test("load under their three-letter ids and stay moved", () => {
    const db = stored(["row:coverage-by-country:CL", "row:education-by-country:IND"]);
    expect(new SavedStore(db, ALIASES).get().items.map((i) => i.id)).toEqual(["row:coverage-by-country:CHL", "row:education-by-country:IND"]);
    expect(new SavedStore(db).get().items.map((i) => i.id)).toEqual(["row:coverage-by-country:CHL", "row:education-by-country:IND"]);
  });

  test("an old id beside its new id keeps one entry", () => {
    const db = stored(["row:coverage-by-country:CHL", "row:coverage-by-country:CL"]);
    expect(new SavedStore(db, ALIASES).get().items.map((i) => i.id)).toEqual(["row:coverage-by-country:CHL"]);
  });
});
