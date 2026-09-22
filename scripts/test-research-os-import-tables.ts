/**
 * ros-import 3's table reader, src/lib/research-os/import-tables.ts.
 * Pure, no database. Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-import-tables.ts
 *
 * The cases that matter are the ones where a cheaper implementation is
 * wrong: a quoted newline, a value that only disagrees with the column's
 * type near the end of the file, and a date written in a locale order.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  DISTINCT_CAP,
  PREVIEW_ROWS,
  isMissing,
  parseDelimited,
  readTableSchema,
  sniffDelimiter,
  typeOf,
  widen,
} from "../src/lib/research-os/import-tables";

test("a quoted field keeps its delimiters and its newlines", () => {
  const rows = parseDelimited('a,b\n"x,y","line one\nline two"\n', ",");
  assert.deepEqual(rows, [
    ["a", "b"],
    ["x,y", "line one\nline two"],
  ]);
  // Splitting on "\n" would report three rows and tear the second one,
  // which is what happens to any table whose cells carry prose.
  assert.equal(rows.length, 2);
});

test("a doubled quote inside a quoted field is one quote", () => {
  assert.deepEqual(parseDelimited('a\n"she said ""no"""\n', ","), [["a"], ['she said "no"']]);
});

test("a file with no trailing newline still ends on a row", () => {
  assert.deepEqual(parseDelimited("a,b\n1,2", ","), [["a", "b"], ["1", "2"]]);
});

test("a type widens on the value that disagrees, however late it comes", () => {
  // 999 integer rows then one that is not. Sampling the head calls this
  // column integer, the form offers it for arithmetic, and the run
  // fails on a value the schema said could not be there.
  const rows = ["n"].concat(Array.from({ length: 999 }, (_, i) => String(i + 1))).concat(["n/a but written oddly"]);
  const schema = readTableSchema(rows.join("\n"));
  assert.equal(schema.columns[0].type, "text", "one disagreeing value at the end decides the column");
  assert.equal(schema.rows, 1000);
});

test("integer widens to number and nothing else widens", () => {
  assert.equal(widen("integer", "number"), "number");
  assert.equal(widen("number", "integer"), "number");
  assert.equal(widen("integer", "integer"), "integer");
  assert.equal(widen("integer", "date"), "text");
  assert.equal(widen("boolean", "number"), "text");
  assert.equal(widen("text", "text"), "text");
});

test("a locale-ordered date is text", () => {
  // 03/04/2026 is two different days depending on who wrote it, and a
  // guess here turns a run's answer into a coin flip.
  assert.equal(typeOf("03/04/2026"), "text");
  assert.equal(typeOf("2026-03-04"), "date");
  assert.equal(typeOf("2026-03-04T11:22:33Z"), "date");
  assert.equal(typeOf("2026-03-04 11:22"), "date");
});

test("the numeric types are the ones a form can do arithmetic on", () => {
  assert.equal(typeOf("42"), "integer");
  assert.equal(typeOf("-42"), "integer");
  assert.equal(typeOf("4.2"), "number");
  assert.equal(typeOf(".5"), "number");
  assert.equal(typeOf("1e9"), "number");
  assert.equal(typeOf("1,000"), "text", "a thousands separator is not a number here");
  assert.equal(typeOf("0x1f"), "text");
  assert.equal(typeOf("true"), "boolean");
  assert.equal(typeOf("hello"), "text");
});

test("an empty cell and a written NA are both missing", () => {
  for (const v of ["", "  ", "NA", "n/a", "NULL", "NaN", "none", "-", "--"]) {
    assert.equal(isMissing(v), true, `${JSON.stringify(v)} is missing`);
  }
  assert.equal(isMissing("0"), false, "zero is a value");
  assert.equal(isMissing("false"), false);
  assert.equal(isMissing("not applicable"), false, "only the listed tokens count");
});

test("counts, distinct values and a sample come back per column", () => {
  const csv = ["id,city,score", "1,Oslo,10", "2,Oslo,", "3,Lima,7", "4,,NA"].join("\n");
  const s = readTableSchema(csv);
  assert.equal(s.rows, 4);
  assert.equal(s.delimiter, ",");

  const [id, city, score] = s.columns;
  assert.equal(id.type, "integer");
  assert.equal(id.present, 4);
  assert.equal(id.missing, 0);
  assert.equal(id.distinct, 4);

  assert.equal(city.type, "text");
  assert.equal(city.present, 3, "the empty cell is missing");
  assert.equal(city.missing, 1);
  assert.equal(city.distinct, 2, "Oslo twice is one distinct value");
  assert.deepEqual(city.sample, ["Oslo", "Oslo", "Lima"]);

  assert.equal(score.type, "integer");
  assert.equal(score.present, 2, "an empty cell and a written NA are both missing");
  assert.equal(score.missing, 2);
});

test("a column with nothing in it is text rather than a guess", () => {
  const s = readTableSchema(["a,b", "1,", "2,"].join("\n"));
  assert.equal(s.columns[1].type, "text");
  assert.equal(s.columns[1].present, 0);
  assert.equal(s.columns[1].missing, 2);
});

test("an unnamed column is named by its position", () => {
  const s = readTableSchema(["a,,c", "1,2,3"].join("\n"));
  assert.deepEqual(s.columns.map((c) => c.name), ["a", "column_2", "c"]);
  assert.deepEqual(s.columns.map((c) => c.index), [0, 1, 2]);
});

test("two columns sharing a name stay apart", () => {
  const s = readTableSchema(["x,x", "1,hello"].join("\n"));
  assert.equal(s.columns.length, 2);
  assert.deepEqual(s.columns.map((c) => c.index), [0, 1]);
  assert.equal(s.columns[0].type, "integer");
  assert.equal(s.columns[1].type, "text");
});

test("a short row is counted as ragged and padded in the preview", () => {
  const s = readTableSchema(["a,b,c", "1,2", "3,4,5"].join("\n"));
  assert.equal(s.ragged, 1);
  assert.deepEqual(s.preview[0], ["1", "2", ""], "the preview is rectangular for a table view");
  assert.equal(s.columns[2].missing, 1, "the absent field counts as missing, not as present");
});

test("the preview stops at its cap and the distinct count says when it did", () => {
  const rows = ["v"].concat(Array.from({ length: DISTINCT_CAP + 50 }, (_, i) => `item-${i}`));
  const s = readTableSchema(rows.join("\n"));
  assert.equal(s.preview.length, PREVIEW_ROWS);
  assert.equal(s.columns[0].distinct, DISTINCT_CAP);
  assert.equal(s.columns[0].distinctCapped, true, "the caller is told the real count is higher");
});

test("a tab-separated file is read as one", () => {
  const tsv = ["a\tb", "1\thello, world"].join("\n");
  assert.equal(sniffDelimiter(tsv), "\t");
  const s = readTableSchema(tsv);
  assert.equal(s.delimiter, "\t");
  assert.equal(s.columns.length, 2);
  assert.equal(s.columns[1].sample[0], "hello, world", "a comma inside a tab-separated cell is data");
});

test("prose with commas does not read as a wide table", () => {
  const s = readTableSchema(["note", "one, two, and three", "four, five"].join("\n"));
  assert.equal(s.columns.length, 1, "a single-column file stays one column");
});

test("an empty file yields an empty schema rather than a throw", () => {
  const s = readTableSchema("");
  assert.deepEqual(s.columns, []);
  assert.equal(s.rows, 0);
  assert.deepEqual(s.preview, []);
});

test("a header with no data rows still describes its columns", () => {
  const s = readTableSchema("a,b,c\n");
  assert.deepEqual(s.columns.map((c) => c.name), ["a", "b", "c"]);
  assert.equal(s.rows, 0);
  assert.equal(s.columns[0].type, "text", "no value has said otherwise");
});
