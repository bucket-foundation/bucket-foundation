import { createHash, randomBytes } from "node:crypto";
import { sharedRateLimiter, type MarkStore } from "../download/marks";
import { bearer, matchToken, parseTokens, revokedInEnv, revokedInStore, sharedRevocationCache, type Poster, type RevocationCache } from "./auth";
import { entryLeaks } from "./leak-filter.mjs";
import { KINDS, parseEntryBody, type ImageMeta, type Kind } from "./schema";
import {
  addUsage,
  appendAudit,
  clearUsage,
  createEntry,
  entryIds,
  listEntries,
  markRevoked,
  readEntry,
  readUsage,
  removeEntry,
  removeImage,
  writeEntry,
  writeImage,
  type DocStore,
  type StoredEntry,
  type Usage,
} from "./store";

type Env = Record<string, string | undefined>;

export const BODY_MAX_BYTES = 4 * 1024 * 1024;

export interface Limits {
  ratePerMinute: number;
  draftsPerPoster: number;
  draftsTotal: number;
  imageBytesPerPoster: number;
}

export const DEFAULT_LIMITS: Limits = { ratePerMinute: 20, draftsPerPoster: 200, draftsTotal: 2000, imageBytesPerPoster: 50 * 1024 * 1024 };

export interface Deps {
  env: Env;
  store: DocStore | null;
  marks: MarkStore | null;
  legacy: LegacyEntry[];
  clock?: () => number;
  limits?: Limits;
  revocationCache?: RevocationCache;
}

export interface LegacyEntry {
  id: string;
  date: string;
  category?: string;
  [field: string]: unknown;
}

export interface Result {
  status: number;
  body: Record<string, unknown> | null;
}

export interface PostRequest {
  authorization: string | null;
  contentType: string | null;
  contentLength: string | null;
  body: ReadableStream<Uint8Array> | null;
}

export interface ListRequest {
  authorization: string | null;
  kind: string | null;
  state: string | null;
}

export interface RevokeRequest {
  authorization: string | null;
  name: string;
}

const NOT_FOUND: Result = { status: 404, body: null };
const POSTER_NAME = /^[a-z0-9-]{1,40}$/;

function fail(status: number, error: string, extra: Record<string, unknown> = {}): Result {
  return { status, body: { error, ...extra } };
}

function unavailable(what: string, err: unknown): Result {
  console.error(`[whats-new] ${what}:`, err instanceof Error ? err.message : err);
  return fail(503, "The store is unavailable. Try again.");
}

async function authorize(authorization: string | null, deps: Deps): Promise<{ poster: Poster; store: DocStore } | Result> {
  const poster = matchToken(bearer(authorization), parseTokens(deps.env.WHATS_NEW_TOKENS));
  if (!poster || revokedInEnv(poster.name, deps.env)) return NOT_FOUND;
  if (!deps.store) return fail(503, "No store is connected.");
  try {
    if (await revokedInStore(deps.store, poster.name, deps.revocationCache ?? sharedRevocationCache, deps.clock)) return NOT_FOUND;
  } catch (err) {
    return unavailable("revocation read failed", err);
  }
  return { poster, store: deps.store };
}

export async function readCapped(body: ReadableStream<Uint8Array> | null, maxBytes: number): Promise<Buffer | null> {
  if (!body) return Buffer.alloc(0);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(chunks);
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
}

function imageBytes(entry: StoredEntry | null): number {
  const bytes = (entry?.image as ImageMeta | undefined)?.bytes;
  return typeof bytes === "number" ? bytes : 0;
}

export async function handlePost(req: PostRequest, deps: Deps): Promise<Result> {
  const auth = await authorize(req.authorization, deps);
  if ("status" in auth) return auth;
  const { poster, store } = auth;
  const clock = deps.clock ?? Date.now;
  const limits = deps.limits ?? DEFAULT_LIMITS;

  if ((req.contentType ?? "").split(";")[0].trim().toLowerCase() !== "application/json") return fail(415, "Send the entry as application/json.");
  if (Number(req.contentLength ?? 0) > BODY_MAX_BYTES) return fail(413, "The body is over 4 MB.");

  if (!deps.marks) return fail(503, "No store is connected.");
  try {
    if (await sharedRateLimiter(deps.marks, limits.ratePerMinute, 60_000, clock)(`whats-new:${poster.name}`)) {
      return fail(429, "Too many posts from this token. Try again in a minute.");
    }
  } catch (err) {
    return unavailable("rate limit read failed", err);
  }

  const raw = await readCapped(req.body, BODY_MAX_BYTES);
  if (raw === null) return fail(413, "The body is over 4 MB.");
  let body: unknown;
  try {
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    return fail(400, "The body is not valid JSON.");
  }

  const parsed = parseEntryBody(body);
  if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
  const { entry, image } = parsed;

  const leaks = entryLeaks(entry) as { field: string; kind: string }[];
  if (leaks.length > 0) {
    const seen = new Set<string>();
    const fields = leaks.map((h) => ({ field: h.field, kind: h.kind })).filter((h) => !seen.has(`${h.field}:${h.kind}`) && Boolean(seen.add(`${h.field}:${h.kind}`)));
    return fail(422, "The leak filter rejected the entry.", { fields });
  }

  if (deps.legacy.some((e) => e.id === entry.id)) return fail(409, "This id belongs to an entry in the legacy feed.");

  const now = new Date(clock()).toISOString();
  const body_hash = createHash("sha256").update(raw).digest("hex");
  const fresh: StoredEntry = { ...entry, review_state: "draft", poster: poster.name, created_at: now, updated_at: now, body_hash };
  let reserved: Usage | null = null;
  try {
    let existing = await readEntry(store, entry.id);
    if (!existing) {
      const usage = await readUsage(store, poster.name);
      if (usage.drafts >= limits.draftsPerPoster) return fail(429, "This poster holds the maximum number of drafts.");
      if (usage.image_bytes + imageBytes(fresh) > limits.imageBytesPerPoster) return fail(429, "This poster holds the maximum bytes of images.");
      if ((await entryIds(store)).length >= limits.draftsTotal) return fail(429, "The store holds the maximum number of drafts.");
      const claim: Usage = { drafts: 1, image_bytes: imageBytes(fresh) };
      await addUsage(store, poster.name, claim);
      reserved = claim;
      if (!(await createEntry(store, fresh))) {
        await addUsage(store, poster.name, { drafts: -1, image_bytes: -claim.image_bytes });
        reserved = null;
        existing = await readEntry(store, entry.id);
        if (!existing) return fail(409, "This id was taken while the post was in flight. Send it again.");
      }
    }

    if (existing) {
      if (existing.poster !== poster.name) return fail(409, "This id belongs to another poster.");
      if (existing.kind !== entry.kind) return fail(409, `This id holds a ${existing.kind}; the kind of an entry is fixed.`);
      const delta = imageBytes(fresh) - imageBytes(existing);
      const usage = await readUsage(store, poster.name);
      if (delta > 0 && usage.image_bytes + delta > limits.imageBytesPerPoster) return fail(429, "This poster holds the maximum bytes of images.");
      if (delta !== 0) {
        await addUsage(store, poster.name, { drafts: 0, image_bytes: delta });
        reserved = { drafts: 0, image_bytes: delta };
      }
      await writeEntry(store, { ...fresh, created_at: existing.created_at });
    }

    reserved = null;
    if (image) await writeImage(store, entry.id, image);
    else if (existing) await removeImage(store, entry.id);
    await appendAudit(
      store,
      { ts: now, id: entry.id, poster: poster.name, action: existing ? "replace" : "create", body_hash, previous_body_hash: existing?.body_hash ?? null },
      randomBytes(4).toString("hex"),
    );
    return { status: existing ? 200 : 201, body: { ok: true, id: entry.id, kind: entry.kind, review_state: "draft", replaced: Boolean(existing) } };
  } catch (err) {
    if (reserved) {
      await addUsage(store, poster.name, { drafts: -reserved.drafts, image_bytes: -reserved.image_bytes }).catch((release: unknown) => {
        console.error("[whats-new] usage release failed:", release instanceof Error ? release.message : release);
      });
    }
    return unavailable("write failed", err);
  }
}

export async function handleRevoke(req: RevokeRequest, deps: Deps): Promise<Result> {
  const auth = await authorize(req.authorization, deps);
  if ("status" in auth) return auth;
  if (auth.poster.scope !== "admin") return NOT_FOUND;
  if (!POSTER_NAME.test(req.name)) return fail(400, "name must match [a-z0-9-]{1,40}", { field: "name" });
  const { store } = auth;
  const clock = deps.clock ?? Date.now;
  const now = new Date(clock()).toISOString();
  try {
    await markRevoked(store, req.name, now);
    (deps.revocationCache ?? sharedRevocationCache).set(`${store.prefix}${req.name}`, { revoked: true, at: clock() });
    const drafts = (await listEntries(store)).filter((e) => e.poster === req.name && e.review_state === "draft");
    for (const draft of drafts) await removeEntry(store, draft.id);
    await clearUsage(store, req.name);
    const deleted = drafts.map((d) => d.id).sort();
    await appendAudit(
      store,
      { ts: now, id: `token-${req.name}`, poster: auth.poster.name, action: "revoke", body_hash: null, previous_body_hash: null, deleted },
      randomBytes(4).toString("hex"),
    );
    return { status: 200, body: { ok: true, revoked: req.name, deleted } };
  } catch (err) {
    return unavailable("revoke failed", err);
  }
}

function legacyKind(entry: LegacyEntry): string {
  return entry.category === "production" || entry.category === "generation" ? entry.category : "update";
}

function publicView(entry: StoredEntry): Record<string, unknown> {
  const { poster: _poster, body_hash: _hash, review_state: _review, ...rest } = entry;
  return rest;
}

export function mergeEntries(legacy: LegacyEntry[], stored: StoredEntry[], kind: Kind | null = null): Record<string, unknown>[] {
  const taken = new Set(legacy.map((e) => e.id));
  const published = stored.filter((e) => e.review_state === "published" && !taken.has(e.id)).map(publicView);
  const all = [...legacy, ...published] as (Record<string, unknown> & { date: string; category?: string; kind?: string })[];
  return all
    .filter((e) => kind === null || (e.kind ?? legacyKind(e as LegacyEntry)) === kind)
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.date < b.e.date ? 1 : a.e.date > b.e.date ? -1 : a.i - b.i))
    .map(({ e }) => e);
}

export async function handleList(req: ListRequest, deps: Deps): Promise<Result> {
  if (req.kind !== null && !KINDS.includes(req.kind as Kind)) return fail(400, `kind must be one of ${KINDS.join(", ")}`, { field: "kind" });
  const kind = req.kind as Kind | null;
  if (req.state === null) return { status: 200, body: { version: 1, entries: mergeEntries(deps.legacy, [], kind) } };

  const auth = await authorize(req.authorization, deps);
  if ("status" in auth) return auth;
  if (auth.poster.scope !== "admin") return NOT_FOUND;
  if (req.state !== "draft") return fail(400, "state must be draft", { field: "state" });
  try {
    const drafts = (await listEntries(auth.store)).filter((e) => e.review_state === "draft" && (kind === null || e.kind === kind));
    drafts.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
    return { status: 200, body: { version: 1, entries: drafts } };
  } catch (err) {
    return unavailable("draft list failed", err);
  }
}
