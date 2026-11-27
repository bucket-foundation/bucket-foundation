import { NextResponse } from "next/server";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const KIT = path.join(ROOT, "brand/bucket/kit.json");

type Kit = { source: string; logo: string; fonts: Record<string, string>; shape: Record<string, string>; light: Record<string, string>; dark: Record<string, string> };

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "local only" }, { status: 404 });
  const { kit, logoSrc } = (await req.json()) as { kit: Kit; logoSrc?: string };
  if (!kit?.light?.bg || !kit?.fonts?.href) return NextResponse.json({ error: "kit needs light.bg and fonts.href" }, { status: 400 });
  if (logoSrc && logoSrc !== kit.logo) {
    const from = path.join(ROOT, "public", path.normalize(logoSrc).replace(/^(\.\.[/\\])+/, ""));
    if (!from.startsWith(path.join(ROOT, "public")) || !from.endsWith(".svg") || !existsSync(from)) return NextResponse.json({ error: "logo must be an svg under public" }, { status: 400 });
    copyFileSync(from, path.join(ROOT, "public/brand/logo.svg"));
    execFileSync("python3", ["scripts/brand/sync-logo.py"], { cwd: ROOT });
  }
  writeFileSync(KIT, JSON.stringify({ ...kit, logo: "/brand/logo.svg" }, null, 2) + "\n");
  execFileSync("node", ["scripts/brand/build-tokens.mjs"], { cwd: ROOT });
  return NextResponse.json({ ok: true });
}
