/**
 * Research OS, ros-import 3: reading a delimited table's shape.
 *
 * learning/research-os/WORKBENCH.md asks extraction for "the column
 * schema with types, counts, null counts, and a preview, which the
 * workbench's function forms read to offer columns". This is that, for
 * CSV and TSV. XLSX and Parquet need a decoder in front of them and
 * produce the same `TableSchema` once they have one.
 *
 * Pure, with no module state and no clock: a browser can show a learner
 * the shape of a file before it is uploaded and a runner reads the same
 * shape from the stored bytes later and gets the same answer, on any
 * host in any timezone.
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

/** The rows and whether the text ran out inside a quote. */
export interface ParsedRows {
  rows: Cell[][];
  unterminated: boolean;
}

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
  /**
   * The first PREVIEW_ROWS data rows, each padded or truncated to the
   * header width.
   *
   * A row with more fields than the header has nowhere to put them:
   * they reach no count, no distinct set, no sample and no preview. The
   * row is counted in `ragged`, which is the only signal a caller gets
   * that anything was dropped.
   */
  preview: string[][];
  /** Rows whose field count differed from the header's, short or long. */
  ragged: number;
  truncated: boolean;
  /**
   * True when the file itself ends inside a quote, so the rows above it
   * ran together and every count is a fabrication.
   *
   * A file past MAX_TEXT_CHARS is cut at the last row boundary outside a
   * quote, so truncation alone never sets this. It used to: the cut
   * landed mid-quote and a well-formed 25 MB CSV of quoted prose, which
   * is the shape the limit exists for, came back malformed and a caller
   * obeying the contract threw it away.
   */
  malformed: boolean;
}

export const PREVIEW_ROWS = 20;
export const DISTINCT_CAP = 1000;
export const SAMPLE_VALUES = 3;
/** 20 MB of text. Past this the file belongs on a runner, and the caller
 * is told the schema describes a prefix. */
export const MAX_TEXT_CHARS = 20_000_000;

/**
 * The longest prefix of `text` no longer than `limit` that ends where a
 * row ends, with no quote left open.
 *
 * Cutting at a character count lands inside a quoted cell at a rate set
 * by how long the cells are, and the parser then reports the file as
 * malformed for a break the reader made.
 *
 * It answers the same questions parseCells does, the same way, because
 * a second opinion about where a row ends is a second defect. The first
 * version had its own: it toggled the quote state on any `"`, while
 * parseCells opens a quoted field only at the start of a field, so one
 * inch mark in `5" pipe` put the cutter inside a quote for the rest of
 * the file and a 20 MB table came back with zero rows. It also looked
 * for `\n` alone, so a CR-only file, the format parseCells carries a
 * comment about supporting, had no boundary anywhere and the cut landed
 * mid-row.
 *
 * A limit at or below zero yields nothing. A limit shorter than the
 * first row yields nothing too: a partial row is a fabricated row.
 *
 * The delimiter is a parameter because a quote opens only at the start
 * of a field, and nothing knows where a field starts without it.
 */
export function cutAtRowBoundary(text: string, limit: number, delimiter: "," | "\t"): string {
  if (limit <= 0) return "";
  if (text.length <= limit) return text;
  let quoted = false;
  let fieldEmpty = true;
  let lastBoundary = 0;
  for (let i = 0; i < limit; i += 1) {
    const c = text[i];
    if (quoted) {
      // `""` is an escaped quote, exactly as parseCells reads it.
      if (c === '"') {
        if (text[i + 1] === '"') { i += 1; continue; }
        quoted = false;
        continue;
      }
      continue;
    }
    if (c === '"' && fieldEmpty) { quoted = true; fieldEmpty = false; continue; }
    // A field boundary, which is why this needs the delimiter: without
    // it the scan never knew a field had started, so the quote opening
    // `1,"line one` was read as a quote inside a field body and the
    // newline within it counted as a row end.
    if (c === delimiter) { fieldEmpty = true; continue; }
    if (c === "\r") {
      // \r\n is one boundary, at the \n.
      if (text[i + 1] === "\n") continue;
      lastBoundary = i + 1;
      fieldEmpty = true;
      continue;
    }
    if (c === "\n") {
      lastBoundary = i + 1;
      fieldEmpty = true;
      continue;
    }
    fieldEmpty = false;
  }
  return text.slice(0, lastBoundary);
}

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
  const v = value.trim().toLowerCase();
  // An empty cell is missing whatever the caller's set says. A set
  // written without "" made every empty cell a present value, against
  // both this module's header and ColumnSchema.missing, and the only
  // test passed ["", "-"] so it never showed.
  if (v === "") return true;
  return tokens.includes(v);
}

/** The narrowest type a single value fits. */
/**
 * Whether an ISO 8601 value names a day that exists.
 *
 * No Date is constructed. The first version of this check built one and
 * compared `toISOString()` against the literal, which reads an
 * offsetless datetime as local time and renders UTC, so
 * `2026-03-04T23:30` typed as a date in UTC and as text in New York.
 * The same bytes gave two answers by host clock, which is the failure
 * the date rule exists to prevent.
 */
function isRealDate(v: string): boolean {
  const y = Number(v.slice(0, 4));
  const m = Number(v.slice(5, 7));
  const d = Number(v.slice(8, 10));
  if (m < 1 || m > 12 || d < 1) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  if (d > days) return false;
  const time = v.slice(10);
  if (time === "") return true;
  const t = time.match(/^[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/);
  if (!t) return false;
  if (Number(t[1]) > 23 || Number(t[2]) > 59 || (t[3] !== undefined && Number(t[3]) > 60)) return false;
  const off = t[4];
  if (off && off !== "Z") {
    const oh = Number(off.slice(1, 3));
    const om = Number(off.replace(":", "").slice(3, 5));
    if (oh > 14 || om > 59) return false;
  }
  return true;
}

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
  if (DATE.test(v) && isRealDate(v)) return "date";
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
  return parseCells(text, delimiter).rows.map((r) => r.map((c) => c.value));
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
export function parseCells(text: string, delimiter: "," | "\t"): ParsedRows {
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
  // Returned rather than parked in module state: an exported parser that
  // reports through a module variable gives its callers no way to ask.
  return { rows, unterminated: quoted };
}

/**
 * The share of sampled rows that must agree on a width for it to count.
 *
 * 0.6, and the boundary is load-bearing: a five-row TSV with two rows of
 * trailing prose agrees three in five, which is exactly this, and that
 * is the ragged file the proportional rule was written for. A comment
 * here said two thirds while the code said 0.6, and raising the code to
 * match the comment turned that file back into one text column.
 */
const AGREEMENT = 0.6;

/**
 * A row the file wrote, as opposed to a blank line between rows.
 *
 * readTableSchema deletes these before it counts anything. The sniffer
 * counted them as width-1 rows, so a TSV with a blank line between each
 * pair of rows read as four disagreeing widths out of seven and
 * collapsed to a single text column named "a\tb". One value, honoured
 * in one place and discarded in the other, forty lines apart.
 */
function isBlankRow(row: { value: string; quoted: boolean }[]): boolean {
  return row.length === 1 && row[0].value === "" && !row[0].quoted;
}

/**
 * The delimiter this text is written with.
 *
 * A tab beats a comma when both describe the same shape, because a comma
 * inside prose is ordinary and a tab inside prose is rare. Two things
 * decide whether a delimiter describes a shape at all: enough rows agree
 * on a width, and the header is one of them.
 *
 * The header rule is what separates a table from a file that happens to
 * contain the character. `id,note` over rows where one cell holds a tab
 * gives tab the widths [1,2,2,2,2]: four rows in five agree on 2, which
 * passes on share alone and hands a CSV to the wrong delimiter. The
 * header row has width 1 under tab, and a file whose first row is not a
 * row of the table is not a table in that delimiter.
 */
export function sniffDelimiter(text: string): "," | "\t" {
  const head = text.slice(0, 64_000);
  const score = (d: "," | "\t"): number => {
    const rows = parseCells(head, d).rows.slice(0, 10).filter((r) => !isBlankRow(r));
    if (rows.length < 2) return 0;
    // The modal width rather than the first row's: a header shorter or
    // longer than the body decided the whole file.
    const widths = rows.map((r) => r.length);
    let width = 0;
    let agree = 0;
    for (const w of widths) {
      const n = widths.filter((x) => x === w).length;
      if (n > agree || (n === agree && w > width)) { width = w; agree = n; }
    }
    if (width < 2) return 0;
    // Proportional. Unanimity meant one ragged row, one blank line or one
    // comment zeroed a correct delimiter, and this file counts ragged
    // rows twelve lines below because it expects them.
    // A ragged TSV agreeing three rows in five scores here; prose split
    // on commas agrees one row in three and does not, which is the line
    // between a table with a short row and a column of sentences that
    // happen to contain commas.
    const share = agree / rows.length;
    if (share < AGREEMENT) return 0;
    // The header carries the table's own shape, and a delimiter whose
    // header row is off-modal scores at half.
    //
    // A veto here was wrong. It answers `id,note` with a tab inside a
    // cell, which is what it was written for, and it also throws away
    // every file whose header is a different width from its body: an R
    // export writes `ncol` names over `rownames + ncol` values, a sheet
    // exported with a trailing empty column writes one more name than
    // values, and a comment or title line above the header is not a row
    // of the table at all. Four real shapes, and the comment twenty
    // lines above this one already said a header shorter or longer than
    // the body must not decide the file.
    //
    // A discount keeps both: the R export stays on tab, because comma
    // scores nothing there, and `id,note` still goes to comma, because
    // tab at 1 x 0.8 x 0.5 loses to comma at 2 x 1.0.
    const headerFits = widths[0] === width;
    return width * share * (headerFits ? 1 : 0.5);
  };
  const tab = score("\t");
  const comma = score(",");
  return tab >= comma && tab > 0 ? "\t" : ",";
}

/**
 * The schema of a delimited table.
 *
 * The first row is the header. A column with an empty header is named
 * `column_<n>` by its position, so the form has something to offer and
 * the name still says where it came from.
 */
export function readTableSchema(
  text: string,
  delimiter?: "," | "\t",
  options: {
    missingTokens?: readonly string[];
    /**
     * The size past which this reads a prefix. MAX_TEXT_CHARS by
     * default.
     *
     * Measured on node v22 on a development machine, over 20 MB of
     * two-column quoted CSV: 0.7 to 0.8 seconds and 0.49 GB of heap at
     * 800,000 twenty-character rows, 1.1 to 1.2 seconds and 0.56 GB at
     * 400,000 forty-five-character rows, 1.3 to 1.6 seconds and 0.61 GB
     * at 98,000 two-hundred-character rows, with resident memory
     * reaching 1.7 to 2.4 GB across repeats. parseCells builds one
     * object per cell, so the row shape moves the cost more than the
     * byte count does.
     *
     * An earlier version of this comment said 0.7 seconds and a quarter
     * of a gigabyte, which is the fastest shape and about half the
     * heap. It was written in the voice of a measurement without being
     * one, which is the thing a caller sizing a browser path cannot
     * afford. Those callers pass their own limit; a test reaches the
     * truncation without building 20 MB.
     */
    maxChars?: number;
  } = {},
): TableSchema {
  // cutAtRowBoundary answers "" at or below zero, so clamping here as
  // well would be the same rule in two places, which is the defect this
  // module keeps producing.
  const limit = options.maxChars ?? MAX_TEXT_CHARS;
  // The delimiter comes from the whole text, before the cut. It is a
  // property of the file, and the cut needs it to know where a field
  // starts, so sniffing the cut body would be circular.
  const d = delimiter ?? sniffDelimiter(text);
  const truncated = text.length > limit;
  const body = truncated ? cutAtRowBoundary(text, limit, d) : text;
  const parsed = parseCells(body, d);
  // A quoted empty cell is a row the source wrote. The filter ignored
  // `quoted` while the missing rule twenty lines below honours it, so a
  // lone "" row vanished and a three-row file reported two.
  // The same rule the sniffer applies, from the same function, so the
  // two cannot answer differently about which rows the file wrote.
  const rows = parsed.rows.filter((r) => !isBlankRow(r));
  if (rows.length === 0) {
    return { delimiter: d, columns: [], rows: 0, preview: [], ragged: 0, truncated, malformed: parsed.unterminated };
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
      // Quoting makes a written token data: a source that means the
      // letters NA keeps them by quoting them. An empty cell is the
      // exception, because QUOTE_ALL writers quote every cell, so `""`
      // there carries no intent at all. Without the exception the same
      // table written twice describes two schemas: `"2",""` typed the
      // column text with three present values, and `2,` typed it
      // integer with one missing.
      const empty = cell.value.trim() === "";
      if ((!cell.quoted || empty) && isMissing(cell.value, options.missingTokens)) { missing[i] += 1; continue; }
      present[i] += 1;
      const v = cell.value.trim();
      types[i] = types[i] === null ? typeOf(v) : widen(types[i] as ColumnType, typeOf(v));
      if (seen[i].size <= DISTINCT_CAP) seen[i].add(v);
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
    distinct: Math.min(seen[i].size, DISTINCT_CAP),
    // Strictly greater, because the set is allowed to reach the cap and
    // a column holding exactly DISTINCT_CAP values is an exact count.
    distinctCapped: seen[i].size > DISTINCT_CAP,
    sample: samples[i],
  }));

  const preview = data.slice(0, PREVIEW_ROWS).map((r) =>
    names.map((_, i) => r[i]?.value ?? ""),
  );

  return { delimiter: d, columns, rows: data.length, preview, ragged, truncated, malformed: parsed.unterminated };
}
