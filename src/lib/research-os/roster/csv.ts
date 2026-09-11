/**
 * Research OS for K-12, roster sync (bkt-ros, ros-06 follow-on). A
 * dependency-free RFC 4180 CSV reader: the OneRoster 1.2 CSV binding
 * (https://www.imsglobal.org/spec/oneroster/v1p2/bind/csv/) requires
 * UTF-8, comma-delimited, RFC 4180-quoted files, and this repo has no CSV
 * library dependency today (matching the stdlib-only convention the org's
 * other importer tools use, e.g. tools/figma/figma.py, tools/youtube/yt.py).
 * Handles quoted fields, embedded commas and newlines inside quotes, and
 * doubled-quote escaping (`""` -> `"`). Does not handle a BOM beyond
 * stripping one if present at position 0.
 */

/** One parsed row, as a plain object keyed by the header row's column
 * names, trimmed. A short row (missing trailing columns) gets `""` for
 * the missing keys; an extra trailing column with no header is dropped. */
export type CsvRow = Record<string, string>;

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Splits raw CSV text into rows of raw string fields, honoring RFC 4180
 * quoting. No header handling here; parseCsv (below) does that. */
function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = stripBom(text);
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (c === "\r") {
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += c;
  }
  // Final field/row, if the file has no trailing newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

/** Parses CSV text into an array of header-keyed row objects. The header
 * row's own columns are trimmed; unknown columns pass through as
 * ordinary keys (the caller decides what to keep -- see oneroster.ts's
 * own field allowlists, this function never filters columns itself). */
export function parseCsv(text: string): CsvRow[] {
  const rows = splitCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  const out: CsvRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const obj: CsvRow = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = (cells[c] ?? "").trim();
    }
    out.push(obj);
  }
  return out;
}
