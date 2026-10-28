# Provable Learning

Bead bkt-any9z. Fed owns the zero-knowledge proof work.

## Stage 1: Signed Credentials

- Format: Open Badges 3.0 as a W3C Verifiable Credential, signed by Bucket Foundation's issuer key. No blockchain, per the 2026-06-14 decision.
- Subject: one milestone or mastery level, for example "Spanish A1 vocabulary: 500 words at 90% recall over 30 days".
- Evidence: the claim names the deck, the item count, the recall threshold and the window. The raw review log stays private.
- Verify: a public page at /m/<handle> and a verifier endpoint that checks the signature and revocation status. Revocation uses the status-list work in bkt-98gt5.11.
- Share: a "share my proof" card from the milestone screen (bkt-l3lpa).

## Stage 2: Zero-Knowledge Proof Of Mastery

- Goal: prove "recall above 90% on 500 items over 30 days" without revealing the review log.
- Approach to evaluate: the app commits to a hash of the review log at each sync, and a circuit proves the threshold over the committed log.
- Open questions for Fed: proof system, proving time on a phone, and who holds the commitments.

## Pricing Angle

Paid verification fits people who need proof: heritage speakers, job applicants and schools. Learners get the credential free and verifiers pay per check. That lines up with Bucket's paid-to-cite model.
