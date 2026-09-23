import type { PublicProfile } from "../profile";
import type { BranchSummary, ConceptSignal } from "../mastery";
import { loadCorpusForBranch } from "../corpus";
import {
  ISSUER_ID,
  ISSUER_NAME,
  SITE_ORIGIN,
} from "./issuer";
import type {
  Achievement,
  Alignment,
  OpenBadgeCredential,
} from "./types";
import { OB3_CONTEXT } from "./types";

export const MIN_REPS = 3;
const ELIGIBLE_DEPTHS = new Set(["derive", "teach"]);

const DEPTH_PRETTY: Record<string, string> = {
  recall: "Recall",
  apply: "Apply",
  derive: "Derive",
  teach: "Teach-back",
};

export interface EligibleConcept {
  branch: string;
  branchTitle: string;
  concept: ConceptSignal;
}

function conceptUrl(branch: string, atomId: string): string {
  return `${SITE_ORIGIN}/research-os/learn/${encodeURIComponent(branch)}/${encodeURIComponent(atomId)}`;
}

function conceptGloss(branch: string, atomId: string): string | undefined {
  const corpus = loadCorpusForBranch(branch);
  const atom = corpus?.atoms?.find((a) => a.id === atomId);
  return atom?.gloss || atom?.title;
}

export function selectEligible(profile: PublicProfile): EligibleConcept[] {
  const out: EligibleConcept[] = [];
  for (const b of profile.branches as BranchSummary[]) {
    for (const c of b.concepts) {
      if (
        c.mastered &&
        ELIGIBLE_DEPTHS.has(c.depth) &&
        (c.reps || 0) >= MIN_REPS
      ) {
        out.push({ branch: b.branch, branchTitle: b.title, concept: c });
      }
    }
  }
  out.sort(
    (a, b) =>
      depthRank(b.concept.depth) - depthRank(a.concept.depth) ||
      b.concept.leverage - a.concept.leverage
  );
  return out;
}

function depthRank(d: string): number {
  return d === "teach" ? 4 : d === "derive" ? 3 : d === "apply" ? 2 : d === "recall" ? 1 : 0;
}

function buildAchievement(e: EligibleConcept): Achievement {
  const { branch, branchTitle, concept } = e;
  const depthPretty = DEPTH_PRETTY[concept.depth] || "Derive";
  const gloss = conceptGloss(branch, concept.id);

  const alignment: Alignment[] = [
    {
      type: ["Alignment"],
      targetName: concept.title,
      targetUrl: conceptUrl(branch, concept.id),
      targetCode: `${branch}/${concept.id}`,
      targetFramework: "Bucket Canon",
      targetDescription: gloss,
    },
  ];

  const repNote =
    concept.reps >= 6
      ? `${concept.reps} spaced re-demonstrations`
      : `${concept.reps} spaced re-demonstrations`;
  const retNote =
    concept.retrievability != null
      ? ` Live retrievability at issuance: ${Math.round(
          concept.retrievability * 100
        )}%.`
      : "";

  return {
    id: `urn:bucket:achievement:${branch}:${concept.id}`,
    type: ["Achievement"],
    name: `${concept.title} — demonstrated to ${depthPretty}`,
    description:
      `Evidence of demonstrated mastery of the canon concept "${concept.title}" ` +
      `(${branchTitle}), reached to the ${depthPretty} depth on Bucket Academy's ` +
      `Recall → Apply → Derive → Teach-back ladder.`,
    criteria: {
      narrative:
        `Reached the ${depthPretty} depth on "${concept.title}" through ` +
        `retrieval-with-feedback re-demonstrated over time (${repNote}), not by ` +
        `reading or clicking through.${retNote} This attests demonstrated, ` +
        `evidence-backed depth on a single canon concept — it is not a graded ` +
        `score or a certified rating.`,
    },
    alignment,
    "https://bucket.foundation/ns#demonstratedDepth": depthPretty,
    "https://bucket.foundation/ns#branch": branch,
  };
}

export function buildCredential(args: {
  credentialId: string;
  handle: string;
  displayName: string | null;
  profile: PublicProfile;
  eligible: EligibleConcept[];
  issuedAt?: Date;
}): OpenBadgeCredential {
  const { credentialId, handle, profile, eligible } = args;
  const issuedAt = (args.issuedAt || new Date()).toISOString();
  const subjectUrl = `${SITE_ORIGIN}/m/${handle}`;
  const hostedUrl = `${SITE_ORIGIN}/api/academy/credential/${credentialId}`;
  const statusUrl = `${hostedUrl}/status`;

  const achievement = eligible.map(buildAchievement);

  return {
    "@context": [...OB3_CONTEXT],
    id: hostedUrl,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: {
      id: ISSUER_ID,
      type: ["Profile"],
      name: ISSUER_NAME,
      url: SITE_ORIGIN,
    },
    issuanceDate: issuedAt,
    validFrom: issuedAt,
    credentialSubject: {
      id: subjectUrl,
      type: ["AchievementSubject"],
      "https://bucket.foundation/ns#handle": handle,
      achievement,
    },
    credentialStatus: {
      id: statusUrl,
      type: "BucketRevocationStatus",
    },
    "https://bucket.foundation/ns#provenance":
      "Issued by Bucket Foundation from the learner's own public Mastery Profile. " +
      "Each achievement attests evidence-backed demonstrated mastery of a single " +
      "canon concept to a named depth (Recall→Apply→Derive→Teach-back) with a " +
      "spaced re-demonstration trail and canon alignment. It is NOT a certified " +
      "test score or a numeric rating. This credential is a point-in-time " +
      "artifact: it is cryptographically signed by Bucket and remains valid " +
      "unless revoked; a learner's live profile may evolve after issuance. " +
      "Only data the learner already made public is included.",
  };
}
