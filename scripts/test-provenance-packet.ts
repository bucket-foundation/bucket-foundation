import { strict as assert } from "node:assert";
import { generateKeyPair, exportJWK } from "jose";
import { test } from "node:test";
import {
  BbsDisabledError,
  DEFAULT_DISCLOSURE,
  bbsEnabled,
  buildPacket,
  derivePacket,
  generateIssuerKeys,
  issuePacket,
  verifyPacket,
  type PacketClaims,
} from "../src/lib/provenance/packet";
import {
  decodeStatusList,
  encodeStatusList,
  isRevoked,
  signStatusList,
  statusListCredential,
  verifyStatusList,
} from "../src/lib/provenance/status";

const ON = { PROVENANCE_BBS: "1" };
const OFF = {};
const ISSUER = "did:web:bucket.foundation:provenance";
const LIST = "https://bucket.foundation/api/provenance/status/1";

const claims = (statusIndex = 7): PacketClaims => ({
  id: `urn:uuid:00000000-0000-4000-8000-00000000000${statusIndex}`,
  achievementId: "urn:bucket:achievement:physics.entropy",
  achievementName: "Entropy",
  mastery: 0.91,
  score: 88,
  quizCount: 12,
  dateFrom: "2026-09-01T00:00:00Z",
  dateTo: "2026-09-28T00:00:00Z",
  sessionRoot: "ab".repeat(32),
  statusListUrl: LIST,
  statusIndex,
  issuedAt: "2026-09-28T12:00:00Z",
});

let keysPromise: ReturnType<typeof generateIssuerKeys> | null = null;
const keys = () => (keysPromise ??= generateIssuerKeys(ISSUER));

test("the feature flag is off by default and gates every entry point", async () => {
  assert.equal(bbsEnabled({}), false);
  assert.equal(bbsEnabled({ PROVENANCE_BBS: "true" }), false);
  assert.equal(bbsEnabled(ON), true);
  const k = await keys();
  await assert.rejects(issuePacket(claims(), k, OFF), BbsDisabledError);
  await assert.rejects(derivePacket({}, DEFAULT_DISCLOSURE, k, OFF), BbsDisabledError);
  await assert.rejects(verifyPacket({}, k, encodeStatusList([]), OFF), BbsDisabledError);
});

test("an issued packet is an Open Badges 3.0 credential with a revocation entry", () => {
  const p = buildPacket(claims(), ISSUER) as any;
  assert.deepEqual(p.type, ["VerifiableCredential", "OpenBadgeCredential"]);
  assert.equal(p.credentialStatus.type, "BitstringStatusListEntry");
  assert.equal(p.credentialStatus.statusListIndex, "7");
  assert.equal(p.credentialSubject.result.length, 3);
});

test("default disclosure reveals the achievement and dates and hides the scores", async () => {
  const k = await keys();
  const signed = await issuePacket(claims(), k, ON);
  const derived = (await derivePacket(signed, DEFAULT_DISCLOSURE, k, ON)) as any;
  assert.equal(derived.credentialSubject.achievement.id, "urn:bucket:achievement:physics.entropy");
  assert.equal(derived.credentialSubject.activityEndDate, "2026-09-28T00:00:00Z");
  assert.equal(derived.credentialSubject.result, undefined);
  assert.equal(derived.evidence, undefined);
  assert.equal(derived.credentialSubject.achievement.name, undefined);
  assert.ok(!JSON.stringify(derived).includes("0.91"));
  const v = await verifyPacket(derived, k, encodeStatusList([]), ON);
  assert.deepEqual(v, { verified: true, revoked: false, errors: [] });
});

test("the owner can disclose more fields, and those verify", async () => {
  const k = await keys();
  const signed = await issuePacket(claims(), k, ON);
  const derived = (await derivePacket(signed, ["achievement", "score", "sessionRoot"], k, ON)) as any;
  assert.equal(derived.credentialSubject.result.length, 1);
  assert.equal(derived.credentialSubject.result[0].value, "88");
  assert.equal([derived.evidence].flat()[0].id, `urn:bucket:session:${"ab".repeat(32)}`);
  assert.equal(derived.credentialSubject.activityStartDate, undefined);
  assert.equal((await verifyPacket(derived, k, encodeStatusList([]), ON)).verified, true);
});

test("a tampered disclosed claim fails verification", async () => {
  const k = await keys();
  const signed = await issuePacket(claims(), k, ON);
  const derived = (await derivePacket(signed, ["achievement", "score"], k, ON)) as any;
  derived.credentialSubject.result[0].value = "99";
  const v = await verifyPacket(derived, k, encodeStatusList([]), ON);
  assert.equal(v.verified, false);
  assert.equal(v.revoked, false);
});

test("a packet from another issuer key fails verification", async () => {
  const k = await keys();
  const other = await generateIssuerKeys(ISSUER);
  const derived = await derivePacket(await issuePacket(claims(), other, ON), DEFAULT_DISCLOSURE, other, ON);
  assert.equal((await verifyPacket(derived, k, encodeStatusList([]), ON)).verified, false);
});

test("a revoked packet fails verification", async () => {
  const k = await keys();
  const derived = await derivePacket(await issuePacket(claims(3), k, ON), DEFAULT_DISCLOSURE, k, ON);
  const v = await verifyPacket(derived, k, encodeStatusList([3]), ON);
  assert.deepEqual(v, { verified: false, revoked: true, errors: ["revoked"] });
});

test("status lists round trip and reject bad indexes", () => {
  const enc = encodeStatusList([0, 9, 131071]);
  assert.equal(decodeStatusList(enc).length, 16384);
  assert.equal(isRevoked(enc, 0), true);
  assert.equal(isRevoked(enc, 1), false);
  assert.equal(isRevoked(enc, 9), true);
  assert.equal(isRevoked(enc, 131071), true);
  assert.throws(() => encodeStatusList([131072]));
  assert.throws(() => isRevoked(enc, -1));
});

test("the status list is signed with the Ed25519 issuer key and rejects other keys", async () => {
  const { privateKey, publicKey } = await generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
  const other = await generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
  const priv = { ...(await exportJWK(privateKey)), kid: "test" };
  const list = statusListCredential(LIST, ISSUER, encodeStatusList([5]), "2026-09-28T12:00:00Z");
  const jwt = await signStatusList(list, priv);
  const back = await verifyStatusList(jwt, [await exportJWK(publicKey)]);
  assert.equal(isRevoked(back.credentialSubject.encodedList, 5), true);
  await assert.rejects(verifyStatusList(jwt, [await exportJWK(other.publicKey)]));
});
