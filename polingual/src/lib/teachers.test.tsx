import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import type { Metadata } from "next";
import Site from "../app/site";
import { HandoutView, LessonPlanView, TeachersView } from "../app/(site)/teachers/views";
import { APP_STORE_URL, SITE } from "./facts";
import { sitemapPaths } from "./sitemap-paths";
import { HOMES, TARGETS, toggledTarget } from "./stoa/host";
import { parseSettings, PER_ROUND, ROUNDS } from "./stoa/questions";
import { ANSWER_SECONDS, QUESTION_COUNT, ROOM_SEATS, TARGET_LIMIT, TEACHERS_LANGS, TEACHERS_PAGES, quizLanguages, teachersCopy, teachersPath, teachersPaths } from "./teachers";
import { teachersMeta } from "./teachers-meta";
import { LANGS } from "./words";

const REPO = join(__dirname, "../../..");
const BANNED_MARKS = /[–—]/;

test("the teachers page links the host, the App Store and both printables", () => {
  for (const lang of TEACHERS_LANGS) {
    const html = renderToStaticMarkup(<TeachersView lang={lang} />);
    assert.match(html, /href="\/live"[^>]*data-testid="start-class-game"|data-testid="start-class-game"[^>]*href="\/live"/);
    assert.ok(html.includes(`href="${APP_STORE_URL}"`));
    assert.ok(html.includes(`href="${teachersPath(lang, "/lesson-plan")}"`));
    assert.ok(html.includes(`href="${teachersPath(lang, "/handout")}"`));
    assert.match(html, /"@type":"FAQPage"/);
    assert.match(html, /"@type":"MobileApplication"/);
    assert.match(html, /"@type":"BreadcrumbList"/);
    assert.doesNotMatch(html, BANNED_MARKS);
  }
});

test("the printables render in both languages with a print control", () => {
  for (const lang of TEACHERS_LANGS) {
    const plan = renderToStaticMarkup(<LessonPlanView lang={lang} />);
    const handout = renderToStaticMarkup(<HandoutView lang={lang} />);
    assert.match(plan, /data-testid="lesson-plan"/);
    assert.match(handout, /data-testid="handout"/);
    for (const html of [plan, handout]) {
      assert.match(html, /data-testid="print"/);
      assert.match(html, /polingual\.com\/join/);
      assert.doesNotMatch(html, BANNED_MARKS);
    }
    const sheet = handout.slice(handout.indexOf("<article"), handout.indexOf("</article>"));
    assert.ok(sheet.length > 0 && !sheet.includes("apps.apple.com"), "the printed sheet carries no store link");
  }
});

test("the language answer names every quiz language the host can pick", () => {
  for (const lang of TEACHERS_LANGS) {
    const answer = teachersCopy(lang).faq[2].a;
    assert.ok(answer.includes(String(TARGETS.length)));
    assert.ok(answer.includes(quizLanguages(lang)));
  }
  for (const t of TARGETS) assert.ok(quizLanguages("en").includes(LANGS[t].name), t);
  for (const h of HOMES) assert.ok(teachersCopy("en").faq[2].a.includes(LANGS[h].name), h);
});

test("the numbers on the page match the live game", () => {
  const settings = parseSettings({ home: "en", targets: ["es"] });
  assert.equal(settings?.window_ms, ANSWER_SECONDS * 1000);
  assert.equal(QUESTION_COUNT, ROUNDS * PER_ROUND);
  assert.equal(toggledTarget(TARGETS.filter((t) => t !== "en").slice(0, TARGET_LIMIT), "en").length, TARGET_LIMIT);
  assert.equal(parseSettings({ home: "en", targets: TARGETS.filter((t) => t !== "en").slice(0, TARGET_LIMIT + 1) }), null);
  const sql = readFileSync(join(REPO, "supabase/migrations/20261109000007_stoa_live_chorus.sql"), "utf8");
  assert.ok(sql.includes(`>= ${ROOM_SEATS} then`));
  const terms = readFileSync(join(__dirname, "../app/(site)/live/terms/page.tsx"), "utf8");
  assert.match(terms, /Hosting and joining are free\./);
  const entry = readFileSync(join(__dirname, "../app/(site)/join/phone/Entry.tsx"), "utf8");
  assert.match(entry, /No account and no personal details\./);
});

test("every teachers url is in the sitemap with its own canonical and a language pair", () => {
  const paths = sitemapPaths();
  assert.equal(teachersPaths().length, 6);
  for (const lang of TEACHERS_LANGS) {
    for (const page of TEACHERS_PAGES) {
      const path = teachersPath(lang, page);
      assert.ok(paths.includes(path), path);
      const m: Metadata = teachersMeta(lang, page);
      assert.equal(m.alternates?.canonical, `${SITE}${path}`);
      const langs = m.alternates?.languages as Record<string, string>;
      assert.equal(langs.en, `${SITE}${teachersPath("en", page)}`);
      assert.equal(langs.es, `${SITE}${teachersPath("es", page)}`);
    }
  }
});

test("the footer links the teachers page", () => {
  const html = renderToStaticMarkup(<Site><p>body</p></Site>);
  assert.match(html, /href="\/teachers"[^>]*>Teachers</);
});
