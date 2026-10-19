import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Atom, EngineState } from "../src/lib/academy/engine";
import { MAX_FUTURE_MS, MAX_REFOLD_ROWS, createReviewLogHandlers, payloadHash, toAppendRow, type AppendResult, type AppendRow, type ReviewLogDeps, type StoredReview } from "../src/lib/academy/review-log-server";
import type { BirthYearBucket } from "../src/lib/research-os/consent";

const NOW = Date.UTC(2026, 9, 18, 12);
const ALLOWED = "capacitor://localhost";

interface World {
  deps: ReviewLogDeps;
  log: Map<string, AppendRow & { seq: number; uid: string }>;
  folds: { uid: string; branch: string; data: EngineState; seq: number }[];
  mastery: string[];
}

function world(over: Partial<ReviewLogDeps> = {}, band: BirthYearBucket | null = "18plus"): World {
  const log = new Map<string, AppendRow & { seq: number; uid: string }>();
  const cursor = new Map<string, number>();
  const folds: World["folds"] = [];
  const mastery: string[] = [];
  const stored = (r: AppendRow & { seq: number }): StoredReview => ({ ...r, reviewed_at: Date.parse(r.reviewed_at), seq: r.seq });
  const deps: ReviewLogDeps = {
    enabled: () => true,
    configured: () => true,
    origins: () => [ALLOWED],
    now: () => NOW,
    verifyUser: async (req) => req.headers.get("authorization")?.replace(/^Bearer /, "") || null,
    readAgeBand: async () => ({ ok: true, band }),
    appendReviews: async (uid, rows) =>
      rows.map((r): AppendResult => {
        const key = `${uid}/${r.branch}/${r.review_id}`;
        const prev = log.get(key);
        if (prev) return { review_id: r.review_id, status: prev.payload_hash === r.payload_hash ? "duplicate" : "conflict", seq: prev.seq };
        const seq = (cursor.get(uid) ?? 0) + 1;
        cursor.set(uid, seq);
        log.set(key, { ...r, seq, uid });
        return { review_id: r.review_id, status: "inserted", seq };
      }),
    readLog: async (uid, since, limit) => Array.from(log.values()).filter((r) => r.uid === uid && r.seq > since).sort((a, b) => a.seq - b.seq).slice(0, limit).map(stored),
    readBranch: async (uid, branch) => ({ baseline: null, rows: Array.from(log.values()).filter((r) => r.uid === uid && r.branch === branch).map(stored) }),
    writeFold: async (uid, branch, data, seq) => {
      folds.push({ uid, branch, data, seq });
      return true;
    },
    syncMastery: async (uid, branch) => {
      mastery.push(`${uid}/${branch}`);
      return { advanced: 0 };
    },
    atoms: () => ({}),
    ...over,
  };
  return { deps, log, folds, mastery };
}

function review(over: Record<string, unknown> = {}) {
  return { review_id: randomUUID(), branch: "lang", card_id: "ru:privet", rating: 3, level: "recall", reviewed_at: NOW - 60_000, tz: "UTC", atoms_version: "lang", device_id: "dev-a", ...over };
}

function post(body: unknown, user = "u1", origin: string | null = null): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (user) headers.authorization = `Bearer ${user}`;
  if (origin) headers.origin = origin;
  return new Request("https://bucket.foundation/api/academy/review-log", { method: "POST", headers, body: JSON.stringify(body) });
}

function get(query = "", user = "u1"): Request {
  return new Request(`https://bucket.foundation/api/academy/review-log${query}`, { headers: user ? { authorization: `Bearer ${user}` } : {} });
}

test("the kill switch answers 503 on GET and POST before any auth or write", async () => {
  let touched = false;
  const w = world({ enabled: () => false, verifyUser: async () => ((touched = true), "u1") });
  const h = createReviewLogHandlers(w.deps);
  assert.equal((await h.POST(post({ reviews: [review()] }))).status, 503);
  const g = await h.GET(get());
  assert.equal(g.status, 503);
  assert.deepEqual(await g.json(), { error: "review_log_disabled" });
  assert.equal(touched, false);
  assert.equal(w.log.size, 0);
});

test("an unauthenticated request gets 401", async () => {
  const h = createReviewLogHandlers(world().deps);
  assert.equal((await h.POST(post({ reviews: [review()] }, ""))).status, 401);
  assert.equal((await h.GET(get("", ""))).status, 401);
});

test("an unreadable age band fails closed with 503 and writes nothing", async () => {
  const w = world({ readAgeBand: async () => ({ ok: false }) });
  const res = await createReviewLogHandlers(w.deps).POST(post({ reviews: [review()] }));
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: "consent_unavailable" });
  assert.equal(w.log.size, 0);
});

for (const [band, reason] of [[null, "no_profile"], ["13to17", "minor_read_only"], ["under13", "under_13"]] as const) {
  test(`the learn gate refuses band ${band} with ${reason}`, async () => {
    const w = world({}, band);
    const res = await createReviewLogHandlers(w.deps).POST(post({ reviews: [review()] }));
    assert.equal(res.status, 403);
    const j = (await res.json()) as { error: string; needsProfile: boolean };
    assert.equal(j.error, reason);
    assert.equal(j.needsProfile, reason === "no_profile");
    assert.equal(w.log.size, 0);
  });
}

test("malformed batches get 400", async () => {
  const h = createReviewLogHandlers(world().deps);
  const r = review();
  for (const body of [{}, { reviews: [] }, { reviews: [review({ rating: 5 })] }, { reviews: [review({ review_id: "x" })] }, { reviews: [review({ tz: "" })] }, { reviews: [review({ reviewed_at: 5 })] }, { reviews: [review({ level: "guess" })] }, { reviews: [r, r] }, { reviews: Array.from({ length: 201 }, () => review()) }]) {
    assert.equal((await h.POST(post(body))).status, 400, JSON.stringify(body).slice(0, 80));
  }
});

test("a resend with the same payload is 200 duplicate and a changed payload is 409", async () => {
  const w = world();
  const h = createReviewLogHandlers(w.deps);
  const r = review();
  const first = await h.POST(post({ reviews: [r] }));
  assert.equal(first.status, 200);
  assert.equal(((await first.json()) as { results: AppendResult[] }).results[0].status, "inserted");
  const again = await h.POST(post({ reviews: [r] }));
  assert.equal(again.status, 200);
  assert.deepEqual(((await again.json()) as { results: AppendResult[] }).results, [{ review_id: r.review_id, status: "duplicate", seq: 1 }]);
  const changed = await h.POST(post({ reviews: [{ ...r, rating: 1 }] }));
  assert.equal(changed.status, 409);
  assert.equal(((await changed.json()) as { results: AppendResult[] }).results[0].status, "conflict");
  assert.equal(w.log.size, 1);
  assert.equal(w.folds.length, 2);
});

test("a retry after a failed fold refolds the branch", async () => {
  let fail = true;
  const w = world();
  const write = w.deps.writeFold;
  w.deps.writeFold = async (...a) => {
    if (fail) throw new Error("db down");
    return write(...a);
  };
  const h = createReviewLogHandlers(w.deps);
  const r = review();
  assert.deepEqual(((await (await h.POST(post({ reviews: [r] }))).json()) as { folded: string[] }).folded, []);
  fail = false;
  assert.deepEqual(((await (await h.POST(post({ reviews: [r] }))).json()) as { folded: string[] }).folded, ["lang"]);
});

test("an unconfigured service answers 503 sync_unavailable", async () => {
  const res = await createReviewLogHandlers(world({ configured: () => false }).deps).POST(post({ reviews: [review()] }));
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: "sync_unavailable" });
});

test("a corpus review folds when the atoms pack for its branch resolves", async () => {
  const atom = { id: "a1", title: "A", shell: "nucleus" };
  const w = world({ atoms: (branch) => ({ [`corpus:${branch}`]: [atom] as never }) });
  const res = await createReviewLogHandlers(w.deps).POST(post({ reviews: [review({ branch: "01-mathematics", atoms_version: "corpus:01-mathematics", card_id: "a1" })] }));
  assert.deepEqual(((await res.json()) as { folded: string[] }).folded, ["01-mathematics"]);
  assert.ok(w.folds[0].data.cards.a1);
});

test("reviewed_at more than 24h ahead is clamped to now and the hash keeps the client value", () => {
  const far = review({ reviewed_at: NOW + MAX_FUTURE_MS + 1 });
  const near = review({ reviewed_at: NOW + MAX_FUTURE_MS });
  assert.equal(toAppendRow(far as never, NOW).reviewed_at, new Date(NOW).toISOString());
  assert.equal(toAppendRow(near as never, NOW).reviewed_at, new Date(NOW + MAX_FUTURE_MS).toISOString());
  assert.equal(toAppendRow(far as never, NOW).payload_hash, payloadHash(far as never));
  assert.notEqual(payloadHash(far as never), payloadHash({ ...far, reviewed_at: NOW } as never));
});

test("an insert replays the branch log into academy_progress and runs mastery sync", async () => {
  const w = world();
  const h = createReviewLogHandlers(w.deps);
  const res = await h.POST(post({ reviews: [review(), review({ card_id: "ru:da", reviewed_at: NOW - 30_000 })] }));
  assert.equal(res.status, 200);
  assert.deepEqual(((await res.json()) as { folded: string[] }).folded, ["lang"]);
  assert.equal(w.folds.length, 1);
  assert.equal(w.folds[0].seq, 2);
  assert.ok(w.folds[0].data.cards["ru:privet"]);
  assert.ok(w.folds[0].data.cards["ru:da"]);
  assert.deepEqual(w.mastery, ["u1/lang"]);
});

test("a review with an unknown atoms pack is skipped with a reason and the rest of the branch still folds", async () => {
  const notes: string[] = [];
  const w = world({ noteSkips: async (_u, _b, ids, note) => void notes.push(`${ids.length} ${note}`) });
  const res = await createReviewLogHandlers(w.deps).POST(post({ reviews: [review({ atoms_version: "atoms-v9", card_id: "a" }), review({ card_id: "ru:da" })] }));
  assert.equal(res.status, 200);
  const j = (await res.json()) as { folded: string[]; skipped: { reason: string }[] };
  assert.deepEqual(j.folded, ["lang"]);
  assert.deepEqual(j.skipped.map((x) => x.reason), ["unknown atoms_version atoms-v9"]);
  assert.deepEqual(notes, ["1 unknown atoms_version atoms-v9"]);
  assert.ok(w.folds[0].data.cards["ru:da"]);
  assert.equal(w.folds[0].seq, 2);
});

function foldWorld() {
  const reads: { afterSeq?: number; limit?: number }[] = [];
  const fold = { data: null as EngineState | null, log_seq: null as number | null, fold_key: null as string | null };
  const w = world();
  const readBranch = w.deps.readBranch;
  w.deps.readBranch = async (uid, branch, opts) => {
    reads.push(opts ?? {});
    const all = await readBranch(uid, branch);
    return { baseline: all.baseline, rows: all.rows.filter((r) => r.seq > (opts?.afterSeq ?? 0)) };
  };
  w.deps.readFold = async () => fold;
  w.deps.writeFold = async (uid, branch, data, seq, key) => {
    w.folds.push({ uid, branch, data, seq });
    Object.assign(fold, { data, log_seq: seq, fold_key: key });
    return true;
  };
  return { w, reads, fold };
}

test("an append after the last folded review folds only the new rows on top of the stored fold", async () => {
  const { w, reads } = foldWorld();
  const h = createReviewLogHandlers(w.deps);
  await h.POST(post({ reviews: [review({ card_id: "ru:a", reviewed_at: NOW - 50_000 })] }));
  await h.POST(post({ reviews: [review({ card_id: "ru:b", reviewed_at: NOW - 40_000 })] }));
  assert.deepEqual(reads.map((r) => r.afterSeq ?? 0), [0, 1]);
  assert.ok(w.folds[1].data.cards["ru:a"] && w.folds[1].data.cards["ru:b"]);
});

test("a late review that sorts before the fold triggers a full refold", async () => {
  const { w, reads } = foldWorld();
  const h = createReviewLogHandlers(w.deps);
  await h.POST(post({ reviews: [review({ card_id: "ru:a", reviewed_at: NOW - 50_000 })] }));
  await h.POST(post({ reviews: [review({ card_id: "ru:old", reviewed_at: NOW - 90_000 })] }));
  assert.deepEqual(reads.map((r) => r.afterSeq ?? 0), [0, 1, 0]);
  assert.ok(w.folds[1].data.cards["ru:old"] && w.folds[1].data.cards["ru:a"]);
});

test("rows skipped for a missing atoms pack fold in once the pack ships, and their notes clear", async () => {
  const { w } = foldWorld();
  let pack: Record<string, Atom[]> = {};
  const notes = new Map<string, string>();
  w.deps.atoms = () => pack;
  w.deps.noteSkips = async (_u, _b, ids, note) => ids.forEach((id) => notes.set(id, note));
  w.deps.skippedVersions = async () => Array.from(new Set(Array.from(w.log.values()).filter((r) => notes.has(r.review_id)).map((r) => r.atoms_version)));
  w.deps.clearSkips = async (_u, _b, ids) => ids.forEach((id) => notes.delete(id));
  const h = createReviewLogHandlers(w.deps);
  await h.POST(post({ reviews: [review({ atoms_version: "corpus:x", card_id: "a1", reviewed_at: NOW - 50_000 })] }));
  await h.POST(post({ reviews: [review({ card_id: "ru:b", reviewed_at: NOW - 40_000 })] }));
  assert.equal(notes.size, 1);
  assert.equal(w.folds.at(-1)!.data.cards.a1, undefined);
  pack = { "corpus:x": [{ id: "a1", title: "A1", shell: "nucleus" } as unknown as Atom] };
  await h.POST(post({ reviews: [review({ card_id: "ru:c", reviewed_at: NOW - 30_000 })] }));
  assert.ok(w.folds.at(-1)!.data.cards.a1);
  assert.ok(w.folds.at(-1)!.data.cards["ru:b"] && w.folds.at(-1)!.data.cards["ru:c"]);
  assert.equal(notes.size, 0);
});

test("a full refold over the row cap is skipped and reported", async () => {
  const w = world();
  w.deps.readBranch = async () => ({ baseline: null, rows: Array.from({ length: MAX_REFOLD_ROWS + 1 }, (_, i) => ({ review_id: `r${i}`, branch: "lang", card_id: "ru:a", rating: 3, level: "recall", reviewed_at: NOW, tz: "UTC", atoms_version: "lang", device_id: "d", seq: i + 1 })) as StoredReview[] });
  const notes: string[] = [];
  w.deps.noteCapped = async (_u, branch, note) => void notes.push(`${branch}: ${note}`);
  const res = await createReviewLogHandlers(w.deps).POST(post({ reviews: [review()] }));
  const j = (await res.json()) as { folded: string[]; capped: string[] };
  assert.deepEqual(j.folded, []);
  assert.deepEqual(j.capped, ["lang"]);
  assert.deepEqual(notes, [`lang: refold over ${MAX_REFOLD_ROWS} rows skipped`]);
  assert.equal(w.folds.length, 0);
});

test("GET pages one user's log by seq and never shows another user's rows", async () => {
  const w = world();
  const h = createReviewLogHandlers(w.deps);
  await h.POST(post({ reviews: [review(), review(), review()] }, "u1"));
  await h.POST(post({ reviews: [review()] }, "u2"));
  const page = (await (await h.GET(get("?since=1&limit=1"))).json()) as { reviews: StoredReview[]; cursor: number; more: boolean };
  assert.deepEqual([page.reviews.map((r) => r.seq), page.cursor, page.more], [[2], 2, true]);
  const other = (await (await h.GET(get("", "u2"))).json()) as { reviews: StoredReview[] };
  assert.equal(other.reviews.length, 1);
  assert.equal((await h.GET(get("?since=-1"))).status, 400);
  assert.equal((await h.GET(get("?limit=501"))).status, 400);
});

test("CORS echoes an allowlisted origin and sends no allow-origin for others", async () => {
  const h = createReviewLogHandlers(world().deps);
  const ok = h.OPTIONS(new Request("https://bucket.foundation/api/academy/review-log", { method: "OPTIONS", headers: { origin: ALLOWED } }));
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get("access-control-allow-origin"), ALLOWED);
  assert.equal(ok.headers.get("vary"), "Origin");
  const bad = h.OPTIONS(new Request("https://bucket.foundation/api/academy/review-log", { method: "OPTIONS", headers: { origin: "https://evil.example" } }));
  assert.equal(bad.headers.get("access-control-allow-origin"), null);
  const posted = await h.POST(post({ reviews: [review()] }, "u1", ALLOWED));
  assert.equal(posted.headers.get("access-control-allow-origin"), ALLOWED);
  const refused = await h.POST(post({ reviews: [review()] }, "", "https://evil.example"));
  assert.equal(refused.headers.get("access-control-allow-origin"), null);
});
