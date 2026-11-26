import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { carouselRow, parseCarousel, slidePath, type CarouselFiles } from "../src/lib/ops/carousel";
import { socialBucket } from "../src/lib/ops/send";

const MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_DIR = join(homedir(), "agfarms/polingual-social/carousels/output");

async function main(): Promise<void> {
  const dir = process.argv[2] || DEFAULT_DIR;
  const env = process.env;
  const missing = ["POLINGUAL_DB_URL", "POLINGUAL_DB_SERVICE_KEY"].filter((k) => !env[k]?.trim());
  if (missing.length) throw new Error(`Set ${missing.join(", ")}`);
  const base = env.POLINGUAL_DB_URL!.trim().replace(/\/$/, "");
  const key = env.POLINGUAL_DB_SERVICE_KEY!.trim();
  const bucket = socialBucket(env);
  const auth = { apikey: key, Authorization: `Bearer ${key}` };
  const db = { ...auth, "Accept-Profile": "bucket", "Content-Profile": "bucket", "Content-Type": "application/json" };

  const spec = { public: true, file_size_limit: MAX_BYTES, allowed_mime_types: ["image/jpeg", "image/png"] };
  const json = { ...auth, "Content-Type": "application/json" };
  const made = await fetch(`${base}/storage/v1/bucket`, { method: "POST", headers: json, body: JSON.stringify({ id: bucket, name: bucket, ...spec }) });
  if (!made.ok) {
    const fixed = await fetch(`${base}/storage/v1/bucket/${bucket}`, { method: "PUT", headers: json, body: JSON.stringify(spec) });
    if (!fixed.ok) throw new Error(`bucket config ${made.status}/${fixed.status} ${await fixed.text()}`);
  }

  const folders = (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory() && /^\d{3}-/.test(d.name)).map((d) => d.name).sort();
  for (const name of folders) {
    const folder = join(dir, name);
    const files = (await readdir(folder)).filter((f) => /^slide-\d+\.png$/.test(f));
    const read = async (f: string) => (existsSync(join(folder, f)) ? readFile(join(folder, f), "utf8") : "");
    const input: CarouselFiles = { meta: await read("meta.json"), caption: await read("caption.txt"), hashtags: await read("hashtags.txt"), slides: files };
    const c = parseCarousel(name, input);
    const slides: string[] = [];
    for (const [i, file] of c.slideFiles.entries()) {
      const jpeg = await sharp(join(folder, file)).flatten({ background: "white" }).jpeg({ quality: 88 }).toBuffer();
      if (jpeg.length > MAX_BYTES) throw new Error(`${name}/${file} is ${jpeg.length} bytes, over ${MAX_BYTES}`);
      const path = slidePath(c.slug, c.slideNumbers[i], createHash("sha256").update(jpeg).digest("hex"));
      slides.push(path);
      const up = await fetch(`${base}/storage/v1/object/${bucket}/${path}`, { method: "POST", headers: { ...auth, "Content-Type": "image/jpeg", "x-upsert": "true", "cache-control": "max-age=31536000" }, body: new Uint8Array(jpeg) });
      if (!up.ok) throw new Error(`upload ${path} ${up.status} ${await up.text()}`);
    }
    const row = carouselRow(c, slides);
    const q = `slug=eq.${encodeURIComponent(row.slug)}&platform=eq.${encodeURIComponent(row.platform)}`;
    const existing = await fetch(`${base}/rest/v1/polingual_social_posts?${q}&select=id`, { headers: db });
    if (!existing.ok) throw new Error(`read ${row.slug} ${existing.status} ${await existing.text()}`);
    const found = (await existing.json()) as { id: string }[];
    const write = found.length
      ? await fetch(`${base}/rest/v1/polingual_social_posts?${q}`, { method: "PATCH", headers: db, body: JSON.stringify({ slides: row.slides, hashtags: row.hashtags, scheduled_for: row.scheduled_for, preview_url: row.preview_url }) })
      : await fetch(`${base}/rest/v1/polingual_social_posts`, { method: "POST", headers: db, body: JSON.stringify(row) });
    if (!write.ok) throw new Error(`${found.length ? "update" : "insert"} ${row.slug} ${write.status} ${await write.text()}`);
    console.log(`${found.length ? "updated" : "inserted"} ${row.slug} ${row.platform} ${row.slides.length} slides`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
