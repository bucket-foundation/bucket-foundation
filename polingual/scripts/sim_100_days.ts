import { FSRS, DAY_MS } from "../../src/lib/academy/fsrs";
const f = new FSRS(); f.requestRetention = 0.9;
const LANGS = 4, SIZE = 14, NEW = 5, DAYS = 100, CORPUS = 326;
function run(seed: number) {
  let s = seed; const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const cards: any[] = []; let introducedPer = Array(LANGS).fill(0); let reviews = 0;
  for (let d = 0; d < DAYS; d++) {
    const now = d * DAY_MS;
    const due = cards.filter(c => c.due <= now).sort((a, b) => a.due - b.due).slice(0, SIZE);
    let room = SIZE - due.length; const fresh: any[] = [];
    const budget = Array(LANGS).fill(NEW);
    outer: for (let i = 0; ; i++) { let any = false; for (let l = 0; l < LANGS; l++) { if (room <= 0) break outer; if (budget[l] > 0 && introducedPer[l] < CORPUS) { fresh.push({ lang: l }); budget[l]--; introducedPer[l]++; room--; any = true; } } if (!any) break; }
    for (const c of due) { const el = (now - c.lastReview) / DAY_MS; const R = f.retrievability(el, c.stability); const g = rnd() < R ? 3 : 1; Object.assign(c, f.review(c, g, now)); reviews++; }
    for (const c of fresh) { const g = rnd() < 0.7 ? 3 : 1; Object.assign(c, f.review(null, g, now)); cards.push(c); reviews++; }
  }
  const end = DAYS * DAY_MS;
  const R = cards.map(c => f.retrievability((end - c.lastReview) / DAY_MS, c.stability));
  return { words: cards.length, meanR: R.reduce((a, b) => a + b, 0) / R.length, recalled: R.reduce((a, b) => a + b, 0), reviewsPerDay: reviews / DAYS };
}
const rs = [1, 2, 3, 4, 5, 6, 7, 8].map(run);
const avg = (k: string) => rs.reduce((a, r: any) => a + r[k], 0) / rs.length;
console.log(JSON.stringify({ words: avg("words"), meanR: avg("meanR"), recalled: avg("recalled"), reviewsPerDay: avg("reviewsPerDay") }));
