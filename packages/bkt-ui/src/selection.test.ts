import { describe, expect, test } from "bun:test";
import { cleanMarks, MARK_CAP, MARK_SETS, readMarks, SELECTION_KEY, toggleMark, writeMarks, type MarkStorage } from "./selection";

function memory(seed: Record<string, string> = {}): MarkStorage & { data: Record<string, string> } {
  const data = { ...seed };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v), removeItem: (k) => void delete data[k] };
}

const ids = (n: number, set = "flow-set") => Array.from({ length: n }, (_, i) => `row:${set}:r${i}`);

describe("marked rows", () => {
  test("a set holds 200 marks at most", () => {
    const store = memory();
    expect(writeMarks("flow-set", ids(250), store)).toHaveLength(MARK_CAP);
    expect(readMarks("flow-set", store)).toEqual(ids(200));
    expect(toggleMark(ids(200), "row:flow-set:extra")).toEqual(ids(200));
    expect(toggleMark(ids(200), "row:flow-set:r5")).toHaveLength(199);
    expect(toggleMark(ids(2), "row:flow-set:new")).toEqual([...ids(2), "row:flow-set:new"]);
    expect(MARK_CAP).toBe(200);
  });

  test("each set keeps its own marks, and the ninth set drops the one touched longest ago", () => {
    const store = memory();
    writeMarks("flow-set", ids(3), store);
    expect(readMarks("other-set", store)).toEqual([]);
    writeMarks("other-set", ids(2, "other-set"), store);
    expect(readMarks("flow-set", store)).toEqual(ids(3));
    expect(readMarks("other-set", store)).toEqual(ids(2, "other-set"));
    expect(JSON.parse(store.data[SELECTION_KEY])).toEqual({ sets: [["other-set", ids(2, "other-set")], ["flow-set", ids(3)]] });
    for (let i = 0; i < MARK_SETS - 1; i++) writeMarks(`set-${i}`, ids(1, `set-${i}`), store);
    expect(JSON.parse(store.data[SELECTION_KEY]).sets.map((s: [string, string[]]) => s[0])).toEqual(["set-6", "set-5", "set-4", "set-3", "set-2", "set-1", "set-0", "other-set"]);
    expect(readMarks("flow-set", store)).toEqual([]);
    expect(readMarks("other-set", store)).toEqual(ids(2, "other-set"));
    writeMarks("other-set", [], store);
    expect(readMarks("other-set", store)).toEqual([]);
    expect(readMarks("set-0", store)).toEqual(ids(1, "set-0"));
    expect(MARK_SETS).toBe(8);
  });

  test("ids of another set, ids that are no row and repeats drop", () => {
    expect(cleanMarks("flow-set", ["row:flow-set:a", "row:other-set:a", "row:flow-set:a", "paper:d/10.1/x", "row:flow-set:../../etc", "/srv/data/file.csv", 7, null, "row:flow-set:b"])).toEqual(["row:flow-set:a", "row:flow-set:b"]);
    expect(cleanMarks("Bad_Set", ["row:Bad_Set:a"])).toEqual([]);
    expect(cleanMarks("flow-set", "row:flow-set:a")).toEqual([]);
    const store = memory({ [SELECTION_KEY]: JSON.stringify({ sets: [["flow-set", ["row:flow-set:a", "C:\\\\file", "row:flow-set:b"]], ["flow-set", ["row:flow-set:z"]], ["Bad_Set", ["row:Bad_Set:a"]], "junk"] }) });
    expect(readMarks("flow-set", store)).toEqual(["row:flow-set:a", "row:flow-set:b"]);
  });

  test("clearing removes the entry, and storage that is missing, broken or throwing never breaks a screen", () => {
    const store = memory();
    writeMarks("flow-set", ids(2), store);
    expect(writeMarks("flow-set", [], store)).toEqual([]);
    expect(store.data[SELECTION_KEY]).toBeUndefined();
    expect(readMarks("flow-set", memory({ [SELECTION_KEY]: "{broken" }))).toEqual([]);
    expect(readMarks("flow-set", memory({ [SELECTION_KEY]: "null" }))).toEqual([]);
    expect(readMarks("flow-set", null)).toEqual([]);
    expect(writeMarks("flow-set", ids(1), null)).toEqual(ids(1));
    const throwing: MarkStorage = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("full"); }, removeItem: () => { throw new Error("denied"); } };
    expect(readMarks("flow-set", throwing)).toEqual([]);
    expect(writeMarks("flow-set", ids(1), throwing)).toEqual(ids(1));
  });
});
