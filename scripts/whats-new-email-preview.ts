import { writeFileSync } from "node:fs";
import path from "node:path";
import whatsNew from "../data/whats-new.json";
import { buildDigest, digestDay, renderDigest } from "../src/lib/whats-new-email/digest";
import { unsubscribeUrl } from "../src/lib/whats-new-email/unsubscribe";

const arg = process.argv.find((a) => a.startsWith("--day="))?.slice(6);
if (arg && !/^\d{4}-\d{2}-\d{2}$/.test(arg)) throw new Error("--day takes YYYY-MM-DD");
const day = arg ?? digestDay(Date.now());
const digest = buildDigest(whatsNew.entries, day);
const out = path.join(process.cwd(), ".data", `whats-new-email-${day}.html`);
const unsub = unsubscribeUrl("preview@example.org", "preview-secret-preview-secret-preview", "http://localhost:3000");
const email = renderDigest(digest, unsub, process.env.INVITE_POSTAL_ADDRESS?.trim() || "[postal address: set INVITE_POSTAL_ADDRESS]");
writeFileSync(out, email.html);
writeFileSync(out.replace(/\.html$/, ".txt"), email.text);
console.log(`${digest.count} entries for ${day}${digest.count === 0 ? " (the cron would skip this day)" : ""}`);
console.log(`subject: ${email.subject}`);
console.log(out);
