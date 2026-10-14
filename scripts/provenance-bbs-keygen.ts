import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateIssuerKeys, publicKeyDocument } from "../src/lib/provenance/packet";

const controller = process.argv[2] ?? "did:web:bucket.foundation:provenance";
const secretDir = join(process.cwd(), "private", "provenance");
const secretFile = join(secretDir, "bbs-issuer.json");
const publicFile = join(process.cwd(), "public", ".well-known", "bbs-issuer.json");

(async () => {
  if (existsSync(secretFile)) {
    console.error(`${secretFile} exists; move it aside to rotate`);
    process.exit(1);
  }
  const keys = await generateIssuerKeys(controller);
  mkdirSync(secretDir, { recursive: true, mode: 0o700 });
  writeFileSync(secretFile, JSON.stringify(keys, null, 1) + "\n", { mode: 0o600 });
  chmodSync(secretFile, 0o600);
  mkdirSync(join(process.cwd(), "public", ".well-known"), { recursive: true });
  writeFileSync(publicFile, JSON.stringify(publicKeyDocument(keys), null, 1) + "\n");
  console.log(`secret: ${secretFile}`);
  console.log(`public: ${publicFile}`);
  console.log("set PROVENANCE_BBS_ISSUER_KEY in Vercel to the secret file's contents");
})();
