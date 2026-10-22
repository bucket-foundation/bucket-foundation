import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { lookupPhoton, meansLike, resetPhotonIndex } from "../src/lib/photon-index";

let failures = 0;
function ok(c: boolean, m: string) {
  if (c) console.log("  ok  " + m);
  else {
    console.error("  FAIL " + m);
    failures++;
  }
}

const prov = { source: "kaikki", source_uri: "x", captured_at: "" };
const base = { kind: "word", tier: "functional", branch: [], pos: "noun", ipa: null, provenance: prov };
const fixture = [
  { ...base, id: "photon:word:es:agua", lang: "es", surface: "agua", meaning_en: "water",
    means_like: [["photon:word:it:acqua", 0.97], ["photon:word:es:mar", 0.7], ["photon:word:gone", 0.5]],
    means_like_same: [["photon:word:es:mar", 0.7]] },
  { ...base, id: "photon:word:it:acqua", lang: "it", surface: "acqua", meaning_en: "water" },
  { ...base, id: "photon:word:es:mar", lang: "es", surface: "mar", meaning_en: "sea" },
  { ...base, id: "photon:word:en:water", lang: "en", surface: "water", meaning_en: "water" },
  { ...base, id: "photon:word:ar:مَاء", lang: "ar", surface: "مَاء", meaning_en: "water",
    means_like: [["photon:word:en:water", 0.9]] },
];

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "photon-ml-"));
const fixturePath = path.join(dir, "all.json");
fs.writeFileSync(fixturePath, JSON.stringify(fixture));
resetPhotonIndex(fixturePath);

const cross = meansLike("agua", "es", 10, true);
ok(cross.found && cross.results.map((r) => r.surface).join(",") === "acqua,mar", "cross list skips ids missing from the slice");
ok(cross.results[0].score === 0.97 && cross.results[0].lang === "it", "hit carries score and lang");
ok(meansLike("agua", "es", 1).results.length === 1, "k caps the results");
const same = meansLike("agua", "es", 10, false);
ok(same.results.length === 1 && same.results[0].surface === "mar", "same-language list");
ok(meansLike("Agua", null).found, "lookup ignores case");
ok(meansLike("ماء", "ar").results[0]?.surface === "water", "lookup ignores Arabic vowel marks");
ok(!meansLike("nada", "es").found, "unknown word reports not found");
ok(meansLike("water", "en").found && meansLike("water", "en").results.length === 0, "known word without neighbors returns none");
ok(lookupPhoton("agua", "it") === null, "lang filter applies");

const real = path.resolve(__dirname, "../_intake/photons/all.json");
ok(fs.statSync(real).size < 50 * 1024 * 1024, `all.json is ${fs.statSync(real).size} bytes, under 50 MB`);
resetPhotonIndex(real);
const corpus = path.resolve(__dirname, "../learning/app/corpus");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(corpus, f), "utf8"));
const missing: string[] = [];
for (const atom of read("lang-core.json").atoms) {
  for (const [lang, f] of Object.entries(atom.forms as Record<string, { word?: string }>)) {
    if (f?.word && !lookupPhoton(f.word, lang)) missing.push(`${lang}:${f.word}`);
  }
}
for (const ph of read("lang-phrases.json").phrases) {
  for (const [lang, text] of Object.entries(ph.forms as Record<string, string>)) {
    if (text && !lookupPhoton(text, lang)) missing.push(`${lang}:${text}`);
  }
}
ok(missing.length === 0, `every core and phrase form is in all.json${missing.length ? `: ${missing.slice(0, 8).join("; ")}` : ""}`);
const agua = meansLike("agua", "es", 12);
ok(agua.results.some((r) => r.surface === "acqua" || r.surface === "water"), "real slice: agua means like acqua or water");

async function routeCheck() {
  delete process.env.POLINGUAL_API_URL;
  delete process.env.POLINGUAL_FALLBACK_API_URL;
  const { GET } = await import("../src/app/api/polingual/route");
  type Req = Parameters<typeof GET>[0];
  const res = await GET(new Request("http://x/api/polingual?op=semantic&surface=agua&lang=es&k=5") as unknown as Req);
  const body = await res.json();
  ok(res.status === 200 && res.headers.get("x-polingual-upstream") === "static", "route answers semantic from the static slice");
  ok(Array.isArray(body.results) && body.results.length === 5, "route honors k");
  const miss = await GET(new Request("http://x/api/polingual?op=semantic&surface=zzqqxx&lang=es") as unknown as Req);
  ok(miss.status === 503, "route keeps 503 for words outside the slice");
  const look = await GET(new Request("http://x/api/polingual?op=lookup&surface=agua&lang=es") as unknown as Req);
  ok(look.status === 200 && (await look.json()).found === true, "route answers lookup from the static slice");
}

routeCheck().then(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  if (failures) {
    console.error(`${failures} failure(s)`);
    process.exit(1);
  }
  console.log("photon means-like: all passed");
});
