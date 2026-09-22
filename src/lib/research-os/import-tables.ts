/**
 * Research OS, ros-import 3: reading a delimited table's shape.
 *
 * learning/research-os/WORKBENCH.md asks extraction for "the column
 * schema with types, counts, null counts, and a preview, which the
 * workbench's function forms read to offer columns". This is that, for
 * CSV and TSV. XLSX and Parquet need a decoder in front of them and
 * produce the same `TableSchema` once they have one.
 *
 * Pure, so a browser can show a learner the shape of a file before it is
 * uploaded and a runner can read the same shape from the stored bytes
 * later and get the same answer.
 *
 * WHAT A TYPE MEANS HERE. A column's type is the narrowest that every
 * non-empty value in it fits, checked over the whole column rather than
 * a sample. A column holding 1, 2 and "n/a" is text, because calling it
 * a number would mean the form offers it for arithmetic and a run then
 * fails on a value the schema said could not be there. Widening on the
 * first value that does not fit is the only rule that keeps the promise
 * the form makes.
 *
 * WHAT COUNTS AS MISSING. An empty field is missing. A field holding
 * only spaces is missing. The literal strings in MISSING_TOKENS are
 * missing, because a table that writes NA and a table that writes an
 * empty cell mean the same thing and a learner comparing two files
 * should not see one column called text for that reason alone. A source
 * that means one of those strings as data keeps it by quoting it, which
 * `parseCells` records and `readTableSchema` honors. A bare dash is not
 * in the set: a column that writes one as data read as entirely empty.
 *
 * WHAT THIS DOES NOT DO. It takes decoded text and never says who
 * decoded it, so a caller that reads latin-1 bytes as UTF-8 gets
 * different values than one that does not. The browser and the runner
 * have to agree on the encoding and on the delimiter, which means the
 * side that sniffs passes its answer to the other rather than each
 * sniffing alone. Only `,` and `\t` are candidates, so a semicolon file
 * arrives as one column and says so through a column count of 1 rather
 * than through an error.
 */

/** Set by the last parseCells call when the text ended inside a quote.
 * Module state rather than a second return value, so parseDelimited's
 * shape is unchanged for its existing callers. */
let unterminated = false;

/** One parsed field, with whether the source quoted it. */
export interface Cell {
  value: string;
  quoted: boolean;
}

export type ColumnType = "integer" | "number" | "boolean" | "date" | "text";

export interface ColumnSchema {
  name: string;
  /** Position in the header, so two columns sharing a name stay apart. */
  index: number;
  type: ColumnType;
  /** Rows carrying a value in this column. */
  present: number;
  /** Rows where this column is empty or a missing token. */
  missing: number;
  /** Distinct non-missing values, capped at DISTINCT_CAP. */
  distinct: number;
  /** True when `distinct` hit the cap and the real count is higher. */
  distinctCapped: boolean;
  /** The first few non-missing values, in file order. */
  sample: string[];
}

export interface TableSchema {
  delimiter: "," | "\t";
  columns: ColumnSchema[];
  /** Data rows, header excluded. */
  rows: number;
  /** The first PREVIEW_ROWS data rows, each padded to the header width. */
  preview: string[][];
  /** Rows whose field count differed from the header's. */
  ragged: number;
  truncated: boolean;
  /** True when the text ended inside a quote, so the rows above it ran
   * together and every count is a fabrication. */
  malformed: boolean;
}

export const PREVIEW_ROWS = 20;
export const DISTINCT_CAP = 1000;
export const SAMPLE_VALUES = 3;
/** 20 MB of text. Past this the file belongs on a runner, and the caller
 * is told the schema describes a prefix. */
export const MAX_TEXT_CHARS = 20_000_000;

/** A bare dash is left out: a column that uses one as data read as
 * entirely empty, and it is the token most likely to be a value. A
 * caller that wants it can pass its own set. */
const MISSING_TOKENS: readonly string[] = ["", "na", "n/a", "null", "nan", "none"];

const INTEGER = /^[+-]?\d+$/;
const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const BOOLEAN = new Set(["true", "false", "t", "f", "yes", "no", "y", "n", "0", "1"]);
/** ISO 8601 calendar dates, with or without a time. A locale-ordered
 * date is text here: 03/04/2026 is two different days depending on who
 * wrote it, and guessing turns a run's answer into a coin flip. */
const DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export function isMissing(value: string, tokens: readonly string[] = MISSING_TOKENS): boolean {
  return tokens.includes(value.trim().toLowerCase());
}

/** The narrowest type a single value fits. */
export function typeOf(value: string): ColumnType {
  const v = value.trim();
  if (INTEGER.test(v)) {
    const digits = v.replace(/^[+-]/, "");
    // A zip code, a SKU and a 64-bit id all match the integer shape and
    // none survives arithmetic: 007 loses its width and an id past
    // Number.MAX_SAFE_INTEGER loses its last digits. Calling them text
    // is the same rule this file applies to a column that disagrees
    // with itself.
    if (digits.length > 1 && digits.startsWith("0")) return "text";
    if (!Number.isSafeInteger(Number(v))) return "text";
    return "integer";
  }
  if (NUMBER.test(v)) {
    // 1e999 parses and is Infinity, which no arithmetic can use.
    if (!Number.isFinite(Number(v))) return "text";
    return "number";
  }
  if (DATE.test(v)) {
    // Shape alone accepted 2026-13-45. A form offering date arithmetic
    // on that column gets Invalid Date.
    const d = new Date(v);
    return Number.isNaN(d.getTime()) || !d.toISOString().startsWith(v.slice(0, 10)) ? "text" : "date";
  }
  if (BOOLEAN.has(v.toLowerCase())) return "boolean";
  return "text";
}

/** The type that holds both, widening toward text. `integer` widens to
 * `number` because every integer is one; nothing else shares a lattice,
 * so any other disagreement is text. */
export function widen(a: ColumnType, b: ColumnType): ColumnType {
  if (a === b) return a;
  if ((a === "integer" && b === "number") || (a === "number" && b === "integer")) return "number";
  return "text";
}

/**
 * One row of RFC 4180 fields. Quotes are honored, `""` inside a quoted
 * field is one quote, and a newline inside a quoted field belongs to the
 * field. The parser returns rows rather than lines for that reason: a
 * split on "\n" tears any table whose cells carry prose, which is most
 * tables a learner brings in.
 */
export function parseDelimited(text: string, delimiter: "," | "\t"): string[][] {
  return parseCells(text, delimiter).map((r) => r.map((c) => c.value));
}

/**
 * The same parse, keeping whether each cell was quoted.
 *
 * `readTableSchema` needs it: a source that writes NA and means the
 * string rather than the absence says so by quoting it, and a parser
 * that returns bare strings has thrown that away before the missing
 * rule runs. The docstring above promised that escape hatch while the
 * code did not provide it.
 */
export function parseCells(text: string, delimiter: "," | "\t"): Cell[][] {
  unterminated = false;
  const rows: Cell[][] = [];
  let row: Cell[] = [];
  let wasQuoted = false;
  let field = "";
  let quoted = false;
  let started = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; continue; }
        quoted = false;
        continue;
      }
      field += c;
      continue;
    }
    if (c === '"' && field === "") { quoted = true; wasQuoted = true; started = true; continue; }
    if (c === delimiter) { row.push({ value: field, quoted: wasQuoted }); field = ""; wasQuoted = false; started = true; continue; }
    if (c === "\r") {
      // A lone CR ends a row. Excel still writes "CSV (Macintosh)", and
      // dropping CR unconditionally ran every row of such a file into
      // one: the header became the whole file and the table arrived with
      // no rows and nothing to say so.
      if (text[i + 1] === "\n") continue;
      row.push({ value: field, quoted: wasQuoted });
      rows.push(row);
      row = [];
      field = "";
      wasQuoted = false;
      started = false;
      continue;
    }
    if (c === "\n") {
      row.push({ value: field, quoted: wasQuoted });
      rows.push(row);
      row = [];
      field = "";
      wasQuoted = false;
      started = false;
      continue;
    }
    field += c;
    started = true;
  }
  // A file with no trailing newline still ends on a row.
  if (started || field !== "" || row.length > 0) {
    row.push({ value: field, quoted: wasQuoted });
    rows.push(row);
  }
  // Ending inside a quote means an unescaped quote somewhere above
  // swallowed everything after it into one field. The rows returned are
  // a fabrication, so the caller is told rather than left to trust them.
  unterminated = quoted;
  return rows;
}

/** The delimiter that yields a consistent field count over the first few
 * lines. A tab beats a comma when both are consistent, because a comma
 * inside prose is ordinary and a tab inside prose is rare. */
export function sniffDelimiter(text: string): "," | "\t" {
  const head = text.slice(0, 64_000);
  const score = (d: "," | "\t"): number => {
    const rows = parseDelimited(head, d).slice(0, 10).filter((r) => r.length > 0);
    if (rows.length < 2) return 0;
    const width = rows[0].length;
    if (width < 2) return 0;
    const agree = rows.filter((r) => r.length === width).length;
    return agree === rows.length ? width : 0;
  };
  return score("\t") >= score(",") && score("\t") > 0 ? "\t" : ",";
}

/**
 * The schema of a delimited table.
 *
 * The first row is the header. A column with an empty header is named
 * `column_<n>` by its position, so the form has something to offer and
 * the name still says where it came from.
 */
export function readTableSchema(text: string, delimiter?: "," | "\t"): TableSchema {
  const truncated = text.length > MAX_TEXT_CHARS;
  const body = truncated ? text.slice(0, MAX_TEXT_CHARS) : text;
  const d = delimiter ?? sniffDelimiter(body);
  const rows = parseCells(body, d).filter((r) => !(r.length === 1 && r[0].value === ""));
  if (rows.length === 0) {
    return { delimiter: d, columns: [], rows: 0, preview: [], ragged: 0, truncated, malformed: unterminated };
  }

  const header = rows[0];
  const names = header.map((h, i) => (h.value.trim() === "" ? `column_${i + 1}` : h.value.trim()));
  const data = rows.slice(1);

  const seen: Set<string>[] = names.map(() => new Set<string>());
  const samples: string[][] = names.map(() => []);
  const present = names.map(() => 0);
  const missing = names.map(() => 0);
  const types: (ColumnType | null)[] = names.map(() => null);
  let ragged = 0;

  for (const r of data) {
    if (r.length !== names.length) ragged += 1;
    for (let i = 0; i < names.length; i += 1) {
      const cell = r[i] ?? { value: "", quoted: false };
      // A quoted cell is a value the source wrote on purpose, so NA in
      // quotes is the string and the absence is an empty cell.
      if (!cell.quoted && isMissing(cell.value)) { missing[i] += 1; continue; }
      present[i] += 1;
      const v = cell.value.trim();
      types[i] = types[i] === null ? typeOf(v) : widen(types[i] as ColumnType, typeOf(v));
      if (seen[i].size < DISTINCT_CAP) seen[i].add(v);
      if (samples[i].length < SAMPLE_VALUES) samples[i].push(v);
    }
  }

  const columns: ColumnSchema[] = names.map((name, i) => ({
    name,
    index: i,
    // A column with nothing in it is text: no value has said otherwise.
    type: types[i] ?? "text",
    present: present[i],
    missing: missing[i],
    distinct: seen[i].size,
    distinctCapped: seen[i].size >= DISTINCT_CAP,
    sample: samples[i],
  }));

  const preview = data.slice(0, PREVIEW_ROWS).map((r) =>
    names.map((_, i) => r[i]?.value ?? ""),
  );

  return { delimiter: d, columns, rows: data.length, preview, ragged, truncated, malformed: unterminated };
}
