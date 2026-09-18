# Consent paths and the payee

ros-32. INTEGRATION-PLAN.md section 6: under-13 learners are in, through the right gates. The gate itself is unchanged (`consent.ts`, `decideConsent`); this adds the paths that satisfy it and the payee rules for anyone under 18.

## Paths

`src/lib/research-os/consent-paths.ts`, tested by `scripts/test-research-os-consent-paths.ts`.

1. Adult (`18plus`): no consent needed.
2. Consent already on the profile (`consent_status` school, parent, or self).
3. The school exception: a rostered learner (membership role `learner`) in a class whose `consent_basis` is `school` reads as `school`, with the class's `consent_document` as the source. Staff set the basis with `POST /api/research-os/consent {action: "class_basis"}`.
4. Verified parental consent: a `consent_requests` row with status `verified` reads as `parent`. The learner starts one with `{action: "request", vendor}`; PRIVO and k-ID throw until configured (the vendor choice is still the founder's); the manual path records a consent a teacher or librarian verified out of band with `{action: "record"}`.

`requireConsent` (the gate every tool route calls) runs the profile first and, when it would block for `consent_required`, resolves the paths and writes the result through to the profile, so the next check is one read.

## The payee

`graph.learner_profiles.payee_type` (self, guardian, custodial), `guardian_contact_hash`, `payee_visibility`. `payeeFor` allows a payment only when the age is known and, for anyone under 18, the payee is a guardian (with a contact on file) or a custodial account. `GET` and `POST /api/research-os/payee`. The citation rail consults this before any payout to a Research OS contributor; the guardian sees every payment.

## Data minimization

No guardian contact is stored in clear: the route hashes it with `RESEARCH_OS_HASH_SALT` for matching a vendor callback and for the visibility notice. The profile still holds only the birth-year bucket.

## Surfaces

Profile: the consent section (where consent comes from, what is still needed, a way to ask) and the payments section (payee and visibility). Class staff: the class basis and the manual record through the consent route; a control on the class page follows.
