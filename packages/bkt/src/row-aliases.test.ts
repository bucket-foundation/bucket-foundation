import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { RowSetStore, rowSetReply, syncRowSets } from "./explore";

const ALIASES = { "row:coverage-by-country:CL": "row:coverage-by-country:CHL" };

describe("the row set list", () => {
  test("carries the pack's aliases so a client can move old ids", () => {
    const db = new Database(":memory:");
    db.run("create table meta (k text primary key, v text not null)");
    syncRowSets(db, { version: "v2", sets: [], aliases: ALIASES });
    expect(rowSetReply(new RowSetStore(db), new URL("http://x/local/explore/rows")).body).toEqual({ datasets: [], aliases: ALIASES });
    syncRowSets(db, null);
    expect(new RowSetStore(db).aliases()).toEqual({});
  });
});
