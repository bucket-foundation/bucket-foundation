/* Sync the Bucket Academy app (source of truth: learning/app) into public/academy-app
 * so the Next.js site serves it at /academy-app and the /academy route can frame it.
 * Runs automatically via the predev/prebuild npm hooks, and can be run by hand.
 * Excludes dev-only files (serve.sh, validate.sh, README, vercel.json, node_modules). */
import { cpSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "learning", "app");
const dest = join(root, "public", "academy-app");
const EXCLUDE = new Set([
  "serve.sh", "validate.sh", "README.md", "vercel.json", "node_modules", ".vercel",
]);

if (!existsSync(src)) {
  console.error("[sync-academy] source not found:", src);
  process.exit(0); // don't break the build if the app folder isn't present
}
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, {
  recursive: true,
  filter: (s) => !EXCLUDE.has(s.split("/").pop()),
});
console.log("[sync-academy] copied learning/app → public/academy-app");
