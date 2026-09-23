export const OB3_CONTEXT = [
  "https://www.w3.org/ns/credentials/v2",
  "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
] as const;

export interface Alignment {
  type: ["Alignment"];
  targetName: string;
  targetUrl: string;
  targetCode: string;
  targetFramework: string;
  targetDescription?: string;
}

export interface Achievement {
  id: string;
  type: ["Achievement"];
  name: string;
  description: string;
  criteria: { narrative: string };
  alignment: Alignment[];
  "https://bucket.foundation/ns#demonstratedDepth"?: string;
  "https://bucket.foundation/ns#branch"?: string;
}

export interface CredentialSubject {
  id: string;
  type: ["AchievementSubject"];
  "https://bucket.foundation/ns#handle": string;
  achievement: Achievement[];
}

export interface CredentialStatus {
  id: string;
  type: "BucketRevocationStatus";
}

export interface IssuerRef {
  id: string;
  type: ["Profile"];
  name: string;
  url?: string;
}

export interface OpenBadgeCredential {
  "@context": string[];
  id: string;
  type: ["VerifiableCredential", "OpenBadgeCredential"];
  issuer: IssuerRef;
  issuanceDate: string;
  validFrom: string;
  credentialSubject: CredentialSubject;
  credentialStatus: CredentialStatus;
  "https://bucket.foundation/ns#provenance": string;
}

export interface VerifyResult {
  valid: boolean;
  signatureValid: boolean;
  issuerTrusted: boolean;
  revoked: boolean | null;
  reasons: string[];
  credential?: OpenBadgeCredential;
  consistency?: {
    checked: boolean;
    handle: string | null;
    stillConsistent: boolean | null;
    note: string;
    perConcept?: { code: string; name: string; stillHeld: boolean | null }[];
  };
}
