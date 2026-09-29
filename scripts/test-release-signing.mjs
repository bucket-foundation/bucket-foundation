import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SIGN = path.join(ROOT, "scripts/release/sign.sh");
const INSTALL = path.join(ROOT, "scripts/release/install.sh");

function run(cmd, args, env = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", env: { ...process.env, ...env } });
}

function sandbox() {
  const dir = mkdtempSync(path.join(tmpdir(), "bkt-release-"));
  const key = path.join(dir, "key");
  assert.equal(run("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-C", "test", "-f", key]).status, 0);
  const pub = readFileSync(`${key}.pub`, "utf8").trim();
  const artifact = path.join(dir, "bucket-0.0.1-linux-x64");
  writeFileSync(artifact, "#!/bin/sh\necho bucket\n");
  return { dir, key, pub, artifact, prefix: path.join(dir, "prefix") };
}

test("published key matches the repo copy and the key pinned in install.sh", () => {
  const repo = readFileSync(path.join(ROOT, "release/bucket-release.pub"), "utf8");
  const site = readFileSync(path.join(ROOT, "public/.well-known/bucket-release.pub"), "utf8");
  assert.equal(site, repo);
  assert.match(repo, /^ssh-ed25519 \S+ release@bucket\.foundation\n$/);
  assert.ok(readFileSync(INSTALL, "utf8").includes(`RELEASE_PUBKEY="${repo.trim()}"`));
  assert.equal(run("git", ["-C", ROOT, "ls-files", "--", "*release_ed25519", "*.key", "release/*"]).stdout.trim(), "release/bucket-release.pub");
});

test("sign then install verifies checksum and signature and installs", () => {
  const s = sandbox();
  try {
    const signed = run("bash", [SIGN, s.artifact, s.key]);
    assert.equal(signed.status, 0, signed.stderr);
    assert.match(readFileSync(`${s.artifact}.sha256`, "utf8"), /^[0-9a-f]{64}  bucket-0\.0\.1-linux-x64\n$/);
    assert.match(readFileSync(`${s.artifact}.sig`, "utf8"), /BEGIN SSH SIGNATURE/);
    const out = run("bash", [INSTALL, s.artifact], { BUCKET_PREFIX: s.prefix, BUCKET_RELEASE_PUBKEY: s.pub });
    assert.equal(out.status, 0, out.stderr);
    assert.equal(run(path.join(s.prefix, "bin/bucket"), []).stdout, "bucket\n");
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
  }
});

test("install refuses a tampered artifact, a wrong key and a missing signature", () => {
  const s = sandbox();
  try {
    assert.equal(run("bash", [SIGN, s.artifact, s.key]).status, 0);
    const env = { BUCKET_PREFIX: s.prefix, BUCKET_RELEASE_PUBKEY: s.pub };

    const wrong = run("bash", [INSTALL, s.artifact]);
    assert.notEqual(wrong.status, 0);
    assert.match(wrong.stderr, /signature check failed/);

    const original = readFileSync(s.artifact);
    writeFileSync(s.artifact, "#!/bin/sh\necho evil\n");
    const tampered = run("bash", [INSTALL, s.artifact], env);
    assert.match(tampered.stderr, /checksum mismatch/);

    writeFileSync(`${s.artifact}.sha256`, run("sha256sum", [s.artifact]).stdout);
    const resummed = run("bash", [INSTALL, s.artifact], env);
    assert.match(resummed.stderr, /signature check failed/);

    writeFileSync(s.artifact, original);
    rmSync(`${s.artifact}.sig`);
    assert.match(run("bash", [INSTALL, s.artifact], env).stderr, /no signature/);
    assert.equal(existsSync(path.join(s.prefix, "bin/bucket")), false);
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
  }
});

test("install unpacks a signed tarball and links bin/bkt", () => {
  const s = sandbox();
  try {
    const tree = path.join(s.dir, "tree/bin");
    mkdirSync(tree, { recursive: true });
    writeFileSync(path.join(tree, "bkt"), "#!/bin/sh\necho bkt\n");
    chmodSync(path.join(tree, "bkt"), 0o755);
    const tarball = path.join(s.dir, "bucket-0.0.1-linux-x64.tar.gz");
    assert.equal(run("tar", ["-czf", tarball, "-C", path.join(s.dir, "tree"), "bin"]).status, 0);
    assert.equal(run("bash", [SIGN, tarball, s.key]).status, 0);
    const out = run("bash", [INSTALL, tarball], { BUCKET_PREFIX: s.prefix, BUCKET_RELEASE_PUBKEY: s.pub });
    assert.equal(out.status, 0, out.stderr);
    assert.equal(run(path.join(s.prefix, "bin/bkt"), []).stdout, "bkt\n");
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
  }
});

test("sign refuses a private key inside the repo", () => {
  const s = sandbox();
  const inside = path.join(ROOT, ".tmp-release-key-test");
  try {
    writeFileSync(inside, readFileSync(s.key));
    const out = run("bash", [SIGN, s.artifact, inside]);
    assert.notEqual(out.status, 0);
    assert.match(out.stderr, /refusing a private key inside the repo/);
  } finally {
    rmSync(inside, { force: true });
    rmSync(s.dir, { recursive: true, force: true });
  }
});
