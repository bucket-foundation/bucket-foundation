import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.argv[2] ?? ".next/static");
const PRIVATE_KEY_NAME = /NEXT_PUBLIC_[A-Z0-9_]*PRIVATE_KEY/;
const HEX_KEY = /0x[0-9a-fA-F]{64}(?![0-9a-fA-F])/;
const JWT = /eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;

function files(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? files(full) : [full];
  });
}

function jwtRole(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export function scan(root) {
  const hits = [];
  for (const file of files(root)) {
    if (!/\.(js|mjs|cjs|json|html|txt|map)$/.test(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(process.cwd(), file);
    if (PRIVATE_KEY_NAME.test(text)) hits.push({ file: rel, rule: "public env name for a private key" });
    if (HEX_KEY.test(text)) hits.push({ file: rel, rule: "0x-prefixed 64-hex literal" });
    for (const token of text.match(JWT) ?? []) {
      if (jwtRole(token) === "service_role") hits.push({ file: rel, rule: "service_role JWT" });
    }
  }
  return hits;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const all = files(ROOT);
  if (all.length === 0) {
    console.error(`no files under ${ROOT}; run next build first`);
    process.exit(1);
  }
  const hits = scan(ROOT);
  for (const h of hits) console.error(`${h.rule}: ${h.file}`);
  console.log(`scanned ${all.length} files under ${path.relative(process.cwd(), ROOT) || ROOT}, ${hits.length} finding(s)`);
  process.exit(hits.length ? 1 : 0);
}
