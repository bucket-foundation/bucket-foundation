#!/usr/bin/env node

import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { dirname, basename, resolve } from 'node:path';
import { createHmac } from 'node:crypto';

const API = process.env.LONGTAIL_API_URL ?? 'https://longtail-reviews.agfarms.dev';
const SECRET = process.env.LONGTAIL_HMAC_SECRET;
const AUTHOR = process.env.GIT_AUTHOR ?? 'gianyrox@gmail.com';
const HUB_URL = process.env.LONGTAIL_HUB_URL ?? 'https://longtail.agfarms.dev';

const SUB_LOG = 'grants-targets/.longtail-submissions.jsonl';

const VALID_KINDS = new Set([
  'book', 'article', 'template', 'video', 'carousel', '3d_asset', 'audio',
]);

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

function sign(method, path) {
  if (!SECRET) fail('LONGTAIL_HMAC_SECRET not set in env');
  const ts = Math.floor(Date.now() / 1000).toString();
  const payload = `${ts}:${method.toUpperCase()}:${path}`;
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
  return { ts, sig };
}

async function signedFetch(method, path, body) {
  const { ts, sig } = sign(method, path);
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
  try { json = text ? JSON.parse(text) : null; } catch {  }
  if (!r.ok) {
    fail(`${method} ${path} → ${r.status} ${text.slice(0, 300)}`);
  }
  return json;
}

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
