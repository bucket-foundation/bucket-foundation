# BBS Library Review

Reviewed 2026-09-28 for bkt-cagf. The BBS packet code stays behind `PROVENANCE_BBS`, default off, until the founder signs below.

## Versions

| Package | Version | Role |
|---|---|---|
| `@digitalbazaar/bbs-2023-cryptosuite` | 2.0.1 | W3C VC Data Integrity `bbs-2023` sign, derive, verify |
| `@digitalbazaar/bls12-381-multikey` | 2.2.0 | BBS key pairs as Multikey |
| `@digitalbazaar/bbs-signatures` | 3.1.0, transitive | BBS primitives, implements `draft-irtf-cfrg-bbs-signatures-06` |
| `@noble/curves` | 2.4.0, nested under bbs-signatures | BLS12-381 arithmetic |
| `@digitalbazaar/data-integrity` | 2.5.0 | `DataIntegrityProof` |
| `jsonld-signatures` | 11.6.0 | sign, derive, verify driver |

All pinned exact in `package.json`. The OB 3.0.3 JSON-LD context is vendored at `src/lib/provenance/contexts/ob-v3p0-3.0.3.json`, sha256 `3d34f4d4ef1bce691106e63798beb5e7b862ba841423f5ee1e53ab7ddf3bca84`; the document loader fetches nothing over the network.

## Audits

- `@noble/curves`: Trail of Bits at 2.3.0, Aug 2026, full scope; Cure53 at 1.6.0, Sep 2024, scope includes bls12-381 and hash-to-curve. Source: the package README.
- `bbs-signatures`, `bbs-2023-cryptosuite`, `bls12-381-multikey`: no published third-party audit found.
- The BBS scheme is an IRTF CFRG draft at revision 06, and `bbs-2023` is a W3C Candidate Recommendation. Both can still change.

## Known Issues

- GitHub security advisories: none on any of the three digitalbazaar repos as of 2026-09-28.
- Open issues: 5 on bbs-signatures, 5 on bbs-2023-cryptosuite, 4 on bls12-381-multikey. None is a security report. Two touch this use: the cryptosuite cannot verify a base proof without deriving first, so `verifyPacket` takes derived packets only; and `issuer` is a mandatory pointer only by caller choice, so `MANDATORY` in `packet.ts` lists `/issuer`, `/validFrom` and `/credentialStatus`.
- JSON-LD compaction turns a one-element array into an object, so the evidence pointer is `/evidence` and a packet carries one evidence entry.
- Unlinkability holds across derived proofs from one base credential; the disclosed `credentialStatus` index is linkable across presentations by design, because revocation needs it.

## Tests

`scripts/test-provenance-packet.ts`, 9 cases: flag gating, OB3 shape, default disclosure hides scores, wider disclosure verifies, tampered claim fails, foreign issuer key fails, revoked packet fails, status list encoding, Ed25519-signed status list.

## Rollback

If a BBS flaw turns up: set `PROVENANCE_BBS=0`, which stops issue, derive and verify; mark every issued index revoked in the status list; holders keep their Ed25519 Open Badges credential from `src/lib/academy/credential/`, which has no BBS dependency.

## Sign-off

Founder: Gianangelo Dichio (gianyrox), approved in session Date: 2026-09-28
