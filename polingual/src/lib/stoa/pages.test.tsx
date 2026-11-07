import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import StudentDataPage from "../../app/(site)/live/student-data/page";
import HostTermsPage from "../../app/(site)/live/terms/page";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&rsquo;/g, "'").replace(/\s+/g, " ");

test("the student data page states what players give and when it is deleted", () => {
  const t = text(renderToStaticMarkup(<StudentDataPage />));
  for (const claim of ["no account", "cannot type a name", "24 hours after the room closes", "within 3 hours", "under 13", "without parental consent", "no student names or education records", "School mode", "Vercel and Supabase"]) {
    assert.ok(t.includes(claim), claim);
  }
});

test("the host terms state who may host and what the school allows", () => {
  const html = renderToStaticMarkup(<HostTermsPage />);
  const t = text(html);
  for (const claim of ["teacher, a parent or another adult", "the school allows you", "Keep it private", "accept these terms once"]) assert.ok(t.includes(claim), claim);
  assert.match(html, /href="\/live\/student-data"/);
});

test("both pages keep the voice rules: no dashes", () => {
  for (const html of [renderToStaticMarkup(<StudentDataPage />), renderToStaticMarkup(<HostTermsPage />)]) assert.ok(!/[–—]/.test(html));
});
