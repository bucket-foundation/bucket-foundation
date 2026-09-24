import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { toCsv, type WaitlistEntry, type WaitlistRole } from "../src/lib/waitlist/core";
import { emailKey } from "../src/lib/waitlist/store";
import {
  entriesFromCsv,
  fileInviteStore,
  inviteLink,
  loadInvites,
  logId,
  planWave,
  renderInvite,
  scrubEmails,
  sendWave,
  suppress,
  WAVE_SIZE,
  type EmailProvider,
  type InviteRecord,
  type InviteStore,
  type OutboundEmail,
} from "../src/lib/waitlist/invites";

function entry(n: number, role: WaitlistRole | null = "student", extra: Partial<WaitlistEntry> = {}): WaitlistEntry {
  const day = String(1 + (n % 28)).padStart(2, "0");
  const stamp = `2026-${String(1 + Math.floor(n / 28)).padStart(2, "0")}-${day}T00:00:00.000Z`;
  return { email: `user${n}@example.org`, name: `User ${n}`, role, wanted: null, created_at: stamp, updated_at: stamp, signups: 1, ...extra };
}

function memoryStore(): InviteStore & { rows: Map<string, InviteRecord> } {
  const rows = new Map<string, InviteRecord>();
  return {
    kind: "memory",
    rows,
    read: async (k) => rows.get(k) ?? null,
    create: async (k, r) => {
      if (rows.has(k)) return false;
      rows.set(k, r);
      return true;
    },
    write: async (k, r) => {
      rows.set(k, r);
    },
    keys: async () => Array.from(rows.keys()),
  };
}

function fakeProvider(fail: (e: OutboundEmail) => boolean = () => false): EmailProvider & { outbox: OutboundEmail[] } {
  const outbox: OutboundEmail[] = [];
  return {
    name: "fake",
    outbox,
    async send(e) {
      if (fail(e)) throw new Error(`mailbox full for ${e.to}`);
      outbox.push(e);
      return { id: `m-${outbox.length}` };
    },
  };
}

test("a wave takes the oldest signups first and stops at fifty", () => {
  const entries = Array.from({ length: 70 }, (_, i) => entry(69 - i));
  const plan = planWave(entries, new Map(), 1);
  assert.equal(plan.picked.length, WAVE_SIZE);
  assert.equal(plan.picked[0].entry.email, "user0@example.org");
  assert.equal(plan.picked[49].entry.email, "user49@example.org");
  assert.equal(plan.skipped.wave_full, 20);
  assert.equal(planWave(entries, new Map(), 1, 500).picked.length, WAVE_SIZE);
});

test("teachers and parents wait for the consent fix, researchers wait for wave two", () => {
  const entries = [entry(1, "teacher"), entry(2, "parent"), entry(3, "researcher"), entry(4, "other"), entry(5, null)];
  const one = planWave(entries, new Map(), 1);
  assert.deepEqual(one.picked.map((c) => c.entry.email), ["user4@example.org", "user5@example.org"]);
  assert.equal(one.skipped.role_held, 3);
  const two = planWave(entries, new Map(), 2);
  assert.deepEqual(two.picked.map((c) => c.entry.email), ["user3@example.org", "user4@example.org", "user5@example.org"]);
});

test("a rerun never invites the same address twice", async () => {
  const store = memoryStore();
  const provider = fakeProvider();
  const entries = [entry(1), entry(2), entry(3)];
  const first = await sendWave(planWave(entries, await loadInvites(store), 1), store, provider);
  assert.equal(first.sent.length, 3);
  const again = planWave(entries, await loadInvites(store), 1);
  assert.equal(again.picked.length, 0);
  assert.equal(again.skipped.already_invited, 3);
  assert.equal((await sendWave(again, store, provider)).sent.length, 0);
  assert.equal(provider.outbox.length, 3);
  const rec = store.rows.get(emailKey("user1@example.org"))!;
  assert.equal(rec.status, "sent");
  assert.equal(rec.wave, 1);
  assert.ok(rec.invited_at);
});

test("a stale plan loses the claim to a run that got there first", async () => {
  const store = memoryStore();
  const entries = [entry(1), entry(2)];
  const plan = planWave(entries, new Map(), 1);
  const a = fakeProvider();
  const b = fakeProvider();
  await sendWave(plan, store, a);
  const late = await sendWave(plan, store, b);
  assert.equal(b.outbox.length, 0);
  assert.equal(late.lost.length, 2);
});

test("a pending claim from a crashed run blocks a resend", () => {
  const key = emailKey("user1@example.org");
  const pending: InviteRecord = { key, status: "pending", wave: 1, updated_at: "", invited_at: null, provider: "fake", message_id: null, error: null };
  const plan = planWave([entry(1)], new Map([[key, pending]]), 1);
  assert.equal(plan.picked.length, 0);
  assert.equal(plan.skipped.already_invited, 1);
});

test("a failed send is recorded without the address and retried on the next run", async () => {
  const store = memoryStore();
  const entries = [entry(1), entry(2)];
  const flaky = fakeProvider((e) => e.to === "user2@example.org");
  const first = await sendWave(planWave(entries, new Map(), 1), store, flaky);
  assert.deepEqual(first.failed, [logId(emailKey("user2@example.org"))]);
  const failed = store.rows.get(emailKey("user2@example.org"))!;
  assert.equal(failed.status, "failed");
  assert.equal(failed.error, "mailbox full for [email]");
  const retry = planWave(entries, await loadInvites(store), 1);
  assert.equal(retry.picked.length, 1);
  assert.equal(retry.picked[0].retry, true);
  const ok = fakeProvider();
  assert.equal((await sendWave(retry, store, ok)).sent.length, 1);
  assert.equal(store.rows.get(emailKey("user2@example.org"))!.status, "sent");
});

test("unsubscribed and bounced addresses are never picked", async () => {
  const store = memoryStore();
  await suppress(store, " User1@Example.org ", "unsubscribed");
  await suppress(store, "user2@example.org", "bounced");
  const plan = planWave([entry(1), entry(2), entry(3)], await loadInvites(store), 1);
  assert.deepEqual(plan.picked.map((c) => c.entry.email), ["user3@example.org"]);
  assert.equal(plan.skipped.suppressed, 2);
  await assert.rejects(suppress(store, "nope", "bounced"));
});

test("the email links to sign-in with a safe next path and keeps the address out of the body", () => {
  const mail = renderInvite(entry(1, "student", { name: "Ada <b>Lovelace</b>", wanted: "/research-os/learn/02-physics" }), 1);
  assert.equal(mail.to, "user1@example.org");
  assert.ok(mail.text.startsWith("Hi Ada,"));
  assert.ok(mail.text.includes("https://www.bucket.foundation/sign-in?next=%2Fresearch-os%2Flearn%2F02-physics"));
  assert.ok(mail.text.includes("18 and over"));
  assert.ok(mail.text.includes("reply with the word stop"));
  assert.ok(!mail.text.includes("user1@example.org"));
  assert.ok(renderInvite(entry(2, "student", { name: null }), 1).text.startsWith("Hello,"));
  assert.equal(inviteLink({ wanted: null }), "https://www.bucket.foundation/sign-in?next=%2Fresearch-os%2Flearn");
});

test("scrubEmails removes every address from provider errors", () => {
  assert.equal(scrubEmails("550 <a.b+c@x.example.org> rejected, cc d@e.io"), "550 <[email]> rejected, cc [email]");
});

test("the admin CSV export reads back as the same entries", () => {
  const entries = [entry(1, "teacher", { name: "=cmd, \"quoted\"", wanted: "/research-os/home" }), entry(2, null, { name: null })];
  assert.deepEqual(entriesFromCsv(toCsv(entries)), entries);
  assert.throws(() => entriesFromCsv("name\r\nx\r\n"));
});

test("the file store claims once and lists what it holds", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "invites-"));
  try {
    const store = fileInviteStore(root, "waitlist-local/invites/");
    const key = emailKey("user1@example.org");
    const rec: InviteRecord = { key, status: "pending", wave: 1, updated_at: "t", invited_at: null, provider: "fake", message_id: null, error: null };
    assert.equal(await store.create(key, rec), true);
    assert.equal(await store.create(key, rec), false);
    await store.write(key, { ...rec, status: "sent" });
    assert.equal((await store.read(key))?.status, "sent");
    assert.deepEqual(await store.keys(), [key]);
    const names = await readdir(path.join(root, "waitlist-local/invites"));
    assert.ok(names.every((n) => !n.includes("@")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the CLI dry run prints the wave and a sample, logs no address and writes nothing", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "invite-cli-"));
  try {
    const csv = path.join(dir, "list.csv");
    await import("node:fs/promises").then((fs) => fs.writeFile(csv, toCsv([entry(1), entry(2, "teacher")])));
    const run = spawnSync(
      process.execPath,
      [path.join(__dirname, "..", "node_modules/ts-node/dist/bin.js"), "--compiler-options", '{"module":"commonjs"}', path.join(__dirname, "waitlist-invite.ts"), "--wave", "1", "--csv", csv],
      { cwd: dir, encoding: "utf8", env: { ...process.env, BLOB_READ_WRITE_TOKEN: "", BLOB_STORE_ID: "", VERCEL: "", VERCEL_ENV: "" } },
    );
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /wave 1: 1 to invite from 2 on the list/);
    assert.match(run.stdout, /role_held 1/);
    assert.match(run.stdout, /dry run, nothing written/);
    assert.match(run.stdout, /Subject: Research OS is open for you/);
    assert.ok(!run.stdout.includes("user1@example.org") && !run.stderr.includes("user1@example.org"));
    assert.deepEqual((await readdir(dir)).sort(), ["list.csv"]);
    const send = spawnSync(
      process.execPath,
      [path.join(__dirname, "..", "node_modules/ts-node/dist/bin.js"), "--compiler-options", '{"module":"commonjs"}', path.join(__dirname, "waitlist-invite.ts"), "--wave", "1", "--csv", csv, "--send"],
      { cwd: dir, encoding: "utf8", env: { ...process.env, BLOB_READ_WRITE_TOKEN: "", BLOB_STORE_ID: "", VERCEL: "", VERCEL_ENV: "", INVITE_EMAIL_PROVIDER: "" } },
    );
    assert.equal(send.status, 1);
    assert.match(send.stderr, /no email provider is wired/);
    assert.deepEqual((await readdir(dir)).sort(), ["list.csv"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
