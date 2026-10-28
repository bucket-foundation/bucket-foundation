import { readFileSync } from "node:fs";
import { parseCodes } from "../src/lib/founding";

async function main() {
  const file = process.argv[2];
  const raw = file ? readFileSync(file, "utf8") : process.env.FOUNDING_CODES || "";
  const codes = parseCodes(raw);
  const url = process.env.POLINGUAL_DB_URL?.trim();
  const key = process.env.POLINGUAL_DB_SERVICE_KEY?.trim();
  if (!codes.length) throw new Error("No codes: pass a file path or set FOUNDING_CODES.");
  if (!url || !key) throw new Error("Set POLINGUAL_DB_URL and POLINGUAL_DB_SERVICE_KEY.");
  const r = await fetch(`${url}/rest/v1/founding_codes?on_conflict=code`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Content-Profile": "polingual", Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(codes.map((code) => ({ code }))),
  });
  if (!r.ok) throw new Error(`Load failed: ${r.status} ${await r.text()}`);
  console.log(`Loaded ${codes.length} codes.`);
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
