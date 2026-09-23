export interface ParsedRows {
  rows: Cell[][];
  unterminated: boolean;
}

export interface Cell {
  value: string;
  quoted: boolean;
}

export type ColumnType = "integer" | "number" | "boolean" | "date" | "text";

export interface ColumnSchema {
  name: string;
  index: number;
  type: ColumnType;
  present: number;
  missing: number;
  distinct: number;
  distinctCapped: boolean;
  sample: string[];
}

export interface TableSchema {
  delimiter: "," | "\t";
  columns: ColumnSchema[];
  rows: number;
  preview: string[][];
  ragged: number;
  truncated: boolean;
  malformed: boolean;
}

export const PREVIEW_ROWS = 20;
export const DISTINCT_CAP = 1000;
export const SAMPLE_VALUES = 3;
export const MAX_TEXT_CHARS = 20_000_000;

export function cutAtRowBoundary(text: string, limit: number, delimiter: "," | "\t"): string {
  if (limit <= 0) return "";
  if (text.length <= limit) return text;
  let quoted = false;
  let fieldEmpty = true;
  let lastBoundary = 0;
  for (let i = 0; i < limit; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { i += 1; continue; }
        quoted = false;
        continue;
      }
      continue;
    }
    if (c === '"' && fieldEmpty) { quoted = true; fieldEmpty = false; continue; }
    if (c === delimiter) { fieldEmpty = true; continue; }
    if (c === "\r") {
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

const MISSING_TOKENS: readonly string[] = ["", "na", "n/a", "null", "nan", "none"];

const INTEGER = /^[+-]?\d+$/;
const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const BOOLEAN = new Set(["true", "false", "t", "f", "yes", "no", "y", "n", "0", "1"]);
const DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export function isMissing(value: string, tokens: readonly string[] = MISSING_TOKENS): boolean {
  const v = value.trim().toLowerCase();
  if (v === "") return true;
  return tokens.includes(v);
}

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
    if (digits.length > 1 && digits.startsWith("0")) return "text";
    if (!Number.isSafeInteger(Number(v))) return "text";
    return "integer";
  }
  if (NUMBER.test(v)) {
    if (!Number.isFinite(Number(v))) return "text";
    return "number";
  }
  if (DATE.test(v) && isRealDate(v)) return "date";
  if (BOOLEAN.has(v.toLowerCase())) return "boolean";
  return "text";
}

export function widen(a: ColumnType, b: ColumnType): ColumnType {
  if (a === b) return a;
  if ((a === "integer" && b === "number") || (a === "number" && b === "integer")) return "number";
  return "text";
}

export function parseDelimited(text: string, delimiter: "," | "\t"): string[][] {
  return parseCells(text, delimiter).rows.map((r) => r.map((c) => c.value));
}

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
  if (started || field !== "" || row.length > 0) {
    row.push({ value: field, quoted: wasQuoted });
    rows.push(row);
  }
  return { rows, unterminated: quoted };
}

const AGREEMENT = 0.6;

function isBlankRow(row: { value: string; quoted: boolean }[]): boolean {
  return row.length === 1 && row[0].value === "" && !row[0].quoted;
}

export function sniffDelimiter(text: string): "," | "\t" {
  const head = text.slice(0, 64_000);
  const score = (d: "," | "\t"): number => {
    const rows = parseCells(head, d).rows.slice(0, 10).filter((r) => !isBlankRow(r));
    if (rows.length < 2) return 0;
    const widths = rows.map((r) => r.length);
    let width = 0;
    let agree = 0;
    for (const w of widths) {
      const n = widths.filter((x) => x === w).length;
      if (n > agree || (n === agree && w > width)) { width = w; agree = n; }
    }
    if (width < 2) return 0;
    const share = agree / rows.length;
    if (share < AGREEMENT) return 0;
    const headerFits = widths[0] === width;
    return width * share * (headerFits ? 1 : 0.5);
  };
  const tab = score("\t");
  const comma = score(",");
  return tab >= comma && tab > 0 ? "\t" : ",";
}

export function readTableSchema(
  text: string,
  delimiter?: "," | "\t",
  options: {
    missingTokens?: readonly string[];
    maxChars?: number;
  } = {},
): TableSchema {
  const limit = options.maxChars ?? MAX_TEXT_CHARS;
  const d = delimiter ?? sniffDelimiter(text);
  const truncated = text.length > limit;
  const body = truncated ? cutAtRowBoundary(text, limit, d) : text;
  const parsed = parseCells(body, d);
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
    type: types[i] ?? "text",
    present: present[i],
    missing: missing[i],
    distinct: Math.min(seen[i].size, DISTINCT_CAP),
    distinctCapped: seen[i].size > DISTINCT_CAP,
    sample: samples[i],
  }));

  const preview = data.slice(0, PREVIEW_ROWS).map((r) =>
    names.map((_, i) => r[i]?.value ?? ""),
  );

  return { delimiter: d, columns, rows: data.length, preview, ragged, truncated, malformed: parsed.unterminated };
}
