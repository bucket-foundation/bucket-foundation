#!/usr/bin/env node
// pull-longtail-verdicts.mjs — fetch reviewer taps for a Bucket grant draft
// previously submitted via submit-to-longtail.mjs.
//
// Output: per-axis tally (yes/no/unsure/skip counts), latest tap timestamp,
// and a "verdict" column that fires when an axis has ≥3 taps with a clear
// majority.
//
// Usage:
//   node scripts/pull-longtail-verdicts.mjs <draft_id>
//   node scripts/pull-longtail-verdicts.mjs --all       # last 10 from log
//   node scripts/pull-longtail-verdicts.mjs --grant sloan-exploratory
//
// Env: same as submit-to-longtail.mjs (LONGTAIL_HMAC_SECRET, LONGTAIL_API_URL).

import { readFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';

const API = process.env.LONGTAIL_API_URL ?? 'https://longtail-reviews.agfarms.dev';
const SECRET = process.env.LONGTAIL_HMAC_SECRET;
const SUB_LOG = 'grants-targets/.longtail-submissions.jsonl';

function fail(m) { console.error(`error: ${m}`); process.exit(1); }

function sign(method, path) {
  if (!SECRET) fail('LONGTAIL_HMAC_SECRET not set');
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = createHmac('sha256', SECRET).update(`${ts}:${method}:${path}`).digest('hex');
  return { ts, sig };
}

async function signedJson(path) {
  const { ts, sig } = sign('GET', path);
  const r = await fetch(`${API}${path}`, {
    headers: {
      authorization: `Bearer ${sig}`,
      'x-longtail-timestamp': ts,
    },
  });
  if (!r.ok) {
    const text = await r.text();
    fail(`GET ${path} → ${r.status} ${text.slice(0, 200)}`);
  }
  return r.json();
}

async function loadSubmissions() {
  try {
    const raw = await readFile(SUB_LOG, 'utf8');
    return raw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

function tallyTaps(taps) {
  const byAxis = new Map();
  for (const t of taps) {
    const cur = byAxis.get(t.axis_id) ?? { yes: 0, no: 0, unsure: 0, skip: 0, latest: '' };
    if (t.label === 'yes') cur.yes += 1;
    else if (t.label === 'no') cur.no += 1;
    else if (t.label === 'unsure') cur.unsure += 1;
    else cur.skip += 1;
    if (!cur.latest || t.ts > cur.latest) cur.latest = t.ts;
    byAxis.set(t.axis_id, cur);
  }
  return byAxis;
}

function verdict(t) {
  const total = t.yes + t.no;
  if (total < 3) return '— (need ≥3 yes/no)';
  if (t.yes >= total * 0.7) return '✓ YES';
  if (t.no >= total * 0.7) return '✗ NO';
  return '? mixed';
}

async function reportOne(draft) {
  console.log(`\n── ${draft.draft_id}  ${draft.title ?? '(no title)'} ──`);
  console.log(`   submitted: ${draft.ts ?? '?'}  grant: ${draft.grant ?? '—'}`);
  // Pull all taps via the brain feed (chisel forwards taps to /api/feed
  // with signal_type=verify_tap and content.atom_id = draft id).
  // Until the pipeline exposes /api/drafts/{id}/taps natively we read the
  // hub-local ring buffer via /api/chisel/health which exposes recent taps.
  // For now: hit the pipeline's expected verdicts path; fall back to
  // health if absent.
  let taps = [];
  try {
    const r = await signedJson(`/api/drafts/${draft.draft_id}/taps`);
    if (Array.isArray(r)) taps = r;
    else if (r?.items) taps = r.items;
  } catch {
    // Fallback path TBD — for v0 we just show "no verdict endpoint yet".
    console.log('   (no /api/drafts/<id>/taps endpoint yet — see TODO in script)');
    return;
  }
  if (taps.length === 0) {
    console.log('   no taps yet. share https://longtail.agfarms.dev/chisel');
    return;
  }
  const byAxis = tallyTaps(taps);
  console.log('   axis                            yes  no   unsure  skip   verdict');
  for (const [axis, t] of byAxis.entries()) {
    console.log(
      `   ${axis.padEnd(30)}  ${String(t.yes).padStart(3)}  ${String(t.no).padStart(3)}  ` +
      `${String(t.unsure).padStart(3)}     ${String(t.skip).padStart(3)}    ${verdict(t)}`,
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    fail('usage: pull-longtail-verdicts.mjs <draft_id> | --all | --grant <slug>');
  }
  const subs = await loadSubmissions();
  let drafts = [];
  if (args[0] === '--all') {
    drafts = subs.slice(-10);
  } else if (args[0] === '--grant') {
    drafts = subs.filter((s) => s.grant === args[1]);
    if (drafts.length === 0) fail(`no submissions for grant '${args[1]}'`);
  } else {
    drafts = [{ draft_id: args[0], title: '(direct id)', ts: '?', grant: '—' }];
  }
  for (const d of drafts) await reportOne(d);
}

main().catch((e) => fail(e.stack ?? e.message ?? String(e)));
