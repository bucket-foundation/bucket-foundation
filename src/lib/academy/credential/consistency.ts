import type { PublicProfile } from "../profile";
import { selectEligible } from "./build";
import type { OpenBadgeCredential, VerifyResult } from "./types";

export function checkConsistency(
  credential: OpenBadgeCredential,
  liveProfile: PublicProfile | null
): NonNullable<VerifyResult["consistency"]> {
  const handle = credential.credentialSubject["https://bucket.foundation/ns#handle"] || null;

  if (!liveProfile) {
    return {
      checked: false,
      handle,
      stillConsistent: null,
      note:
        "Could not load the learner's live profile (it may be private now, or " +
        "sync is unavailable). The credential is a point-in-time signed artifact " +
        "and remains valid regardless.",
    };
  }

  const liveCodes = new Set(
    selectEligible(liveProfile).map((e) => `${e.branch}/${e.concept.id}`)
  );

  const perConcept = credential.credentialSubject.achievement.map((a) => {
    const code = a.alignment?.[0]?.targetCode || a.id;
    return { code, name: a.name, stillHeld: liveCodes.has(code) };
  });

  const heldCount = perConcept.filter((p) => p.stillHeld).length;
  const stillConsistent = heldCount === perConcept.length;

  return {
    checked: true,
    handle,
    stillConsistent,
    note: stillConsistent
      ? "Every concept in this credential still clears the issuance bar on the " +
        "learner's current public profile."
      : `${heldCount}/${perConcept.length} asserted concepts still clear the bar on ` +
        "the live profile. The credential remains a valid signed point-in-time " +
        "artifact; differences just reflect that learning evolves after issuance.",
    perConcept,
  };
}
