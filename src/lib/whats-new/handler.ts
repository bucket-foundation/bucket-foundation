import { createHash, randomBytes } from "node:crypto";
import { sharedRateLimiter, type MarkStore } from "../download/marks";
import { bearer, matchToken, parseTokens, revokedInEnv, revokedInStore, sharedRevocationCache, type Poster, type RevocationCache } from "./auth";
import { storedWebp, toWebp, webpName, type Encoded, type StoredImage } from "./image";
import { entryLeaks } from "./leak-filter.mjs";
import { loadPublicEntries, mergeEntries, type LegacyEntry } from "./public";
import { ID, KINDS, parseEntryBody, type ImageMeta, type Kind } from "./schema";
import {
  addUsage,
  appendAudit,
  clearUsage,
  createEntry,
  entryIds,
  listEntries,
  markRevoked,
  readEntry,
  readImage,
  readUsage,
  removeEntry,
  removeImage,
  withEntryLock,
  BUSY,
  tombstone,
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
  published?: () => Promise<StoredEntry[]>;
  encodeImage?: (bytes: Buffer, declared: string) => Promise<Encoded>;
}

export { mergeEntries, type LegacyEntry };

export interface Result {
  status: number;
  body: Record<string, unknown> | null;
  publicChanged?: boolean;
}

export interface EntryRequest {
  authorization: string | null;
  id: string;
  ifMatch?: string | null;
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
const IN_FLIGHT: Result = { status: 409, body: { error: "Another write to this id is in flight. Send it again." } };
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
  const { entry } = parsed;

  const leaks = entryLeaks(entry) as { field: string; kind: string }[];
  if (leaks.length > 0) {
    const seen = new Set<string>();
    const fields = leaks.map((h) => ({ field: h.field, kind: h.kind })).filter((h) => !seen.has(`${h.field}:${h.kind}`) && Boolean(seen.add(`${h.field}:${h.kind}`)));
    return fail(422, "The leak filter rejected the entry.", { fields });
  }

  if (deps.legacy.some((e) => e.id === entry.id)) return fail(409, "This id belongs to an entry in the legacy feed.");

  const now = new Date(clock()).toISOString();
  const body_hash = createHash("sha256").update(raw).digest("hex");
  let reserved: Usage | null = null;
  const write = async (): Promise<Result> => {
    const existing = await readEntry(store, entry.id);
    if (existing) {
      if (existing.poster !== poster.name) return fail(409, "This id belongs to another poster.");
      if (existing.review_state === "deleted") return fail(409, "This id was deleted and stays retired.");
      if (existing.kind !== entry.kind) return fail(409, `This id holds a ${existing.kind}; the kind of an entry is fixed.`);
    } else {
      if ((await readUsage(store, poster.name)).drafts >= limits.draftsPerPoster) return fail(429, "This poster holds the maximum number of drafts.");
      if ((await entryIds(store)).length >= limits.draftsTotal) return fail(429, "The store holds the maximum number of drafts.");
    }

    let image: StoredImage | null = null;
    if (parsed.image && entry.kind === "production") {
      const encoded = await (deps.encodeImage ?? toWebp)(Buffer.from(parsed.image.base64, "base64"), parsed.image.content_type);
      if (!encoded.ok && encoded.unavailable) return fail(503, "Images cannot be processed right now. Entries without an image still post.");
      if (!encoded.ok) return fail(400, `image.base64 ${encoded.reason}`, { field: "image.base64" });
      const filename = webpName(parsed.image.filename);
      image = { filename, content_type: "image/webp", base64: encoded.webp.toString("base64") };
      entry.image = { filename, content_type: "image/webp", bytes: encoded.webp.length, width: encoded.width, height: encoded.height };
    }
    const fresh: StoredEntry = { ...entry, review_state: "draft", poster: poster.name, created_at: existing?.created_at ?? now, updated_at: now, body_hash };
    const wasPublished = existing?.review_state === "published";
    const delta = imageBytes(fresh) - imageBytes(existing);
    if (delta > 0 && (await readUsage(store, poster.name)).image_bytes + delta > limits.imageBytesPerPoster) return fail(429, "This poster holds the maximum bytes of images.");
    const claim: Usage = { drafts: !existing || wasPublished ? 1 : 0, image_bytes: delta };
    if (claim.drafts !== 0 || delta !== 0) {
      await addUsage(store, poster.name, claim);
      reserved = claim;
    }

    if (existing) await writeEntry(store, fresh);
    else if (!(await createEntry(store, fresh))) {
      await addUsage(store, poster.name, { drafts: -claim.drafts, image_bytes: -claim.image_bytes });
      reserved = null;
      return fail(409, "This id was taken while the post was in flight. Send it again.");
    }
    try {
      if (image) await writeImage(store, entry.id, body_hash, image);
    } catch (err) {
      if (existing) await writeEntry(store, existing);
      else await removeEntry(store, entry.id, body_hash);
      throw err;
    }
    if (existing && existing.body_hash !== body_hash) await removeImage(store, entry.id, existing.body_hash);

    reserved = null;
    await appendAudit(
      store,
      { ts: now, id: entry.id, poster: poster.name, action: existing ? "replace" : "create", body_hash, previous_body_hash: existing?.body_hash ?? null },
      randomBytes(4).toString("hex"),
    );
    return {
      status: existing ? 200 : 201,
      body: { ok: true, id: entry.id, kind: entry.kind, review_state: "draft", replaced: Boolean(existing) },
      publicChanged: wasPublished,
    };
  };
  try {
    const result = await withEntryLock(store, entry.id, clock, write);
    return result === BUSY ? IN_FLIGHT : result;
  } catch (err) {
    const held = reserved as Usage | null;
    if (held) {
      await addUsage(store, poster.name, { drafts: -held.drafts, image_bytes: -held.image_bytes }).catch((release: unknown) => {
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
  if (req.name === auth.poster.name) return fail(409, "A token cannot revoke itself. Use another admin token.");
  const { store } = auth;
  const clock = deps.clock ?? Date.now;
  const now = new Date(clock()).toISOString();
  try {
    await markRevoked(store, req.name, now);
    (deps.revocationCache ?? sharedRevocationCache).set(`${store.prefix}${req.name}`, { revoked: true, at: clock() });
    const drafts = (await listEntries(store)).filter((e) => e.poster === req.name && e.review_state === "draft");
    for (const draft of drafts) await removeEntry(store, draft.id, draft.body_hash);
    await clearUsage(store, req.name);
    const deleted = drafts.map((d) => d.id).sort();
    const previous_body_hashes = Object.fromEntries(deleted.map((id) => [id, drafts.find((d) => d.id === id)?.body_hash ?? ""]));
    await appendAudit(
      store,
      { ts: now, id: `token-${req.name}`, poster: auth.poster.name, action: "revoke", body_hash: null, previous_body_hash: null, deleted, previous_body_hashes },
      randomBytes(4).toString("hex"),
    );
    return { status: 200, body: { ok: true, revoked: req.name, deleted } };
  } catch (err) {
    return unavailable("revoke failed", err);
  }
}

async function admin(req: EntryRequest, deps: Deps): Promise<{ poster: Poster; store: DocStore } | Result> {
  const auth = await authorize(req.authorization, deps);
  if ("status" in auth) return auth;
  if (auth.poster.scope !== "admin") return NOT_FOUND;
  if (!ID.test(req.id)) return fail(400, "id must match [a-z0-9-]{3,80}", { field: "id" });
  return auth;
}

async function liveEntry(store: DocStore, id: string): Promise<{ entry: StoredEntry } | { refused: Result }> {
  const entry = await readEntry(store, id);
  if (!entry) return { refused: fail(404, "No stored entry has this id.") };
  if (entry.review_state === "deleted") return { refused: fail(410, "This entry was deleted.") };
  return { entry };
}

async function locked(store: DocStore, id: string, deps: Deps, what: string, run: () => Promise<Result>): Promise<Result> {
  try {
    const result = await withEntryLock(store, id, deps.clock ?? Date.now, run);
    return result === BUSY ? IN_FLIGHT : result;
  } catch (err) {
    return { ...unavailable(`${what} failed`, err), publicChanged: true };
  }
}

export async function handlePublish(req: EntryRequest, deps: Deps): Promise<Result> {
  const auth = await admin(req, deps);
  if ("status" in auth) return auth;
  const { poster, store } = auth;
  const reviewed = (req.ifMatch ?? "").trim().replace(/^"|"$/g, "");
  if (!reviewed) return fail(428, "Send the body hash of the reviewed draft in if-match.");
  return locked(store, req.id, deps, "publish", async () => {
    const found = await liveEntry(store, req.id);
    if ("refused" in found) return found.refused;
    const { entry } = found;
    if (deps.legacy.some((e) => e.id === entry.id)) return fail(409, "This id belongs to an entry in the legacy feed.");
    if (entry.source !== "own") return fail(409, "Only own work can be published; this entry stays a draft.");
    if (reviewed !== entry.body_hash) return fail(412, "The entry changed after it was reviewed. Read the draft again.");
    if (entry.review_state === "published") {
      return { status: 200, body: { ok: true, id: entry.id, review_state: "published", published_at: entry.published_at, changed: false } };
    }
    if (entry.image && !storedWebp(await readImage(store, entry.id, entry.body_hash))) {
      return fail(409, "The stored image is missing or was stored before images were converted. Post the entry again.");
    }
    const now = new Date((deps.clock ?? Date.now)()).toISOString();
    await appendAudit(
      store,
      { ts: now, id: entry.id, poster: poster.name, action: "publish", body_hash: entry.body_hash, previous_body_hash: entry.body_hash },
      randomBytes(4).toString("hex"),
    );
    await writeEntry(store, { ...entry, review_state: "published", published_at: now, updated_at: now });
    const after = await readEntry(store, entry.id);
    if (!after || after.body_hash !== reviewed) {
      if (after?.review_state === "published") await writeEntry(store, { ...after, review_state: "draft", published_at: undefined });
      return { ...fail(409, "The entry changed while it was being published. It stays a draft; read it again."), publicChanged: true };
    }
    await addUsage(store, entry.poster, { drafts: -1, image_bytes: 0 });
    return { status: 200, body: { ok: true, id: entry.id, review_state: "published", published_at: now, date: now.slice(0, 10), changed: true }, publicChanged: true };
  });
}

export async function handleDelete(req: EntryRequest, deps: Deps): Promise<Result> {
  const auth = await admin(req, deps);
  if ("status" in auth) return auth;
  const { poster, store } = auth;
  return locked(store, req.id, deps, "delete", async () => {
    const found = await liveEntry(store, req.id);
    if ("refused" in found) return found.refused;
    const { entry } = found;
    const now = new Date((deps.clock ?? Date.now)()).toISOString();
    await appendAudit(
      store,
      { ts: now, id: entry.id, poster: poster.name, action: "delete", body_hash: null, previous_body_hash: entry.body_hash },
      randomBytes(4).toString("hex"),
    );
    await writeEntry(store, tombstone(entry, now));
    await removeImage(store, entry.id, entry.body_hash);
    await addUsage(store, entry.poster, { drafts: entry.review_state === "draft" ? -1 : 0, image_bytes: -imageBytes(entry) });
    return { status: 200, body: { ok: true, id: entry.id, review_state: "deleted", deleted_at: now }, publicChanged: true };
  });
}

export async function handleList(req: ListRequest, deps: Deps): Promise<Result> {
  if (req.kind !== null && !KINDS.includes(req.kind as Kind)) return fail(400, `kind must be one of ${KINDS.join(", ")}`, { field: "kind" });
  const kind = req.kind as Kind | null;
  if (req.state === null) {
    try {
      const entries = deps.published ? mergeEntries(deps.legacy, await deps.published(), kind) : await loadPublicEntries(deps.legacy, deps.store, kind);
      return { status: 200, body: { version: 1, entries } };
    } catch (err) {
      return unavailable("public list failed", err);
    }
  }

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
