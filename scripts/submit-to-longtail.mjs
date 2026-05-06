#!/usr/bin/env node
// submit-to-longtail.mjs — push a Bucket Foundation grant draft (or any
// markdown artifact) into the Longtail content-review queue at
// https://longtail.agfarms.dev/chisel.
//
// Why this exists:
//   Bucket is working on grant applications (NSF SBIR, Sloan exploratory,
//   Gitcoin GG, EF ESP, HCB packet, etc.). These need a fast yes/no/unsure
//   review pass on dimensions like "is the mission clear", "is the budget
//   specific", "did I get confused while reading". The Longtail chisel
//   queue is exactly that workflow — Cost-Weighted Thompson Sampling over
//   (atom × axis) pairs, deployed at longtail.agfarms.dev. Reusing it
//   instead of building a Bucket-specific reviewer UI.
//
// What it does:
//   1. Reads a markdown file
//   2. Signs an HMAC request
//   3. POST /api/drafts on longtail-pipeline (creates the draft shell)
//   4. POST /api/drafts/{id}/revisions (uploads the body)
//   5. Logs the (draft_id, file, ts) to grants-targets/.longtail-submissions.jsonl
//   6. Prints a chisel review URL
//
// Usage:
//   node scripts/submit-to-longtail.mjs grants-targets/drafts/sloan-exploratory-loi.md \
//        --title "Sloan Foundation — exploratory LoI v3" \
//        --grant sloan-exploratory \
//        [--kind article]                 # default 'article'; longtail
//                                          # only accepts a fixed set, see VALID_KINDS
//        [--dry-run]                       # print payload, do not POST
//
// Env required (put in ~/.env or grants-targets/.env, NOT committed):
//   LONGTAIL_HMAC_SECRET   = HMAC secret. CRITICAL: use the value from
//                            prod-hetzner-1 ~/longtail-mono/longtail-hub/.env
//                            (the *hub* secret), NOT the one in
//                            ~/longtail/longtail-pipeline/.env. Those two
//                            files have drifted and the running pipeline
//                            verifies against the hub's secret. See
//                            BEAD_BACKLOG.md or bead bkt-* for the cleanup.
//   LONGTAIL_API_URL       = https://longtail-reviews.agfarms.dev (default)
//   GIT_AUTHOR             = email to record as the revision author

import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { dirname, basename, resolve } from 'node:path';
import { createHmac } from 'node:crypto';

const API = process.env.LONGTAIL_API_URL ?? 'https://longtail-reviews.agfarms.dev';
const SECRET = process.env.LONGTAIL_HMAC_SECRET;
const AUTHOR = process.env.GIT_AUTHOR ?? 'gianyrox@gmail.com';
const HUB_URL = process.env.LONGTAIL_HUB_URL ?? 'https://longtail.agfarms.dev';

const SUB_LOG = 'grants-targets/.longtail-submissions.jsonl';

// Longtail's valid `kind` enum (from longtail-pipeline/src/api/content.ts).
// Grant applications get filed under 'article' — closest fit.
const VALID_KINDS = new Set([
  'book', 'article', 'template', 'video', 'carousel', '3d_asset', 'audio',
]);

// ── arg parsing ───────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a.startsWith('--')) { args[a.slice(2)] = argv[++i]; }
    else args.positional.push(a);
  }
  return args;
}

function fail(msg) { console.error(`error: ${msg}`); process.exit(1); }

// ── HMAC signing (matches longtail-pipeline/src/api/middleware/hmac-auth.ts) ──

function sign(method, path) {
  if (!SECRET) fail('LONGTAIL_HMAC_SECRET not set in env');
  const ts = Math.floor(Date.now() / 1000).toString();
  const payload = `${ts}:${method.toUpperCase()}:${path}`;
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
  return { ts, sig };
}

async function signedFetch(method, path, body) {
  const { ts, sig } = sign(method, path);
  // longtail-pipeline middleware expects:
  //   Authorization: Bearer <hex-sha256>
  //   X-Longtail-Timestamp: <unix-seconds>
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${sig}`,
      'x-longtail-timestamp': ts,
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep text */ }
  if (!r.ok) {
    fail(`${method} ${path} → ${r.status} ${text.slice(0, 300)}`);
  }
  return json;
}

// ── main ──────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args.positional[0];
  if (!file) fail('usage: submit-to-longtail.mjs <file.md> --title "..." --grant <slug> [--kind <kind>] [--dry-run]');
  const title = args.title;
  if (!title) fail('--title required');
  const grant = args.grant ?? null;
  const kind = args.kind ?? 'article';
  if (!VALID_KINDS.has(kind)) fail(`invalid kind '${kind}'; pick from: ${[...VALID_KINDS].join(', ')}`);

  const absPath = resolve(file);
  const body = await readFile(absPath, 'utf8');
  if (!body.trim()) fail(`${file} is empty`);

  const draftPayload = {
    kind,
    title,
    source: 'bucket-foundation',
    metadata: {
      venture: 'bucket-foundation',
      grant: grant,
      source_file: basename(absPath),
      submitted_at: new Date().toISOString(),
      submitted_by: AUTHOR,
    },
    created_by: AUTHOR,
  };

  if (args.dryRun) {
    console.log('DRY RUN — would POST /api/drafts with:');
    console.log(JSON.stringify(draftPayload, null, 2));
    console.log(`then POST /api/drafts/<id>/revisions with body length ${body.length}`);
    return;
  }

  console.log(`→ creating draft "${title}" (kind=${kind}, ${body.length} chars)`);
  const draft = await signedFetch('POST', '/api/drafts', draftPayload);
  if (!draft?.id) fail(`unexpected draft response: ${JSON.stringify(draft).slice(0, 200)}`);
  console.log(`  draft id: ${draft.id}`);

  console.log(`→ appending revision (rev 1)`);
  const rev = await signedFetch('POST', `/api/drafts/${draft.id}/revisions`, {
    body,
    author: AUTHOR,
  });
  console.log(`  revision: rev=${rev?.rev ?? '?'}  bytes=${body.length}`);

  // Log submission for idempotency tracking + later verdict pulls.
  await mkdir(dirname(SUB_LOG), { recursive: true });
  await appendFile(SUB_LOG, JSON.stringify({
    ts: new Date().toISOString(),
    file: basename(absPath),
    grant,
    title,
    draft_id: draft.id,
    revision_id: rev?.id ?? null,
    bytes: body.length,
  }) + '\n', 'utf8');

  console.log('');
  console.log('shipped. review at:');
  console.log(`  ${HUB_URL}/chisel`);
  console.log('');
  console.log('pull verdicts later with:');
  console.log(`  node scripts/pull-longtail-verdicts.mjs ${draft.id}`);
}

main().catch((e) => fail(e.stack ?? e.message ?? String(e)));
