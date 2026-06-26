/**
 * src/lib/academy/credential/types.ts  (bkt-52p)
 * ----------------------------------------------------------------------------
 * Open Badges 3.0 / W3C Verifiable Credential shapes for the Bucket Academy
 * credential layer. Minimal, hand-written types for exactly the OB3 subset we
 * emit — we do NOT pull a JSON-LD library; VC-JWT (Compact JWS, EdDSA) is the
 * securing mechanism, so the credential is plain JSON.
 *
 * Spec anchors:
 *   - OB 3.0: https://www.imsglobal.org/spec/ob/v3p0/
 *   - VC Data Model 2.0: https://www.w3.org/TR/vc-data-model-2.0/
 *
 * HARD GATE (bkt-4at): NO numeric/certified "Mastery Rating" anywhere in an
 * Achievement or the subject. An achievement attests *evidence-backed
 * demonstrated concept mastery* — concept X, to a named depth on the
 * Recall→Apply→Derive→Teach-back ladder, with an evidence trail (recent spaced
 * re-demonstrations + canon alignment). The `resultDescription` type is the
 * spec's score slot; we deliberately do NOT use it. Depth is carried as a
 * controlled enum string, framed as demonstrated depth, not a graded score.
 */

export const OB3_CONTEXT = [
  "https://www.w3.org/ns/credentials/v2",
  "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
] as const;

/** Canon alignment — links an achievement to a canon skill/concept id. */
export interface Alignment {
  type: ["Alignment"];
  targetName: string;
  /** Canonical, resolvable URL for the canon concept (the Academy concept page). */
  targetUrl: string;
  /** The stable canon skill/atom id (e.g. "set-function") + its branch slug. */
  targetCode: string;
  targetFramework: string; // "Bucket Canon"
  targetDescription?: string;
}

/**
 * One demonstrated-mastery achievement = one canon concept the learner proved.
 * NOTE: no score / rating field. `criteria.narrative` + `demonstratedDepth`
 * (a controlled enum, NOT a number) + `alignment` carry the honest claim.
 */
export interface Achievement {
  id: string; // stable urn:bucket:achievement:<branch>:<atomId>
  type: ["Achievement"];
  name: string;
  description: string;
  criteria: { narrative: string };
  alignment: Alignment[];
  /** Bucket extension: the demonstrated depth on the canon ladder (enum, not a score). */
  "https://bucket.foundation/ns#demonstratedDepth"?: string;
  /** Bucket extension: branch the concept belongs to. */
  "https://bucket.foundation/ns#branch"?: string;
}

/** The credential subject = the learner (by their public profile URL/handle). */
export interface CredentialSubject {
  id: string; // the learner's public profile URL (https://.../m/<handle>)
  type: ["AchievementSubject"];
  /** Bucket extension: the public handle (the only PII — already public). */
  "https://bucket.foundation/ns#handle": string;
  achievement: Achievement[];
}

/** RevocationList-2020-style status the verifier checks (we resolve it live). */
export interface CredentialStatus {
  id: string; // resolvable status URL for THIS credential
  type: "BucketRevocationStatus";
}

export interface IssuerRef {
  id: string;
  type: ["Profile"];
  name: string;
  url?: string;
}

/** The OB3 OpenBadgeCredential (a W3C VC). This is the unsigned VC payload. */
export interface OpenBadgeCredential {
  "@context": string[];
  id: string; // stable, resolvable: https://.../api/academy/credential/<id>
  type: ["VerifiableCredential", "OpenBadgeCredential"];
  issuer: IssuerRef;
  /** VC 1.1 / OB3 field name. (validFrom is the VC 2.0 alias; we emit issuanceDate for OB3 compat.) */
  issuanceDate: string; // ISO 8601
  validFrom: string; // VC2.0 alias, same value
  credentialSubject: CredentialSubject;
  credentialStatus: CredentialStatus;
  /** Honest provenance/validity statement (bkt-rdg compliance). */
  "https://bucket.foundation/ns#provenance": string;
}

/** What a verifier reports back. */
export interface VerifyResult {
  valid: boolean; // signature verified AND issuer is Bucket AND not revoked
  signatureValid: boolean;
  issuerTrusted: boolean;
  revoked: boolean | null; // null = could not determine (offline / unknown id)
  reasons: string[];
  credential?: OpenBadgeCredential;
  // optional live cross-check (consistency with the learner's current profile)
  consistency?: {
    checked: boolean;
    handle: string | null;
    stillConsistent: boolean | null; // null = could not check live
    note: string;
    perConcept?: { code: string; name: string; stillHeld: boolean | null }[];
  };
}
