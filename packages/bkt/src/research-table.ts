export const TABLE_ROW_CAP = 200_000;
export const PAGE_ROWS = 50;
export const QUERY_CHARS = 200;
export const CACHED_TABLES = 4;

export type TableFormat = "tsv" | "csv" | "json" | "jsonl";

export interface ParsedTable {
  columns: string[];
  rows: string[][];
  truncated: boolean;
}

export interface TableQuery {
  page: number;
  q: string;
  sort: string | null;
}

export interface TablePage {
  columns: string[];
  rows: string[][];
  index: number[];
  total: number;
  page: number;
  size: number;
  pinned: string[];
  truncated: boolean;
}

export class TableError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function records(text: string, sep: string, quotes: boolean, cap: number): { rows: string[][]; truncated: boolean } {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let started = false;
  const endRow = () => {
    row.push(cell);
    cell = "";
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
    started = false;
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') cell += ch;
      else if (text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else quoted = false;
    } else if (quotes && ch === '"' && !started) {
      quoted = true;
      started = true;
    } else if (ch === sep) {
      row.push(cell);
      cell = "";
      started = false;
    } else if (ch === "\n") {
      endRow();
      if (rows.length > cap) return { rows: rows.slice(0, cap + 1), truncated: true };
    } else if (ch !== "\r" || text[i + 1] !== "\n") {
      cell += ch;
      started = true;
    }
  }
  if (cell !== "" || row.length > 0) endRow();
  return { rows, truncated: false };
}

function delimited(text: string, sep: string, quotes: boolean, cap: number): ParsedTable {
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const { rows, truncated } = records(body, sep, quotes, cap);
  const columns = rows[0] ?? [];
  const width = columns.length;
  return { columns, rows: rows.slice(1, cap + 1).map((r) => (r.length === width ? r : Array.from({ length: width }, (_, i) => r[i] ?? ""))), truncated: truncated || rows.length - 1 > cap };
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : JSON.stringify(value);
}

function fromObjects(items: unknown[], cap: number): ParsedTable {
  const kept = items.slice(0, cap);
  const flat = kept.every((item) => item !== null && typeof item === "object" && !Array.isArray(item));
  if (!flat) return { columns: ["value"], rows: kept.map((item) => [cellText(item)]), truncated: items.length > cap };
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const item of kept as Record<string, unknown>[]) for (const key of Object.keys(item)) if (!seen.has(key)) (seen.add(key), columns.push(key));
  return { columns, rows: (kept as Record<string, unknown>[]).map((item) => columns.map((c) => cellText(item[c]))), truncated: items.length > cap };
}

export function parseTable(format: TableFormat, text: string, cap = TABLE_ROW_CAP): ParsedTable {
  if (format === "tsv") return delimited(text, "\t", false, cap);
  if (format === "csv") return delimited(text, ",", true, cap);
  try {
    if (format === "jsonl") {
      const lines = text.split("\n").filter((line) => line.trim() !== "");
      return { ...fromObjects(lines.slice(0, cap).map((line) => JSON.parse(line) as unknown), cap), truncated: lines.length > cap };
    }
    const value = JSON.parse(text) as unknown;
    if (Array.isArray(value)) return fromObjects(value, cap);
    if (value !== null && typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      return { columns: ["key", "value"], rows: entries.slice(0, cap).map(([k, v]) => [k, cellText(v)]), truncated: entries.length > cap };
    }
    return { columns: ["value"], rows: [[cellText(value)]], truncated: false };
  } catch {
    throw new TableError("the table does not parse", 422);
  }
}

export const RECORD_COLUMNS = ["id", "title", "branch", "level", "posed", "resolved"];

export function recordSetTable(files: { path: string; text: string }[]): ParsedTable {
  const rows: string[][] = [];
  for (const file of files) {
    let record: Record<string, unknown>;
    try {
      record = JSON.parse(file.text) as Record<string, unknown>;
    } catch {
      throw new TableError(`${file.path} does not parse`, 422);
    }
    if (record === null || typeof record !== "object" || Array.isArray(record)) throw new TableError(`${file.path} holds no record`, 422);
    const name = file.path.split("/").pop()!.replace(/\.json$/, "");
    rows.push([...RECORD_COLUMNS.map((c) => cellText(c === "id" ? (record.id ?? name) : c === "title" ? (record.title ?? record.name ?? name) : record[c])), file.path]);
  }
  return { columns: [...RECORD_COLUMNS, "path"], rows, truncated: false };
}

export function parseQuery(params: URLSearchParams): TableQuery {
  const raw = params.get("page") ?? "1";
  if (!/^[1-9]\d{0,6}$/.test(raw)) throw new TableError("the page number is refused", 400);
  const q = params.get("q") ?? "";
  if (q.length > QUERY_CHARS) throw new TableError("the filter is too long", 400);
  const sort = params.get("sort");
  return { page: Number(raw), q, sort: sort === null || sort === "" ? null : sort };
}

function compare(a: string, b: string): number {
  const x = a === "" ? NaN : Number(a);
  const y = b === "" ? NaN : Number(b);
  if (Number.isFinite(x) && Number.isFinite(y)) return x - y;
  if (a === "" || b === "") return a === b ? 0 : a === "" ? 1 : -1;
  return a < b ? -1 : a > b ? 1 : 0;
}

export function pageOf(table: ParsedTable, query: TableQuery, pinned: string[] = [], size = PAGE_ROWS): TablePage {
  let index = table.rows.map((_, i) => i);
  if (query.q !== "") {
    const needle = query.q.toLowerCase();
    index = index.filter((i) => table.rows[i].some((cell) => cell.toLowerCase().includes(needle)));
  }
  if (query.sort !== null) {
    const down = query.sort.startsWith("-");
    const at = table.columns.indexOf(down ? query.sort.slice(1) : query.sort);
    if (at < 0) throw new TableError("the table has no such column", 400);
    index.sort((i, j) => {
      const order = compare(table.rows[i][at], table.rows[j][at]);
      const blank = table.rows[i][at] === "" || table.rows[j][at] === "";
      return (blank || !down ? order : -order) || i - j;
    });
  }
  const start = (query.page - 1) * size;
  const shown = index.slice(start, start + size);
  return { columns: table.columns, rows: shown.map((i) => table.rows[i]), index: shown, total: index.length, page: query.page, size, pinned: pinned.filter((c) => table.columns.includes(c)), truncated: table.truncated };
}

export class TableCache {
  private held = new Map<string, ParsedTable>();

  constructor(readonly cap: number = CACHED_TABLES) {}

  get size(): number {
    return this.held.size;
  }

  has(key: string): boolean {
    return this.held.has(key);
  }

  get(key: string, parse: () => ParsedTable): ParsedTable {
    const hit = this.held.get(key);
    if (hit) {
      this.held.delete(key);
      this.held.set(key, hit);
      return hit;
    }
    const table = parse();
    this.held.set(key, table);
    for (const oldest of this.held.keys()) {
      if (this.held.size <= this.cap) break;
      this.held.delete(oldest);
    }
    return table;
  }
}
