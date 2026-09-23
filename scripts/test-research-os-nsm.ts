import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { assemble, byCategory, colexFor, HIDE_BELOW, UNCERTAIN_BELOW, parseLang, toExponent, type NsmExponentRow, type NsmPrimeRow } from "../src/lib/research-os/nsm";
import { sql, loadLocalEnv } from "./lib/test-harness";

loadLocalEnv();

const prime = (id: string, ord: number, extra: Partial<NsmPrimeRow> = {}): NsmPrimeRow => ({
  id, label: id.toUpperCase(), category: ord < 3 ? "substantives" : "determiners", english: [id], ord,
  en_word: id, en_pos: "pron", sense: "a sense", sense_match: true, ...extra,
});
const exp = (prime_id: string, lang: string, word: string, confidence: number | string | null, rank = 1): NsmExponentRow => ({
  prime_id, lang, word, rank, roman: null, sense: "a sense", sense_match: Number(confidence) >= HIDE_BELOW, confidence,
  root_confidence: null, root_lang: null, root_form: null, root_gloss: null,
});

test("hidden words stay out unless asked for, and uncertain ones are marked", () => {
  const primes = [prime("you", 2), prime("i", 1)];
  const rows = [exp("i", "la", "ego", 0.9), exp("i", "fr", "je", 0.6), exp("i", "de", "ich", "0.4"), exp("you", "la", "tu", 0.2), exp("you", "de", "du", null)];
  const shown = assemble(primes, rows);
  assert.deepEqual(shown.map((p) => p.id), ["i", "you"]);
  assert.deepEqual(shown[0].exponents.map((e) => [e.word, e.uncertain]), [["je", true], ["ego", false]]);
  assert.equal(shown[1].exponents.length, 0);
  const all = assemble(primes, rows, { includeHidden: true });
  assert.deepEqual(all[0].exponents.map((e) => [e.word, e.hidden]), [["je", false], ["ich", true], ["ego", false]]);
  assert.deepEqual(all[1].exponents.map((e) => [e.word, e.confidence]), [["du", 0], ["tu", 0.2]]);
});

test("a root below the threshold is withheld, and one below the uncertain line is marked", () => {
  const row = { ...exp("happen", "pl", "stać się", 0.9), root_lang: "ine-pro", root_form: "*steh₂-", root_gloss: "to stand" };
  const hidden = toExponent({ ...row, root_confidence: 0.45 });
  assert.deepEqual([hidden.rootHidden, hidden.rootForm, hidden.rootGloss, hidden.rootLang], [true, null, null, null]);
  const asked = toExponent({ ...row, root_confidence: "0.45" }, { includeHidden: true });
  assert.deepEqual([asked.rootHidden, asked.rootForm], [true, "*steh₂-"]);
  const uncertain = toExponent({ ...row, root_confidence: 0.6 });
  assert.deepEqual([uncertain.rootHidden, uncertain.rootUncertain, uncertain.rootGloss], [false, true, "to stand"]);
  const sure = toExponent({ ...row, root_confidence: 0.9 });
  assert.deepEqual([sure.rootUncertain, sure.rootForm], [false, "*steh₂-"]);
  assert.equal(toExponent({ ...row, root_confidence: null }).rootForm, null);
});

test("a colexified word names the other prime, and the merges list both sides", () => {
  const e = toExponent({ ...exp("can", "pt", "saber", 0.7), colex_with: ["know", 3 as unknown as string] });
  assert.deepEqual(e.colexWith, ["know"]);
  assert.equal(e.uncertain, true);
  assert.deepEqual(toExponent(exp("can", "pt", "poder", 0.9)).colexWith, []);
  const labels = new Map([["can", "CAN"], ["know", "KNOW"], ["feel", "FEEL"]]);
  const rows = [
    { prime_a: "can", prime_b: "know", lang: "pt", form: "saber", family_count: 8, matched: true },
    { prime_a: "feel", prime_b: "know", lang: "fi", form: "tuntea", family_count: 6, matched: false },
  ];
  assert.deepEqual(colexFor("know", rows, labels).map((c) => [c.otherLabel, c.langName, c.matched]), [["CAN", "Portuguese", true], ["FEEL", "Finnish", false]]);
  const [can] = assemble([prime("can", 1)], [], { colex: rows });
  assert.deepEqual(can.colex.map((c) => c.other), ["know"]);
});

test("a prime with no lookup and a fallback sense read as such", () => {
  const [none, fallback, matched] = assemble(
    [prime("a", 1, { sense: null, sense_match: null, en_word: null }), prime("b", 2, { sense_match: false }), prime("c", 3)],
    [],
  );
  assert.equal(none.senseStatus, "none");
  assert.equal(none.lookup, null);
  assert.equal(fallback.senseStatus, "fallback");
  assert.equal(matched.senseStatus, "matched");
  assert.equal(matched.lookup, "c, pron");
});

test("categories keep the order of the primes", () => {
  const groups = byCategory(assemble([prime("x", 1), prime("y", 2), prime("z", 3)], []));
  assert.deepEqual(groups.map((g) => [g.category, g.primes.length]), [["substantives", 2], ["determiners", 1]]);
});

test("a language code parses or is refused", () => {
  assert.equal(parseLang(null), null);
  assert.equal(parseLang(" "), null);
  assert.equal(parseLang("es"), "es");
  assert.equal(parseLang("grc"), "grc");
  assert.equal(parseLang("es'; drop"), undefined);
});

const probe = sql("select count(*) from graph.nsm_primes");
const ready = probe.status === 0 && Number(probe.out) >= 65 && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (process.env.RESEARCH_OS_REQUIRE_DB === "1" && !ready) {
  throw new Error(`RESEARCH_OS_REQUIRE_DB=1 and the local stack has no loaded primes: ${probe.out}`);
}
const skip = ready ? false : "no local stack with the NSM primes loaded";

async function get(query: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const { GET } = await import("../src/app/api/research-os/nsm/route");
  const { NextRequest } = await import("next/server");
  const res = await GET(new NextRequest(`http://localhost/api/research-os/nsm${query}`), undefined);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

interface ApiPrime { id: string; label: string; senseStatus: string; exponents: { lang: string; word: string; hidden: boolean; uncertain: boolean; confidence: number; rootForm: string | null; rootGloss: string | null; rootConfidence: number }[] }

test("the route answers every prime with the shown words only", { skip }, async () => {
  const { status, body } = await get("");
  assert.equal(status, 200);
  const primes = body.primes as ApiPrime[];
  assert.equal(primes.length, 65);
  assert.deepEqual([body.hideBelow, body.uncertainBelow], [HIDE_BELOW, UNCERTAIN_BELOW]);
  assert.ok(primes.some((p) => p.exponents.length > 0));
  assert.ok(primes.every((p) => p.exponents.every((e) => !e.hidden && e.confidence >= HIDE_BELOW && e.uncertain === e.confidence < UNCERTAIN_BELOW)));
  const shown = primes.flatMap((p) => p.exponents);
  assert.ok(shown.every((e) => (e.rootForm === null && e.rootGloss === null) || e.rootConfidence >= HIDE_BELOW));
  assert.ok(shown.filter((e) => /\s/.test(e.word.trim())).every((e) => e.rootForm === null));
  assert.ok(shown.some((e) => e.rootForm !== null));
  assert.ok(primes.filter((p) => p.senseStatus === "none").every((p) => p.exponents.length === 0));
  assert.ok((body.attribution as { license: string }).license.includes("by-sa"));
  assert.ok((body.citation as { text: string }).text.includes("Goddard"));
  assert.ok((body.colexAttribution as { license: string }).license.includes("by/4.0"));
  const lowered = Number(sql("select count(*) from graph.nsm_exponents where colex_with is not null and confidence >= 0.5").out);
  const withColex = shown.filter((e) => (e as unknown as { colexWith: string[] }).colexWith.length > 0);
  assert.equal(withColex.length, lowered);
  assert.ok(withColex.every((e) => e.uncertain));
});

test("?lang= keeps one language and ?hidden=1 adds the hidden words", { skip }, async () => {
  const es = await get("?lang=es");
  assert.equal(es.status, 200);
  const langs = new Set((es.body.primes as ApiPrime[]).flatMap((p) => p.exponents.map((e) => e.lang)));
  assert.deepEqual(Array.from(langs), ["es"]);
  const withHidden = await get("?lang=es&hidden=1");
  const count = (b: Record<string, unknown>) => (b.primes as ApiPrime[]).reduce((n, p) => n + p.exponents.length, 0);
  const lowInDb = Number(sql(`select count(*) from graph.nsm_exponents where lang = 'es' and confidence < ${HIDE_BELOW}`).out);
  assert.equal(count(withHidden.body), count(es.body) + lowInDb);
  const bad = await get("?lang=es'x");
  assert.equal(bad.status, 400);
});

test("anon and authenticated may read the tables and may not write them", { skip }, () => {
  for (const role of ["anon", "authenticated"]) {
    const read = sql(`begin; grant usage on schema graph to ${role}; set local role ${role};
      select (select count(*) from graph.nsm_primes) > 0 and (select count(*) from graph.nsm_exponents) > 0; rollback;`);
    assert.equal(read.status, 0, read.out);
    assert.match(read.out, /^t$/m, `${role} read: ${read.out}`);
    for (const write of [
      "insert into graph.nsm_primes (id, label, category, ord) values ('zz_rls', 'X', 'x', 199)",
      "update graph.nsm_exponents set word = 'x' where lang = 'es'",
      "delete from graph.nsm_primes",
    ]) {
      const w = sql(`begin; grant usage on schema graph to ${role}; set local role ${role}; ${write}; rollback;`);
      assert.notEqual(w.status, 0, `${role} wrote: ${write}`);
      assert.match(w.out, /permission denied|row-level security/, w.out);
    }
  }
  assert.equal(sql("select has_schema_privilege('anon', 'graph', 'usage')").out, "f");
});

test("an exponent carries its Hebrew Bible verses only while its root shows", () => {
  const verses = { corpus: "Hebrew Bible", source: "Original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb", count: 3, samples: [{ ref: "Genesis 1:3", text: "אוֹר" }] };
  const base = { ...exp("see", "he", "ראה", 0.9), root_lang: "he", root_form: "ר־א־ה", root_gloss: "see", root_texts: [verses] };
  assert.equal(toExponent({ ...base, root_confidence: 0.8 }).rootTexts.length, 1);
  assert.equal(toExponent({ ...base, root_confidence: 0.6 }).rootTexts.length, 1);
  assert.deepEqual(toExponent({ ...base, root_confidence: 0.4 }).rootTexts, []);
  assert.deepEqual(toExponent({ ...base, root_confidence: 0.4 }, { includeHidden: true }).rootTexts, []);
  assert.deepEqual(toExponent({ ...base, root_confidence: 0.8, root_texts: "junk" }).rootTexts, []);
  assert.deepEqual(toExponent(exp("see", "he", "ראה", 0.9)).rootTexts, []);
});
