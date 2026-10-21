#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";

const BASE = process.env.WHATS_NEW_BASE ?? "https://www.bucket.foundation";
const TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

function token(kind) {
  const key = { post: "WHATS_NEW_POST_TOKEN", admin: "WHATS_NEW_ADMIN_TOKEN", engine: "WHATS_NEW_ENGINE_TOKEN" }[kind];
  if (process.env[key]) return process.env[key];
  const file = join(homedir(), ".config/bucket/whats-new.env");
  if (existsSync(file)) {
    const line = readFileSync(file, "utf8").split("\n").find((l) => l.startsWith(`${key}=`));
    if (line) return line.slice(key.length + 1).trim();
  }
  throw new Error(`${key} is unset and ${file} has no value for it`);
}

async function call(method, path, kind, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { authorization: `Bearer ${token(kind)}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  console.log(res.status, text);
  if (!res.ok) process.exit(1);
}

function entry(file, imagePath) {
  const body = JSON.parse(readFileSync(file, "utf8"));
  body.date ??= new Date().toISOString().slice(0, 10);
  body.source ??= "own";
  if (imagePath) {
    const content_type = TYPES[extname(imagePath).toLowerCase()];
    if (!content_type) throw new Error("image must be .png, .jpg or .webp");
    body.image = { filename: basename(imagePath), content_type, base64: readFileSync(imagePath).toString("base64") };
  }
  return body;
}

const [cmd, arg, extra] = process.argv.slice(2);
const usage = "usage: whats-new-post.mjs draft <entry.json> [image] | engine <entry.json> | drafts | publish <id> | retract <id>";
if (cmd === "draft" && arg) await call("POST", "/api/whats-new/entries", "post", entry(arg, extra));
else if (cmd === "engine" && arg) await call("POST", "/api/whats-new/entries", "engine", entry(arg));
else if (cmd === "drafts") await call("GET", "/api/whats-new/entries?state=draft", "admin");
else if (cmd === "publish" && arg) await call("POST", `/api/whats-new/entries/${arg}/publish`, "admin");
else if (cmd === "retract" && arg) await call("POST", `/api/whats-new/entries/${arg}/retract`, "post");
else {
  console.error(usage);
  process.exit(2);
}
