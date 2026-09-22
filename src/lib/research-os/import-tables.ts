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
 * the parser honors.
 */

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
}

export const PREVIEW_ROWS = 20;
export const DISTINCT_CAP = 1000;
export const SAMPLE_VALUES = 3;
/** 20 MB of text. Past this the file belongs on a runner, and the caller
 * is told the schema describes a prefix. */
export const MAX_TEXT_CHARS = 20_000_000;

const MISSING_TOKENS = new Set(["", "na", "n/a", "null", "nan", "none", "-", "--"]);

const INTEGER = /^[+-]?\d+$/;
const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const BOOLEAN = new Set(["true", "false", "t", "f", "yes", "no", "y", "n", "0", "1"]);
/** ISO 8601 calendar dates, with or without a time. A locale-ordered
 * date is text here: 03/04/2026 is two different days depending on who
 * wrote it, and guessing turns a run's answer into a coin flip. */
const DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export function isMissing(value: string): boolean {
  return MISSING_TOKENS.has(value.trim().toLowerCase());
}

/** The narrowest type a single value fits. */
export function typeOf(value: string): ColumnType {
  const v = value.trim();
  if (INTEGER.test(v)) return "integer";
  if (NUMBER.test(v)) return "number";
  if (DATE.test(v)) return "date";
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
  const rows: string[][] = [];
  let row: string[] = [];
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
    if (c === '"' && field === "") { quoted = true; started = true; continue; }
    if (c === delimiter) { row.push(field); field = ""; started = true; continue; }
    if (c === "\r") continue;
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      started = false;
      continue;
    }
    field += c;
    started = true;
  }
  // A file with no trailing newline still ends on a row.
  if (started || field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
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
  const rows = parseDelimited(body, d).filter((r) => !(r.length === 1 && r[0] === ""));
  if (rows.length === 0) {
    return { delimiter: d, columns: [], rows: 0, preview: [], ragged: 0, truncated };
  }

  const header = rows[0];
  const names = header.map((h, i) => (h.trim() === "" ? `column_${i + 1}` : h.trim()));
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
      const raw = r[i] ?? "";
      if (isMissing(raw)) { missing[i] += 1; continue; }
      present[i] += 1;
      const v = raw.trim();
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
    names.map((_, i) => r[i] ?? ""),
  );

  return { delimiter: d, columns, rows: data.length, preview, ragged, truncated };
}
