import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SIGN = path.join(ROOT, "scripts/release/sign.sh");
const INSTALL = path.join(ROOT, "scripts/release/install.sh");
const PINNED = /^RELEASE_PUBKEY=".*"$/m;

function run(cmd, args, env = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", env: { ...process.env, ...env } });
}

function sandbox() {
  const dir = mkdtempSync(path.join(tmpdir(), "bkt-release-"));
  const key = path.join(dir, "key");
  assert.equal(run("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-C", "test", "-f", key]).status, 0);
  const pub = readFileSync(`${key}.pub`, "utf8").trim();
  const installer = path.join(dir, "install.sh");
  writeFileSync(installer, readFileSync(INSTALL, "utf8").replace(PINNED, `RELEASE_PUBKEY="${pub}"`));
  const artifact = path.join(dir, "bucket-linux-x64");
  writeFileSync(artifact, "#!/bin/sh\necho bucket\n");
  const prefix = path.join(dir, "prefix");
  const sign = (file, version, ...flags) => run("bash", [SIGN, "--allow-unencrypted", ...flags, file, version, key]);
  const install = (source) => run("bash", [installer, source], { BUCKET_PREFIX: prefix });
  return { dir, key, artifact, prefix, sign, install, done: () => rmSync(dir, { recursive: true, force: true }) };
}

test("published key matches the repo copy and the key pinned in install.sh, with no override", () => {
  const repo = readFileSync(path.join(ROOT, "release/bucket-release.pub"), "utf8");
  assert.equal(readFileSync(path.join(ROOT, "public/.well-known/bucket-release.pub"), "utf8"), repo);
  assert.match(repo, /^ssh-ed25519 \S+ release@bucket\.foundation\n$/);
  const script = readFileSync(INSTALL, "utf8");
  assert.equal(script.match(PINNED)?.[0], `RELEASE_PUBKEY="${repo.trim()}"`);
  assert.doesNotMatch(script, /BUCKET_RELEASE_PUBKEY|\$\{RELEASE_PUBKEY:-/);
  assert.equal(run("git", ["-C", ROOT, "ls-files", "release"]).stdout.trim(), "release/bucket-release.pub");
});

test("sign writes checksum and a signed manifest with version and expiry; install accepts it", () => {
  const s = sandbox();
  try {
    const signed = s.sign(s.artifact, "0.1.0");
    assert.equal(signed.status, 0, signed.stderr);
    assert.match(readFileSync(`${s.artifact}.sha256`, "utf8"), /^[0-9a-f]{64}  bucket-linux-x64\n$/);
    assert.match(readFileSync(`${s.artifact}.manifest`, "utf8"), /^name=bucket-linux-x64\nversion=0\.1\.0\nsha256=[0-9a-f]{64}\nexpires=\d+\n$/);
    const out = s.install(s.artifact);
    assert.equal(out.status, 0, out.stderr);
    assert.equal(run(path.join(s.prefix, "bin/bucket"), []).stdout, "bucket\n");
    assert.equal(readFileSync(path.join(s.prefix, "share/bucket/version"), "utf8"), "0.1.0\n");
  } finally {
    s.done();
  }
});

test("install rejects the production key, a tampered artifact, an edited manifest and a missing signature", () => {
  const s = sandbox();
  try {
    assert.equal(s.sign(s.artifact, "0.1.0").status, 0);
    assert.match(run("bash", [INSTALL, s.artifact], { BUCKET_PREFIX: s.prefix, BUCKET_RELEASE_PUBKEY: "ignored" }).stderr, /signature check failed/);

    const original = readFileSync(s.artifact);
    writeFileSync(s.artifact, "#!/bin/sh\necho evil\n");
    assert.match(s.install(s.artifact).stderr, /checksum mismatch/);
    writeFileSync(s.artifact, original);

    const manifest = readFileSync(`${s.artifact}.manifest`, "utf8");
    writeFileSync(`${s.artifact}.manifest`, manifest.replace("version=0.1.0", "version=9.9.9"));
    assert.match(s.install(s.artifact).stderr, /signature check failed/);
    writeFileSync(`${s.artifact}.manifest`, manifest);

    rmSync(`${s.artifact}.manifest.sig`);
    assert.match(s.install(s.artifact).stderr, /no signature/);
    assert.equal(existsSync(path.join(s.prefix, "bin/bucket")), false);
  } finally {
    s.done();
  }
});

test("install refuses a downgrade and an expired manifest", () => {
  const s = sandbox();
  try {
    assert.equal(s.sign(s.artifact, "0.2.0").status, 0);
    assert.equal(s.install(s.artifact).status, 0);
    assert.equal(s.sign(s.artifact, "0.2.0").status, 0);
    assert.equal(s.install(s.artifact).status, 0);
    assert.equal(s.sign(s.artifact, "0.1.9").status, 0);
    assert.match(s.install(s.artifact).stderr, /refusing downgrade from 0\.2\.0 to 0\.1\.9/);
    assert.equal(s.sign(s.artifact, "0.10.0").status, 0);
    assert.equal(s.install(s.artifact).status, 0);

    const manifest = readFileSync(`${s.artifact}.manifest`, "utf8").replace(/expires=\d+/, "expires=1000");
    writeFileSync(`${s.artifact}.manifest`, manifest);
    rmSync(`${s.artifact}.manifest.sig`);
    assert.equal(run("ssh-keygen", ["-q", "-Y", "sign", "-f", s.key, "-n", "bucket-release", `${s.artifact}.manifest`]).status, 0);
    assert.match(s.install(s.artifact).stderr, /manifest expired/);
  } finally {
    s.done();
  }
});

test("install unpacks a signed tarball and links bin/bkt", () => {
  const s = sandbox();
  try {
    const tree = path.join(s.dir, "tree/bin");
    mkdirSync(tree, { recursive: true });
    writeFileSync(path.join(tree, "bkt"), "#!/bin/sh\necho bkt\n");
    chmodSync(path.join(tree, "bkt"), 0o755);
    const tarball = path.join(s.dir, "bucket-linux-x64.tar.gz");
    assert.equal(run("tar", ["-czf", tarball, "-C", path.join(s.dir, "tree"), "bin"]).status, 0);
    assert.equal(s.sign(tarball, "0.1.0").status, 0);
    const out = s.install(tarball);
    assert.equal(out.status, 0, out.stderr);
    assert.equal(run(path.join(s.prefix, "bin/bkt"), []).stdout, "bkt\n");
  } finally {
    s.done();
  }
});

test("install strips the query string when naming files", () => {
  const s = sandbox();
  try {
    assert.equal(s.sign(s.artifact, "0.1.0").status, 0);
    const bin = path.join(s.dir, "fakebin");
    const log = path.join(s.dir, "curl.log");
    mkdirSync(bin);
    writeFileSync(
      path.join(bin, "curl"),
      `#!/usr/bin/env bash\nwhile [ $# -gt 0 ]; do case "$1" in -o) out=$2; shift 2;; --proto) shift 2;; -*) shift;; *) url=$1; shift;; esac; done\necho "$url" >> "${log}"\np=\${url%%\\?*}\ncp "${s.dir}/\${p##*/}" "$out"\n`,
    );
    chmodSync(path.join(bin, "curl"), 0o755);
    const out = run("bash", [path.join(s.dir, "install.sh"), "https://releases.example/v1/bucket-linux-x64?token=abc"], {
      BUCKET_PREFIX: s.prefix,
      PATH: `${bin}:${process.env.PATH}`,
    });
    assert.equal(out.status, 0, out.stderr);
    assert.deepEqual(readFileSync(log, "utf8").trim().split("\n"), [
      "https://releases.example/v1/bucket-linux-x64?token=abc",
      "https://releases.example/v1/bucket-linux-x64.manifest?token=abc",
      "https://releases.example/v1/bucket-linux-x64.manifest.sig?token=abc",
    ]);
  } finally {
    s.done();
  }
});

test("sign refuses an unencrypted key without the flag, a key inside the repo and a bad version", () => {
  const s = sandbox();
  const inside = path.join(ROOT, ".tmp-release-key-test");
  try {
    assert.match(run("bash", [SIGN, s.artifact, "0.1.0", s.key]).stderr, /no passphrase/);
    assert.match(s.sign(s.artifact, "v1").stderr, /MAJOR\.MINOR\.PATCH/);
    writeFileSync(inside, readFileSync(s.key));
    assert.match(run("bash", [SIGN, "--allow-unencrypted", s.artifact, "0.1.0", inside]).stderr, /inside the repo/);
  } finally {
    rmSync(inside, { force: true });
    s.done();
  }
});
