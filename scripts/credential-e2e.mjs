/**
 * scripts/credential-e2e.mjs  (bkt-52p)
 * ----------------------------------------------------------------------------
 * End-to-end transcript for the verifiable-credential layer, using the SAME jose
 * EdDSA path the routes use, against the real Ed25519 keypair and a fixture
 * progress record. Proves: build → sign → fetch → verify PASS → tamper → verify
 * FAIL → revoke → verify shows revoked. No DB / no network needed.
 *
 * Run: node scripts/credential-e2e.mjs
 */
import { readFileSync } from "node:fs";
import { SignJWT, jwtVerify, importJWK } from "jose";
import { randomUUID } from "node:crypto";

const ORIGIN = "https://www.bucket.foundation";
const ISSUER_ID = ORIGIN + "/api/academy/issuer";

// --- the real keypair (private from the gitignored dev file) ----------------
const keyFile = JSON.parse(readFileSync("private/academy/issuer-key.json", "utf8"));
const PRIV = keyFile.private_jwk;
const PUB = { kty: "OKP", crv: "Ed25519", x: PRIV.x, alg: "EdDSA", use: "sig", kid: PRIV.kid };

const log = (...a) => console.log(...a);
const ok = (c) => (c ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m");

// --- a fixture credential (shape mirrors src/lib/academy/credential/build.ts) ---
function buildCredential(id) {
  const issuedAt = new Date().toISOString();
  const hosted = `${ORIGIN}/api/academy/credential/${id}`;
  return {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: hosted,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: { id: ISSUER_ID, type: ["Profile"], name: "Bucket Foundation", url: ORIGIN },
    issuanceDate: issuedAt,
    validFrom: issuedAt,
    credentialSubject: {
      id: `${ORIGIN}/m/euler`,
      type: ["AchievementSubject"],
      "https://bucket.foundation/ns#handle": "euler",
      achievement: [
        {
          id: "urn:bucket:achievement:01-mathematics:set-function",
          type: ["Achievement"],
          name: "Sets and functions — demonstrated to Derive",
          description: "Evidence of demonstrated mastery of the canon concept …",
          criteria: { narrative: "Reached the Derive depth through spaced retrieval-with-feedback (5 spaced re-demonstrations). Not a graded score or a certified rating." },
          alignment: [{ type: ["Alignment"], targetName: "Sets and functions", targetUrl: `${ORIGIN}/academy?deck=01-mathematics&atom=set-function`, targetCode: "01-mathematics/set-function", targetFramework: "Bucket Canon" }],
          "https://bucket.foundation/ns#demonstratedDepth": "Derive",
          "https://bucket.foundation/ns#branch": "01-mathematics",
        },
      ],
    },
    credentialStatus: { id: `${hosted}/status`, type: "BucketRevocationStatus" },
    "https://bucket.foundation/ns#provenance": "Issued by Bucket Foundation … NOT a certified test score or a numeric rating.",
  };
}

async function sign(cred) {
  const key = await importJWK(PRIV, "EdDSA");
  const iat = Math.floor(new Date(cred.issuanceDate).getTime() / 1000);
  return await new SignJWT({ vc: cred })
    .setProtectedHeader({ alg: "EdDSA", typ: "JWT", kid: PRIV.kid })
    .setIssuer(ISSUER_ID).setSubject(cred.credentialSubject.id).setJti(cred.id)
    .setIssuedAt(iat).setNotBefore(iat).sign(key);
}

async function verifySig(jwt) {
  const key = await importJWK(PUB, "EdDSA");
  try {
    const { payload } = await jwtVerify(jwt, key, { algorithms: ["EdDSA"] });
    const vc = payload.vc;
    const issuerTrusted = payload.iss === ISSUER_ID && vc?.issuer?.id === ISSUER_ID;
    return { signatureValid: true, issuerTrusted, credential: vc };
  } catch (e) {
    return { signatureValid: false, issuerTrusted: false, error: e.message };
  }
}

// simulated revocation store (what bucket.academy_credentials does)
const store = new Map();

async function main() {
  log("\n=== Bucket Academy verifiable-credential E2E (bkt-52p) ===\n");
  log("Issuer key (public JWK):", JSON.stringify(PUB));

  // 0. enforce the no-rating gate on the built credential
  const id = randomUUID();
  const cred = buildCredential(id);
  store.set(id, { jwt: null, revoked_at: null });
  const flat = JSON.stringify(cred);
  const hasScore = /resultDescription|"score"|"rating"|masteryRating/i.test(flat);
  log("\n[gate bkt-4at] credential carries NO score/rating field:", ok(!hasScore));
  log("  demonstratedDepth (enum, not a number):",
    cred.credentialSubject.achievement[0]["https://bucket.foundation/ns#demonstratedDepth"]);
  log("  alignment.targetCode (canon skill id):",
    cred.credentialSubject.achievement[0].alignment[0].targetCode);

  // 1. sign
  const jwt = await sign(cred);
  store.get(id).jwt = jwt;
  log("\n[1] signed VC-JWT (first 80 chars):", jwt.slice(0, 80) + "…");
  log("    header:", Buffer.from(jwt.split(".")[0], "base64url").toString());

  // 2. fetch (from the simulated host) + verify -> PASS
  const fetched = store.get(id).jwt;
  let r = await verifySig(fetched);
  const revoked1 = !!store.get(id).revoked_at;
  const valid1 = r.signatureValid && r.issuerTrusted && !revoked1;
  log("\n[2] VERIFY (valid credential):");
  log("    signature valid:", ok(r.signatureValid));
  log("    issuer is Bucket:", ok(r.issuerTrusted));
  log("    not revoked:", ok(!revoked1));
  log("    => overall VALID:", ok(valid1));

  // 3. tamper one byte in the payload segment -> verify FAILS
  const parts = fetched.split(".");
  const payloadBuf = Buffer.from(parts[1], "base64url");
  payloadBuf[payloadBuf.length - 5] ^= 0x01; // flip one bit
  const tampered = parts[0] + "." + payloadBuf.toString("base64url") + "." + parts[2];
  r = await verifySig(tampered);
  log("\n[3] VERIFY (tampered one byte):");
  log("    signature valid:", ok(r.signatureValid), "(expected FAIL)");
  log("    => overall:", r.signatureValid ? "\x1b[31mUNEXPECTEDLY VALID\x1b[0m" : "\x1b[32mcorrectly REJECTED\x1b[0m");

  // 4. revoke -> verify shows revoked (signature still valid, but invalid overall)
  store.get(id).revoked_at = new Date().toISOString();
  r = await verifySig(fetched);
  const revoked2 = !!store.get(id).revoked_at;
  const valid2 = r.signatureValid && r.issuerTrusted && !revoked2;
  log("\n[4] VERIFY (after revocation):");
  log("    signature still mathematically valid:", ok(r.signatureValid));
  log("    revoked flag:", ok(revoked2));
  log("    => overall VALID:", valid2 ? "\x1b[31mtrue\x1b[0m" : "\x1b[32mfalse (correctly invalid)\x1b[0m");

  // summary
  const allGood = !hasScore && valid1 && !(await verifySig(tampered)).signatureValid && !valid2;
  log("\n=== RESULT:", allGood ? "\x1b[32mALL CHECKS PASSED\x1b[0m" : "\x1b[31mSOME CHECKS FAILED\x1b[0m", "===\n");
  process.exit(allGood ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
