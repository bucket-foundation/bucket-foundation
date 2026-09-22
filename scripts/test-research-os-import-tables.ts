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
  cutAtRowBoundary,
  DISTINCT_CAP,
  PREVIEW_ROWS,
  SAMPLE_VALUES,
  isMissing,
  parseCells,
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
  for (const v of ["", "  ", "NA", "n/a", "NULL", "NaN", "none"]) {
    assert.equal(isMissing(v), true, `${JSON.stringify(v)} is missing`);
  }
  assert.equal(isMissing("0"), false, "zero is a value");
  assert.equal(isMissing("false"), false);
  assert.equal(isMissing("-"), false, "a dash is data; see the dash case below");
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

test("a CR-only file is read as rows rather than run together", () => {
  // Excel still writes "CSV (Macintosh)". Dropping CR unconditionally
  // gave this file one row holding the whole text, columns named
  // ["a","b1","23","4"], and rows: 0 with nothing to say so.
  const s = readTableSchema("a,b\r1,2\r3,4\r");
  assert.deepEqual(s.columns.map((c) => c.name), ["a", "b"]);
  assert.equal(s.rows, 2);
  assert.deepEqual(s.preview[0], ["1", "2"]);
});

test("CRLF and LF read the same as CR", () => {
  const lf = readTableSchema("a,b\n1,2\n");
  const crlf = readTableSchema("a,b\r\n1,2\r\n");
  const cr = readTableSchema("a,b\r1,2\r");
  for (const s of [crlf, cr]) {
    assert.equal(s.rows, lf.rows);
    assert.deepEqual(s.columns.map((c) => c.name), lf.columns.map((c) => c.name));
  }
});

test("a quoted missing token is a value", () => {
  // The docstring promised this and the parser threw quotedness away
  // before the missing rule ran, so the one escape hatch did not exist.
  const s = readTableSchema('v\n"NA"\nx\n');
  assert.equal(s.columns[0].present, 2);
  assert.equal(s.columns[0].missing, 0);
  assert.deepEqual(s.columns[0].sample, ["NA", "x"]);

  const bare = readTableSchema("v\nNA\nx\n");
  assert.equal(bare.columns[0].present, 1, "unquoted NA is still missing");
  assert.equal(bare.columns[0].missing, 1);
});

test("a value arithmetic cannot round-trip is text", () => {
  assert.equal(typeOf("007"), "text", "a zip code keeps its width");
  assert.equal(typeOf("0"), "integer", "a single zero is a number");
  assert.equal(typeOf("-0"), "integer");
  assert.equal(typeOf("9007199254740993"), "text", "past MAX_SAFE_INTEGER the last digits are lost");
  assert.equal(typeOf("9007199254740991"), "integer", "the boundary itself is safe");
  assert.equal(typeOf("1e999"), "text", "this parses to Infinity");
  assert.equal(typeOf("1e3"), "number");
});

test("a date that names no day is text", () => {
  assert.equal(typeOf("2026-13-45"), "text");
  assert.equal(typeOf("2026-02-30"), "text");
  assert.equal(typeOf("2026-02-28"), "date");
  assert.equal(typeOf("2026-12-31T23:59:59Z"), "date");
});

test("a dash is data", () => {
  // A column that writes a dash read as entirely empty, and it is the
  // token most likely to mean something.
  const s = readTableSchema("mark\n-\n--\n-\n");
  assert.equal(s.columns[0].present, 3);
  assert.equal(s.columns[0].missing, 0);
  assert.equal(isMissing("-"), false);
  assert.equal(isMissing("NA"), true, "the written absences still count");
});

test("a caller may name its own missing tokens", () => {
  assert.equal(isMissing("-", ["-"]), true);
  assert.equal(isMissing("na", ["-"]), false, "the caller's set replaces the default");
});

test("a file that ends inside a quote says so", () => {
  // An unescaped quote swallows the rest of the file into one field, so
  // the rows that come back are a fabrication.
  const bad = readTableSchema('a,b\n"oops,2\n3,4\n');
  assert.equal(bad.malformed, true);
  assert.equal(readTableSchema("a,b\n1,2\n").malformed, false);
});

test("a date types the same in every timezone", () => {
  // The first calendar check built a Date and compared its UTC rendering
  // against the literal, so an offsetless datetime read as local time and
  // rendered as UTC: 2026-03-04T23:30 was a date in UTC and text in New
  // York. The same bytes gave two answers by host clock, which is the
  // failure the date rule exists to prevent.
  const saved = process.env.TZ;
  try {
    for (const tz of ["UTC", "America/New_York", "Pacific/Kiritimati", "Asia/Kolkata"]) {
      process.env.TZ = tz;
      assert.equal(typeOf("2026-03-04T23:30"), "date", tz);
      assert.equal(typeOf("2026-03-04"), "date", tz);
      assert.equal(typeOf("2026-02-30"), "text", tz);
      assert.equal(typeOf("2024-02-29"), "date", `${tz}: a leap day exists`);
      assert.equal(typeOf("2026-02-29"), "text", `${tz}: and only in a leap year`);
    }
  } finally {
    // TZ is unset here and in CI, so `saved` is undefined and assigning
    // it writes the string "undefined", which names no zone and which
    // every test below would then run under.
    if (saved === undefined) delete process.env.TZ;
    else process.env.TZ = saved;
  }
});

test("an hour or an offset outside its range is text", () => {
  assert.equal(typeOf("2026-03-04T25:00"), "text");
  assert.equal(typeOf("2026-03-04T12:61"), "text");
  assert.equal(typeOf("2026-03-04T12:00:00+15:00"), "text", "no offset runs past 14 hours");
  assert.equal(typeOf("2026-03-04T12:00:00+05:30"), "date");
  assert.equal(typeOf("2026-03-04T12:00:00Z"), "date");
});

test("a quoted empty cell is a row", () => {
  // The blank-row filter ignored quotedness while the missing rule
  // honoured it, so a lone "" row vanished and a three-row file said two.
  const s = readTableSchema('v\n1\n""\n2\n');
  assert.equal(s.rows, 3);
  assert.equal(s.columns[0].present, 3, "the quoted empty is a value");
  assert.equal(readTableSchema("v\n1\n\n2\n").rows, 2, "an unquoted blank line is still skipped");
});

test("the parse reports an unterminated quote to its caller", () => {
  // It rode on module state, so an exported parser gave its callers no
  // way to ask.
  const bad = parseCells('a,b\n1,"unclosed\n2,3\n', ",");
  assert.equal(bad.unterminated, true);
  assert.equal(parseCells("a,b\n1,2\n", ",").unterminated, false);
  assert.deepEqual(parseDelimited("a,b\n1,2\n", ","), [["a", "b"], ["1", "2"]], "the old shape is unchanged");
});

test("a caller's missing tokens reach the schema", () => {
  // The comment promised this and only isMissing accepted it, which is
  // the round-one defect one layer up.
  const s = readTableSchema("mark\n-\n5\n", ",", { missingTokens: ["", "-"] });
  assert.equal(s.columns[0].missing, 1);
  assert.equal(s.columns[0].present, 1);
  assert.equal(readTableSchema("mark\n-\n5\n").columns[0].missing, 0, "the default still keeps the dash");
});

test("a ragged table still sniffs its own delimiter", () => {
  // Unanimity over ten rows meant one short row zeroed a correct
  // delimiter, and this reader counts ragged rows because it expects
  // them.
  assert.equal(sniffDelimiter("a\tb\tc\n1\t2\t3\n4\t5\n6\t7\t8\n"), "\t");
  assert.equal(readTableSchema("a\tb\tc\n1\t2\t3\n4\t5\n6\t7\t8\n").columns.length, 3);
  assert.equal(sniffDelimiter("note\none, two, and three\nfour, five\n"), ",", "prose is still one column");
});

test("the distinct cap flags only a count that was cut", () => {
  const exact = ["v"].concat(Array.from({ length: DISTINCT_CAP }, (_, i) => `v-${i}`));
  const over = ["v"].concat(Array.from({ length: DISTINCT_CAP + 5 }, (_, i) => `v-${i}`));
  const e = readTableSchema(exact.join("\n")).columns[0];
  const o = readTableSchema(over.join("\n")).columns[0];
  assert.equal(e.distinct, DISTINCT_CAP);
  assert.equal(e.distinctCapped, false, "an exact cap is an exact count");
  assert.equal(o.distinct, DISTINCT_CAP);
  assert.equal(o.distinctCapped, true);
});

test("the agreement threshold is pinned at both sides of its boundary", () => {
  // Round 3 found the comment saying two thirds over code saying 0.6,
  // and raising the code to match turned a ragged TSV back into one text
  // column. 0.6 is the number the reader needs, and these two hold it:
  // loosening it to 0.2 or tightening it to 2/3 fails one of them.
  const threeOfFive = "a\tb\n1\t2\n3\t4\nplain line\nanother plain\n";
  assert.equal(sniffDelimiter(threeOfFive), "\t", "three rows in five agree, which is exactly the threshold");

  const threeOfSix = "a\tb\n1\t2\n3\t4\nplain line\nanother plain\nthird plain\n";
  assert.equal(sniffDelimiter(threeOfSix), ",", "three in six is below it");
});

test("the header has to be a row of the table", () => {
  // A CSV whose note column contains a tab gives tab the widths
  // [1,2,2,2,2]: four rows in five agree, which passes on share alone
  // and hands the file to the wrong delimiter. The header is width 1
  // under tab, so tab does not describe this file.
  const csvWithTabs = "id,note\n1,hello, there\tx\n2,hi\ty\n3,yo\tz\n4,hey\tw\n";
  assert.equal(sniffDelimiter(csvWithTabs), ",");
  assert.deepEqual(readTableSchema(csvWithTabs).columns.map((c) => c.name), ["id", "note"]);
});

test("blank lines between rows do not decide the delimiter", () => {
  // readTableSchema deletes these before counting; the sniffer counted
  // them as width-1 rows forty lines away, so this read as one text
  // column named "a\tb" with ragged 0 and nothing to say why.
  const spaced = "a\tb\n\n1\t2\n\n3\t4\n\n5\t6\n";
  assert.equal(sniffDelimiter(spaced), "\t");
  const s = readTableSchema(spaced);
  assert.deepEqual(s.columns.map((c) => c.name), ["a", "b"]);
  assert.equal(s.rows, 3);
});

test("a file cut at the size limit is not a malformed file", () => {
  // The cut used to land inside a quote at a rate set by how long the
  // cells are, so a well-formed CSV of quoted prose, which is the shape
  // the limit exists for, came back malformed.
  assert.equal(cutAtRowBoundary('a,b\n1,"x,y"\n2,3\n', 9), "a,b\n", "the cut backs up to the last boundary outside a quote");
  assert.equal(cutAtRowBoundary("a,b\n1,2\n", 100), "a,b\n1,2\n", "a file under the limit is untouched");
  assert.equal(cutAtRowBoundary("no newline at all", 5), "no ne", "one row longer than the limit has no boundary to find");

  const openQuote = 'a,b\n1,"' + "x".repeat(50) + "\n";
  assert.equal(readTableSchema(openQuote).malformed, true, "a file that really ends inside a quote still says so");
});

test("1900 is not a leap year and 2000 is", () => {
  // The century rule had no test, so deleting it left the suite green
  // while 1900-02-29 typed as a date.
  assert.equal(readTableSchema("d\n1900-02-29\n").columns[0].type, "text");
  assert.equal(readTableSchema("d\n2000-02-29\n").columns[0].type, "date");
  assert.equal(readTableSchema("d\n2024-02-29\n").columns[0].type, "date");
  assert.equal(readTableSchema("d\n2023-02-29\n").columns[0].type, "text");
});

test("an offset minute past 59 is not an offset", () => {
  assert.equal(readTableSchema("d\n2026-01-01T00:00+01:30\n").columns[0].type, "date");
  assert.equal(readTableSchema("d\n2026-01-01T00:00+01:60\n").columns[0].type, "text");
  assert.equal(readTableSchema("d\n2026-01-01T00:00+01:99\n").columns[0].type, "text");
});

test("the sample stops at SAMPLE_VALUES", () => {
  const many = "v\n" + ["a", "b", "c", "d", "e", "f"].join("\n") + "\n";
  assert.equal(readTableSchema(many).columns[0].sample.length, SAMPLE_VALUES);
});

test("a row with more fields than the header is ragged too", () => {
  // Only short rows were counted, so a row carrying extra values passed
  // as well-formed while the extras reached nothing.
  const overWide = readTableSchema("a,b\n1,2,3,4\n5,6\n");
  assert.equal(overWide.ragged, 1, "the long row is ragged");
  assert.deepEqual(overWide.preview[0], ["1", "2"], "and its extra fields are gone, which is what ragged says");
});

test("a caller's own missing tokens still treat an empty cell as missing", () => {
  // isMissing took the caller's set whole, so a set written without ""
  // made every empty cell a present value, against this module's header
  // and against ColumnSchema.missing.
  const s = readTableSchema("a,b\n,1\n,2\n", ",", { missingTokens: ["-"] });
  assert.equal(s.columns[0].missing, 2, "an empty cell is missing whatever the set says");
  assert.equal(s.columns[0].present, 0);

  const dash = readTableSchema("a\n-\n", ",", { missingTokens: ["-"] });
  assert.equal(dash.columns[0].missing, 1, "and the caller's own token is honoured");
});

test("past the size limit the schema describes a prefix and says so", () => {
  // MAX_TEXT_CHARS and `truncated` were exported and imported by
  // nothing, so removing the truncation entirely left the suite green.
  // maxChars reaches the same path without building 20 MB.
  const text = "a,b\n1,2\n3,4\n5,6\n7,8\n";
  const whole = readTableSchema(text);
  assert.equal(whole.truncated, false);
  assert.equal(whole.rows, 4);

  const cut = readTableSchema(text, ",", { maxChars: 12 });
  assert.equal(cut.truncated, true, "the caller is told the schema describes a prefix");
  assert.equal(cut.rows, 2, "and it describes only the rows that survived the cut: a,b|1,2|3,4");
  assert.equal(cut.malformed, false, "a cut is not a malformed file");
});

test("the sample keeps the first SAMPLE_VALUES distinct values", () => {
  const s = readTableSchema("v\na\nb\nc\nd\ne\n");
  assert.equal(s.columns[0].sample.length, SAMPLE_VALUES);
  assert.deepEqual(s.columns[0].sample, ["a", "b", "c"], "the first three, in file order");
});
