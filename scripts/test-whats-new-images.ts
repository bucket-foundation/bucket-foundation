import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp, { type Sharp } from "sharp";
import { fileMarks } from "../src/lib/download/marks";
import { tokenHash } from "../src/lib/whats-new/auth";
import { handlePost, mergeEntries, type Deps, type Result } from "../src/lib/whats-new/handler";
import { ENCODE_STEPS, handleImage, sniff, toWebp, WEBP_MAX_BYTES, webpName } from "../src/lib/whats-new/image";
import { fileDocs, readEntry, readUsage, writeEntry, type DocStore, type StoredEntry } from "../src/lib/whats-new/store";

const FIXTURES = path.join(__dirname, "fixtures", "whats-new-api");
const token = randomBytes(24).toString("hex");
const MARKER = "junk-marker-7f3a";

function production(id: string): Record<string, unknown> {
  return { ...(JSON.parse(readFileSync(path.join(FIXTURES, "gap-score-backtest-2026-10.json"), "utf8")) as Record<string, unknown>), id };
}

interface Bench {
  deps: Deps;
  store: DocStore;
}

async function bench(t: { after(fn: () => Promise<void>): void }): Promise<Bench> {
  const root = await mkdtemp(path.join(tmpdir(), "whats-new-images-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = fileDocs(root, "whats-new-test/");
  const deps: Deps = {
    env: { WHATS_NEW_TOKENS: `ada:${tokenHash(token)}:post` },
    store,
    marks: fileMarks(path.join(root, "marks")),
    legacy: [],
    clock: () => Date.parse("2026-10-01T12:00:00.000Z"),
    limits: { ratePerMinute: 1000, draftsPerPoster: 50, draftsTotal: 100, imageBytesPerPoster: 10_000_000 },
    revocationCache: new Map(),
  };
  return { deps, store };
}

function post(deps: Deps, id: string, bytes: Buffer, content_type: string, filename = "plot.png"): Promise<Result> {
  const raw = Buffer.from(JSON.stringify({ ...production(id), image: { filename, content_type, base64: bytes.toString("base64") } }), "utf8");
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(raw));
      controller.close();
    },
  });
  return handlePost({ authorization: `Bearer ${token}`, contentType: "application/json", contentLength: String(raw.length), body: stream }, deps);
}

async function storedWebp(store: DocStore, id: string): Promise<Buffer> {
  const doc = JSON.parse(String(await store.read(`entries/${id}.image.json`))) as { filename: string; content_type: string; base64: string };
  assert.equal(doc.content_type, "image/webp");
  return Buffer.from(doc.base64, "base64");
}

async function approve(store: DocStore, id: string): Promise<void> {
  const entry = (await readEntry(store, id)) as StoredEntry;
  await writeEntry(store, { ...entry, review_state: "published" });
}

function solid(width: number, height: number, rgb: [number, number, number]): Sharp {
  return sharp({ create: { width, height, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } } });
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, payload: Buffer): Buffer {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(payload.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), payload]);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(body));
  return Buffer.concat([head, body, tail]);
}

const IHDR_END = 33;
const IEND = 12;

test("a PNG is stored as WebP, and the image route serves it only once the entry is published", async (t) => {
  const { deps, store } = await bench(t);
  const png = await solid(64, 48, [200, 30, 30]).png().toBuffer();
  const res = await post(deps, "prod-a", png, "image/png", "gap-score.png");
  assert.equal(res.status, 201);
  const webp = await storedWebp(store, "prod-a");
  assert.equal(sniff(webp), "image/webp");
  const entry = await readEntry(store, "prod-a");
  assert.deepEqual(entry?.image, { filename: "gap-score.webp", content_type: "image/webp", bytes: webp.length, width: 64, height: 48 });
  assert.equal((await readUsage(store, "ada")).image_bytes, webp.length);

  assert.deepEqual(await handleImage("prod-a", store), { status: 404, bytes: null });
  assert.deepEqual(await handleImage("prod-missing", store), { status: 404, bytes: null });
  assert.deepEqual(await handleImage("../prod-a", store), { status: 404, bytes: null });
  assert.deepEqual(await handleImage("prod-a", null), { status: 503, bytes: null });
  await approve(store, "prod-a");
  const served = await handleImage("prod-a", store);
  assert.equal(served.status, 200);
  assert.ok(served.bytes?.equals(webp));
  const [view] = mergeEntries([], [(await readEntry(store, "prod-a")) as StoredEntry]);
  assert.equal(view.image, "/api/whats-new/image/prod-a");

  await store.write("entries/prod-a.image.json", JSON.stringify({ filename: "a.png", content_type: "image/png", base64: png.toString("base64") }));
  assert.deepEqual(await handleImage("prod-a", store), { status: 404, bytes: null });
  await store.write("entries/prod-a.image.json", JSON.stringify({ filename: "a.webp", content_type: "image/webp", base64: png.toString("base64") }));
  assert.deepEqual(await handleImage("prod-a", store), { status: 404, bytes: null });
  await store.remove("entries/prod-a.image.json");
  assert.deepEqual(await handleImage("prod-a", store), { status: 404, bytes: null });
  const down: DocStore = { ...store, read: async () => Promise.reject(new Error("down")) };
  assert.deepEqual(await handleImage("prod-a", down), { status: 503, bytes: null });
});

test("the image route is a nodejs route with an explicit maxDuration, image/webp and nosniff", () => {
  const src = path.join(__dirname, "..", "src", "app", "api", "whats-new");
  const image = readFileSync(path.join(src, "image", "[id]", "route.ts"), "utf8");
  for (const want of ['export const runtime = "nodejs";', "export const maxDuration = 10;", '"content-type": "image/webp"', '"x-content-type-options": "nosniff"']) assert.ok(image.includes(want), want);
  const entries = readFileSync(path.join(src, "entries", "route.ts"), "utf8");
  for (const want of ['export const runtime = "nodejs";', "export const maxDuration = 60;"]) assert.ok(entries.includes(want), want);
});

test("metadata and a junk PNG chunk do not survive the re-encode", async (t) => {
  const { deps, store } = await bench(t);
  const jpeg = await solid(80, 60, [10, 120, 200]).withExif({ IFD0: { Copyright: MARKER, Artist: MARKER } }).jpeg().toBuffer();
  assert.ok(jpeg.includes(MARKER));
  assert.equal((await post(deps, "prod-exif", jpeg, "image/jpeg", "photo.jpg")).status, 201);
  const fromJpeg = await storedWebp(store, "prod-exif");
  const meta = await sharp(fromJpeg).metadata();
  assert.deepEqual([meta.format, meta.exif, meta.icc, meta.xmp, fromJpeg.includes(MARKER)], ["webp", undefined, undefined, undefined, false]);

  const png = await solid(40, 40, [0, 200, 0]).png().toBuffer();
  const padded = Buffer.concat([png.subarray(0, IHDR_END), pngChunk("juNk", Buffer.from(MARKER.repeat(50))), png.subarray(IHDR_END)]);
  assert.ok(padded.includes(MARKER));
  assert.equal((await post(deps, "prod-chunk", padded, "image/png")).status, 201);
  const fromPng = await storedWebp(store, "prod-chunk");
  assert.equal(fromPng.includes(MARKER), false);
  assert.deepEqual((await sharp(fromPng).metadata()).width, 40);
});

test("a PNG with junk between a valid header and trailer is refused and nothing is stored", async (t) => {
  const { deps, store } = await bench(t);
  const png = await solid(40, 40, [0, 200, 0]).png().toBuffer();
  const junk = Buffer.concat([png.subarray(0, IHDR_END), randomBytes(4096), png.subarray(png.length - IEND)]);
  const res = await post(deps, "prod-junk", junk, "image/png");
  assert.deepEqual([res.status, res.body?.field], [400, "image.base64"]);
  assert.equal(await readEntry(store, "prod-junk"), null);
  assert.deepEqual(await store.list("entries"), []);
  assert.deepEqual(await readUsage(store, "ada"), { drafts: 0, image_bytes: 0 });
});

test("an animated WebP is stored as its first frame only", async (t) => {
  const { deps, store } = await bench(t);
  const frames = Buffer.concat([Buffer.alloc(32 * 24 * 3, 0).map((_, i) => (i % 3 === 0 ? 255 : 0)), Buffer.alloc(32 * 24 * 3, 0).map((_, i) => (i % 3 === 2 ? 255 : 0))]);
  const animated = await sharp(frames, { raw: { width: 32, height: 48, channels: 3, pageHeight: 24 } }).webp({ loop: 0, delay: [100, 100], lossless: true }).toBuffer();
  assert.equal((await sharp(animated, { animated: true }).metadata()).pages, 2);
  assert.equal((await post(deps, "prod-anim", animated, "image/webp", "loop.webp")).status, 201);
  const still = await storedWebp(store, "prod-anim");
  const meta = await sharp(still, { animated: true }).metadata();
  assert.deepEqual([meta.pages ?? 1, meta.width, meta.height], [1, 32, 24]);
  const pixel = await sharp(still).raw().toBuffer();
  assert.ok(pixel[0] > 200 && pixel[2] < 60, "the stored frame is the first, red one");
  assert.deepEqual((await readEntry(store, "prod-anim"))?.image, { filename: "loop.webp", content_type: "image/webp", bytes: still.length, width: 32, height: 24 });
});

test("a decompression bomb is refused by the pixel limit before any pixel is stored", async (t) => {
  const { deps, store } = await bench(t);
  const bomb = await sharp({ create: { width: 5000, height: 5000, channels: 3, background: { r: 0, g: 0, b: 0 } }, limitInputPixels: false }).png({ compressionLevel: 9 }).toBuffer();
  assert.ok(bomb.length < 200_000, `the bomb is ${bomb.length} bytes for 25 megapixels`);
  assert.deepEqual(await toWebp(bomb, "image/png"), { ok: false, reason: "must decode as a whole PNG, JPEG or WebP of 16 megapixels or fewer" });
  const res = await post(deps, "prod-bomb", bomb, "image/png");
  assert.deepEqual([res.status, res.body?.field], [400, "image.base64"]);
  let encodes = 0;
  const counted = await post({ ...deps, encodeImage: async (b, d) => (encodes++, toWebp(b, d)) }, "prod-bomb", bomb, "image/png");
  assert.deepEqual([counted.status, encodes], [400, 0]);
  assert.equal(await readEntry(store, "prod-bomb"), null);
  const wide = await sharp({ create: { width: 4000, height: 4000, channels: 3, background: { r: 9, g: 9, b: 9 } } }).png().toBuffer();
  const fits = await toWebp(wide, "image/png");
  assert.ok(fits.ok && fits.width === 2400 && fits.height === 2400);
});

test("a truncated PNG, JPEG or WebP is refused even with a valid trailer", async (t) => {
  const { deps, store } = await bench(t);
  const noise = { raw: { width: 300, height: 300, channels: 3 as const } };
  const pixels = randomBytes(300 * 300 * 3);
  const png = await sharp(pixels, noise).png().toBuffer();
  const jpeg = await sharp(pixels, noise).jpeg().toBuffer();
  const webp = await sharp(pixels, noise).webp().toBuffer();
  const cutPng = Buffer.concat([png.subarray(0, Math.floor(png.length / 2)), png.subarray(png.length - IEND)]);
  const cutJpeg = Buffer.concat([jpeg.subarray(0, Math.floor(jpeg.length / 2)), Buffer.from([0xff, 0xd9])]);
  const cutWebp = Buffer.from(webp.subarray(0, Math.floor(webp.length / 2)));
  cutWebp.writeUInt32LE(cutWebp.length - 8, 4);
  const cases: [string, Buffer, string][] = [
    ["prod-cut-png", cutPng, "image/png"],
    ["prod-cut-jpeg", cutJpeg, "image/jpeg"],
    ["prod-cut-webp", cutWebp, "image/webp"],
    ["prod-short-png", png.subarray(0, 200), "image/png"],
  ];
  for (const [id, bytes, type] of cases) {
    assert.equal((await toWebp(bytes, type)).ok, false, id);
    const res = await post(deps, id, bytes, type);
    assert.deepEqual([id, res.status, res.body?.field], [id, 400, "image.base64"]);
    assert.equal(await readEntry(store, id), null);
  }
  for (const [bytes, type] of [[png, "image/png"], [jpeg, "image/jpeg"], [webp, "image/webp"]] as const) assert.equal((await toWebp(bytes, type)).ok, true, type);
});

test("SVG is refused by its magic bytes whatever type is declared", async (t) => {
  const { deps } = await bench(t);
  const svgs = ["<svg xmlns='http://www.w3.org/2000/svg'/>", "﻿  <?xml version='1.0'?><svg/>", "<!DOCTYPE svg><svg/>", "\n\n<!-- x --><svg onload='x'/>"];
  for (const text of svgs) {
    const bytes = Buffer.from(text, "utf8");
    assert.equal(sniff(bytes), "svg", text);
    for (const type of ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]) {
      assert.deepEqual(await toWebp(bytes, type), { ok: false, reason: "must not be an SVG" });
      assert.equal((await post(deps, "prod-svg", bytes, type)).status, 400);
    }
  }
  const png = await solid(8, 8, [1, 2, 3]).png().toBuffer();
  assert.deepEqual(await toWebp(png, "image/jpeg"), { ok: false, reason: "must be a PNG, JPEG or WebP that matches image.content_type" });
  assert.deepEqual(await toWebp(Buffer.from("GIF89a"), "image/png"), { ok: false, reason: "must be a PNG, JPEG or WebP that matches image.content_type" });
  assert.equal(webpName("plot.final.png"), "plot.final.webp");
  assert.equal(webpName("plot"), "plot.webp");
});

test("the quality steps down until the WebP fits 400 KB, and an image that cannot fit is refused", async () => {
  const side = 1500;
  const noisy = await sharp(randomBytes(side * side * 3), { raw: { width: side, height: side, channels: 3 } }).jpeg({ quality: 60 }).toBuffer();
  const first = await sharp(noisy).webp({ quality: ENCODE_STEPS[0].quality, effort: 4 }).toBuffer();
  assert.ok(first.length > WEBP_MAX_BYTES, `the first step gives ${first.length} bytes`);
  const out = await toWebp(noisy, "image/jpeg");
  assert.ok(out.ok);
  assert.ok(out.webp.length <= WEBP_MAX_BYTES, `${out.webp.length} bytes`);
  assert.ok(out.quality < ENCODE_STEPS[0].quality || out.width < side);
  assert.deepEqual(await toWebp(noisy, "image/jpeg", ENCODE_STEPS, 2000), { ok: false, reason: "must fit 2000 bytes as WebP" });
  const calm = await toWebp(await solid(600, 400, [250, 250, 250]).png().toBuffer(), "image/png");
  assert.ok(calm.ok && calm.quality === ENCODE_STEPS[0].quality && calm.width === 600 && calm.height === 400);
});
