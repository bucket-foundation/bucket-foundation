import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ob3Context from "./contexts/ob-v3p0-3.0.3.json";
import { isRevoked } from "./status";

async function libs() {
  const [bbs2023, Bls12381Multikey, credentialsContext, dataIntegrity, dataIntegrityContext, jsigsModule] =
    await Promise.all([
      import("@digitalbazaar/bbs-2023-cryptosuite"),
      import("@digitalbazaar/bls12-381-multikey"),
      import("@digitalbazaar/credentials-context"),
      import("@digitalbazaar/data-integrity"),
      import("@digitalbazaar/data-integrity-context"),
      import("jsonld-signatures"),
    ]);
  const jsigs = jsigsModule.default ?? jsigsModule;
  const contexts = new Map<string, unknown>([[OB3, ob3Context]]);
  for (const source of [credentialsContext.contexts, dataIntegrityContext.contexts] as Map<string, unknown>[]) {
    source.forEach((doc, url) => contexts.set(url, doc));
  }
  return {
    bbs2023,
    Bls12381Multikey,
    DataIntegrityProof: dataIntegrity.DataIntegrityProof,
    jsigs,
    AssertionProofPurpose: jsigs.purposes.AssertionProofPurpose,
    contexts,
  };
}

export const VC_V2 = "https://www.w3.org/ns/credentials/v2";
export const OB3 = "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json";
const DID_V1 = "https://www.w3.org/ns/did/v1";
const MULTIKEY_V1 = "https://w3id.org/security/multikey/v1";

export const FIELDS = {
  achievement: ["/credentialSubject/achievement/id"],
  dateRange: ["/credentialSubject/activityStartDate", "/credentialSubject/activityEndDate"],
  mastery: ["/credentialSubject/result/0"],
  score: ["/credentialSubject/result/1"],
  quizCount: ["/credentialSubject/result/2"],
  sessionRoot: ["/evidence"],
} as const;
export type Field = keyof typeof FIELDS;
export const DEFAULT_DISCLOSURE: Field[] = ["achievement", "dateRange"];
const MANDATORY = ["/issuer", "/validFrom", "/credentialStatus"];

export interface PacketClaims {
  id: string;
  achievementId: string;
  achievementName: string;
  mastery: number;
  score: number;
  quizCount: number;
  dateFrom: string;
  dateTo: string;
  sessionRoot: string;
  statusListUrl: string;
  statusIndex: number;
  issuedAt: string;
}

export interface IssuerKeys {
  controller: string;
  keyId: string;
  secretKeyMultibase?: string;
  publicKeyMultibase: string;
}

export type Credential = Record<string, unknown>;

export class BbsDisabledError extends Error {
  constructor() {
    super("bbs_disabled");
  }
}

export function bbsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.PROVENANCE_BBS === "1";
}

function requireEnabled(env?: Record<string, string | undefined>) {
  if (!bbsEnabled(env)) throw new BbsDisabledError();
}

export function loadIssuerKeys(env: Record<string, string | undefined> = process.env): IssuerKeys | null {
  const raw = env.PROVENANCE_BBS_ISSUER_KEY?.trim();
  if (raw) return JSON.parse(raw) as IssuerKeys;
  const file = join(process.cwd(), "private", "provenance", "bbs-issuer.json");
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as IssuerKeys) : null;
}

export async function generateIssuerKeys(controller: string): Promise<IssuerKeys> {
  const { Bls12381Multikey } = await libs();
  const keyId = `${controller}#bbs`;
  const pair = await Bls12381Multikey.generateBbsKeyPair({ algorithm: "BBS-BLS12-381-SHA-256", id: keyId, controller });
  const exported = await pair.export({ publicKey: true, secretKey: true, includeContext: true });
  return {
    controller,
    keyId,
    secretKeyMultibase: exported.secretKeyMultibase,
    publicKeyMultibase: exported.publicKeyMultibase,
  };
}

export function publicKeyDocument(keys: IssuerKeys) {
  return {
    "@context": MULTIKEY_V1,
    id: keys.keyId,
    type: "Multikey",
    controller: keys.controller,
    publicKeyMultibase: keys.publicKeyMultibase,
  };
}

function controllerDocument(keys: IssuerKeys) {
  const { "@context": _ctx, ...method } = publicKeyDocument(keys);
  return { "@context": [DID_V1, MULTIKEY_V1], id: keys.controller, assertionMethod: [method] };
}

export function documentLoader(keys: IssuerKeys, contexts: Map<string, unknown>) {
  return async (url: string) => {
    if (contexts.has(url)) return { document: contexts.get(url), documentUrl: url, contextUrl: null };
    if (url === keys.keyId) return { document: publicKeyDocument(keys), documentUrl: url, contextUrl: null };
    if (url === keys.controller) return { document: controllerDocument(keys), documentUrl: url, contextUrl: null };
    throw new Error(`document_blocked:${url}`);
  };
}

export function buildPacket(c: PacketClaims, issuer: string): Credential {
  const result = (kind: string, value: number) => ({
    type: ["Result"],
    resultDescription: `urn:bucket:result:${kind}`,
    value: String(value),
  });
  return {
    "@context": [VC_V2, OB3],
    id: c.id,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: { id: issuer, type: ["Profile"], name: "Bucket Foundation" },
    validFrom: c.issuedAt,
    credentialSubject: {
      type: ["AchievementSubject"],
      activityStartDate: c.dateFrom,
      activityEndDate: c.dateTo,
      achievement: {
        id: c.achievementId,
        type: ["Achievement"],
        name: c.achievementName,
        description: c.achievementName,
        criteria: { narrative: "Demonstrated in a Bucket learning session." },
      },
      result: [result("mastery", c.mastery), result("score", c.score), result("quizCount", c.quizCount)],
    },
    evidence: [{ id: `urn:bucket:session:${c.sessionRoot}`, type: ["Evidence"] }],
    credentialStatus: {
      id: `${c.statusListUrl}#${c.statusIndex}`,
      type: "BitstringStatusListEntry",
      statusPurpose: "revocation",
      statusListIndex: String(c.statusIndex),
      statusListCredential: c.statusListUrl,
    },
  };
}

export async function issuePacket(
  c: PacketClaims,
  keys: IssuerKeys,
  env?: Record<string, string | undefined>,
): Promise<Credential> {
  requireEnabled(env);
  if (!keys.secretKeyMultibase) throw new Error("issuer_secret_missing");
  const { bbs2023, Bls12381Multikey, DataIntegrityProof, jsigs, AssertionProofPurpose, contexts } = await libs();
  const pair = await Bls12381Multikey.from({
    type: "Multikey",
    id: keys.keyId,
    controller: keys.controller,
    publicKeyMultibase: keys.publicKeyMultibase,
    secretKeyMultibase: keys.secretKeyMultibase,
  });
  const suite = new DataIntegrityProof({
    signer: pair.signer(),
    cryptosuite: bbs2023.createSignCryptosuite({ mandatoryPointers: MANDATORY }),
  });
  return await jsigs.sign(buildPacket(c, keys.controller), {
    suite,
    purpose: new AssertionProofPurpose(),
    documentLoader: documentLoader(keys, contexts),
  });
}

export async function derivePacket(
  signed: Credential,
  fields: Field[],
  keys: IssuerKeys,
  env?: Record<string, string | undefined>,
): Promise<Credential> {
  requireEnabled(env);
  const { bbs2023, DataIntegrityProof, jsigs, AssertionProofPurpose, contexts } = await libs();
  const selectivePointers = fields.flatMap((f) => [...FIELDS[f]]);
  const suite = new DataIntegrityProof({ cryptosuite: bbs2023.createDiscloseCryptosuite({ selectivePointers }) });
  return await jsigs.derive(signed, {
    suite,
    purpose: new AssertionProofPurpose(),
    documentLoader: documentLoader(keys, contexts),
  });
}

export interface PacketVerdict {
  verified: boolean;
  revoked: boolean;
  errors: string[];
}

export async function verifyPacket(
  derived: Credential,
  keys: IssuerKeys,
  encodedStatusList: string,
  env?: Record<string, string | undefined>,
): Promise<PacketVerdict> {
  requireEnabled(env);
  const { bbs2023, DataIntegrityProof, jsigs, AssertionProofPurpose, contexts } = await libs();
  const suite = new DataIntegrityProof({ cryptosuite: bbs2023.createVerifyCryptosuite() });
  const r = await jsigs.verify(derived, {
    suite,
    purpose: new AssertionProofPurpose(),
    documentLoader: documentLoader(keys, contexts),
  });
  const errors: string[] = [];
  if (!r.verified) errors.push(String(r.error?.message ?? r.error ?? "proof_invalid"));
  const status = derived.credentialStatus as { statusListIndex?: string } | undefined;
  const index = Number(status?.statusListIndex);
  const revoked = Number.isInteger(index) ? isRevoked(encodedStatusList, index) : true;
  if (revoked) errors.push("revoked");
  return { verified: r.verified && !revoked, revoked, errors };
}
