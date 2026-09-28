import { readFileSync } from "node:fs";
import { getWaitlistStore, listSignups } from "../src/lib/waitlist/store";
import { entriesFromCsv, getInviteStore, loadInvites, logId, planWave, POSTAL_PLACEHOLDER, renderInvite, sendWave, suppress, WAVE_SIZE, type EmailProvider } from "../src/lib/waitlist/invites";

const PROVIDERS: Record<string, () => EmailProvider> = {};

interface Args {
  wave: number;
  size: number;
  csv: string | null;
  send: boolean;
  suppress: string | null;
  status: "unsubscribed" | "bounced";
}

const USAGE = `usage: waitlist-invite --wave N [--size N] [--csv file] [--send]
       waitlist-invite --suppress <email> [--status unsubscribed|bounced]`;

function parseArgs(argv: string[]): Args {
  const a: Args = { wave: 0, size: WAVE_SIZE, csv: null, send: false, suppress: null, status: "unsubscribed" };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${flag} needs a value`);
      return v;
    };
    if (flag === "--wave") a.wave = Number(value());
    else if (flag === "--size") a.size = Number(value());
    else if (flag === "--csv") a.csv = value();
    else if (flag === "--send") a.send = true;
    else if (flag === "--suppress") a.suppress = value();
    else if (flag === "--status") {
      const s = value();
      if (s !== "unsubscribed" && s !== "bounced") throw new Error("--status is unsubscribed or bounced");
      a.status = s;
    } else throw new Error(`unknown argument ${flag}`);
  }
  if (!a.suppress && (!Number.isInteger(a.wave) || a.wave < 1)) throw new Error("--wave takes a whole number from 1");
  if (!Number.isInteger(a.size) || a.size < 1 || a.size > WAVE_SIZE) throw new Error(`--size takes 1 to ${WAVE_SIZE}`);
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const invites = getInviteStore();
  if (!invites) throw new Error("no invite store: set BLOB_READ_WRITE_TOKEN, or run outside Vercel for the local .data store");

  if (args.suppress) {
    const id = await suppress(invites, args.suppress, args.status);
    console.log(`marked ${id} ${args.status}`);
    return;
  }

  let entries;
  if (args.csv) entries = entriesFromCsv(readFileSync(args.csv, "utf8"));
  else {
    const store = getWaitlistStore();
    if (!store) throw new Error("no waitlist store: set BLOB_READ_WRITE_TOKEN or pass --csv");
    entries = await listSignups(store);
  }
  const plan = planWave(entries, await loadInvites(invites), args.wave, args.size);

  console.log(`wave ${plan.wave}: ${plan.picked.length} to invite from ${entries.length} on the list`);
  console.log(`skipped: ${Object.entries(plan.skipped).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  for (const c of plan.picked) console.log(`  ${logId(c.key)}  ${c.entry.role ?? "none"}  joined ${c.entry.created_at.slice(0, 10)}${c.retry ? `  retry ${c.retry}` : ""}`);

  const postalAddress = process.env.INVITE_POSTAL_ADDRESS?.trim() ?? "";
  if (!args.send) {
    const sample = renderInvite({ email: "learner@example.org", name: "Ada Lovelace", wanted: null }, plan.wave, postalAddress || POSTAL_PLACEHOLDER, "sample");
    console.log(`\ndry run, nothing written. Sample email:\n\nSubject: ${sample.subject}\n\n${sample.text}`);
    return;
  }

  if (!postalAddress) throw new Error("INVITE_POSTAL_ADDRESS is unset; CAN-SPAM requires a postal address in every invite");
  const name = process.env.INVITE_EMAIL_PROVIDER?.trim() ?? "";
  const make = PROVIDERS[name];
  if (!make) throw new Error(`no email provider is wired${name ? ` for "${name}"` : ""}; the provider choice is open with the founder`);
  const result = await sendWave(plan, invites, make(), { postalAddress });
  console.log(`sent ${result.sent.length}, failed ${result.failed.length}, claimed by another run ${result.lost.length}`);
  if (result.failed.length) console.log(`failed: ${result.failed.join(" ")}`);
}

main().catch((err) => {
  console.error(`waitlist-invite: ${err instanceof Error ? err.message : String(err)}\n${USAGE}`);
  process.exit(1);
});
