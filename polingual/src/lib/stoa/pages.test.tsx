import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import StudentDataPage from "../../app/(site)/live/student-data/page";
import HostTermsPage from "../../app/(site)/live/terms/page";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&rsquo;/g, "'").replace(/&#x27;/g, "'").replace(/\s+/g, " ");
const MIGRATIONS = join(__dirname, "../../../../supabase/migrations");
const sql = readdirSync(MIGRATIONS).filter((f) => f.includes("_stoa_live")).sort().map((f) => readFileSync(join(MIGRATIONS, f), "utf8")).join("\n");

test("the student data page states what players give and when it is deleted", () => {
  const t = text(renderToStaticMarkup(<StudentDataPage />));
  for (const claim of ["no account", "cannot type a name", "24 hours after the room closes", "within 3 hours", "local storage", "Leave game", "network address", "within ten minutes", "internal operations", "no student names or education records", "School mode", "Vercel and Supabase"]) {
    assert.ok(t.includes(claim), claim);
  }
  assert.ok(!/nothing about them is collected|no personal information from players/.test(t), "the page never claims nothing is collected");
});

test("the retention figures on the page match the migrations", () => {
  const t = text(renderToStaticMarkup(<StudentDataPage />));
  assert.match(sql, /interval '3 hours'/, "rooms expire 3 hours after creation");
  assert.match(sql, /coalesce\(r\.closed_at, r\.expires_at\) < clock_timestamp\(\) - interval '24 hours'/, "room rows go 24 hours after close");
  const purge = sql.slice(sql.lastIndexOf("create or replace function bucket.live_purge"));
  const limits = /delete from bucket\.live_limits where minute < clock_timestamp\(\) - interval '(\d+) minutes'/.exec(purge);
  const reports = /delete from bucket\.live_reports where reported_at < clock_timestamp\(\) - interval '(\d+) minutes'/.exec(purge);
  const every = /cron\.schedule\('stoa-purge', '\*\/(\d+) \* \* \* \*'/.exec(sql);
  assert.ok(limits && reports && every, "the purge clears hashed counters and reports on a schedule");
  assert.ok(Number(limits![1]) + 1 + Number(every![1]) < 10 && Number(reports![1]) + Number(every![1]) < 10, "hashed addresses live under ten minutes");
  assert.ok(t.includes("within ten minutes") && t.includes("24 hours") && t.includes("3 hours"));
});

test("the host terms state who may host, and that acceptance lives in the browser", () => {
  const html = renderToStaticMarkup(<HostTermsPage />);
  const t = text(html);
  for (const claim of ["teacher, a parent or another adult", "the school allows you", "Keep it private", "saved in that browser only", "no record on our servers"]) assert.ok(t.includes(claim), claim);
  assert.match(html, /href="\/live\/student-data"/);
});

test("both pages keep the voice rules: no dashes", () => {
  for (const html of [renderToStaticMarkup(<StudentDataPage />), renderToStaticMarkup(<HostTermsPage />)]) assert.ok(!/[–—]/.test(html));
});
