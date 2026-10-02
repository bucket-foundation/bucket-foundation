import { readFileSync, statSync } from "node:fs";
import { formLabel, percent, type StudyHistory } from "../core/history";
import { ALREADY_IMPORTED } from "../core/importer";
import { noteRows, type NoteRow } from "../core/notes";
import type { ResearchBackend } from "../core/research";
import { IMPORT_BODY_BYTES } from "../local";
import type { Note } from "../notes";
import { jsonLine, stamp, textRows } from "./out";
import { NoDataError, type NoteOptions } from "./run";
import { EXIT } from "./table";

export const FILE_UNREADABLE = "Bucket could not read that file.";
export const ALREADY_HERE = "Your progress from the website is already on this computer. Run bkt import --force to merge it again; cards merge by the most recent review.";

export class PlainError extends Error {}

export function readText(path: string, limit: number): string {
  try {
    if (statSync(path).size > limit) throw new PlainError(`That file is larger than ${Math.round(limit / 1048576)} MB.`);
    return readFileSync(path, "utf8");
  } catch (e) {
    throw e instanceof PlainError ? e : new PlainError(FILE_UNREADABLE);
  }
}

export function readImport(path: string): unknown {
  const text = readText(path, IMPORT_BODY_BYTES);
  try {
    return JSON.parse(text);
  } catch {
    throw new PlainError(FILE_UNREADABLE);
  }
}

const cell = (v: string | number) => String(v).replace(/[\t\r\n]+/g, " ");

export function noteLines(rows: NoteRow[]): string {
  const width = String(rows.length).length;
  return rows.map((r) => `${String(r.n).padStart(width)}  ${r.pinned ? "* " : ""}${r.title || "Untitled"}  ${stamp(r.updatedAt)}`).join("\n");
}

export function noteTsv(rows: NoteRow[]): string {
  return rows.map((r) => [r.n, r.pinned ? "yes" : "no", stamp(r.updatedAt), r.title].map(cell).join("\t")).join("\n");
}

export function noteText(n: Note): string {
  return [`${n.pinned ? "* " : ""}${n.title || "Untitled"}`, `Updated ${stamp(n.updatedAt)}`, "", n.body].join("\n");
}

export function historyText(h: StudyHistory): string {
  const top = textRows([
    ["Days covered", h.days],
    ["Study days", h.studyDays],
    ["Reviews", h.reviews],
    ["Questions answered", h.answered],
    ["Correct", h.answered ? percent(h.correct / h.answered) : "none yet"],
  ]);
  if (!h.forms.length) return top;
  const forms = textRows(h.forms.map((f): [string, string] => [formLabel(f.form), `${f.answered} answered, ${percent(f.accuracy)} correct`]));
  return `${top}\n\nBy question form\n${forms}`;
}

export function historyTsv(h: StudyHistory): string {
  return h.byDay.map((d) => [d.day, d.reviews, d.answered, d.correct].join("\t")).join("\n");
}

export async function runResearch(name: string, o: NoteOptions, json: boolean, b: ResearchBackend, payload: { body?: string; data?: unknown }): Promise<number> {
  if (name === "notes ls") {
    const rows = noteRows(await b.notes());
    if (json) console.log(jsonLine("notes ls", { notes: rows }));
    else if (rows.length) console.log(o.tsv ? noteTsv(rows) : noteLines(rows));
    if (!rows.length) throw new NoDataError("no notes yet; bkt notes add <title> writes one");
    return EXIT.ok;
  }
  if (name === "notes show") {
    const notes = await b.notes();
    const n = notes[o.number - 1];
    if (!n) throw new NoDataError(`no note numbered ${o.number}; bkt notes ls lists them`);
    console.log(json ? jsonLine("notes show", { n: o.number, ...n }) : noteText(n));
    return EXIT.ok;
  }
  if (name === "notes add") {
    const r = await b.addNote({ title: o.title, body: payload.body ?? "", pinned: o.pin });
    if (!r.ok) throw new Error(r.error);
    console.log(json ? jsonLine("notes add", r.value) : `Saved the note ${r.value.title}.`);
    return EXIT.ok;
  }
  if (name === "history") {
    const h = await b.history(o.days);
    if (json) console.log(jsonLine("history", h));
    else if (o.tsv) {
      if (h.byDay.length) console.log(historyTsv(h));
    } else console.log(historyText(h));
    if (!h.studyDays) throw new NoDataError(`no study in the last ${o.days} ${o.days === 1 ? "day" : "days"}`);
    return EXIT.ok;
  }
  const r = await b.importProgress(payload.data, o.force);
  if (!r.ok) throw new PlainError(r.status === 409 && r.error === ALREADY_IMPORTED ? ALREADY_HERE : r.status === 400 ? FILE_UNREADABLE : r.error);
  console.log(json ? jsonLine("import", r) : `Brought over ${r.imported.length} ${r.imported.length === 1 ? "deck" : "decks"}.`);
  return EXIT.ok;
}
