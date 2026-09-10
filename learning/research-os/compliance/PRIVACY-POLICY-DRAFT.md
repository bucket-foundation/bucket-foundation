# Research OS for K-12: Privacy Policy Draft

**Draft. Not legal advice. Counsel review required before this text is published or shown to a school, district, parent, or learner.**

Bead `ros-07`, minors compliance pack part A. Written against `_intake/research-os-k12/04-compliance-distribution.md` section 1 (COPPA, FERPA) and section 2 (US state law), and against `learning/research-os/compliance/DATA-INVENTORY.md` for what the product collects. Bucket Foundation's nonprofit status is pending; see `GOVERNANCE.md` for the disclosure this document's own "Our status" section carries forward.

---

## 1. Who this policy covers

This policy covers Research OS for K-12 and Bucket Academy, both operated by Bucket Foundation, both reachable through the same account. It applies to any learner who creates an account, and to the parent, guardian, or school official who consents on a learner's behalf.

## 2. What we collect, and why

We collect only what the product needs to route a learner through the knowledge graph, grade their work, and let a teacher review it. `learning/research-os/compliance/DATA-INVENTORY.md` is the complete, current list of every table and field; this section summarizes it in plain language.

- **Account identity**: an email address, used for sign-in only (passwordless, one-time code). We never see or store a password.
- **Learning state**: which stage a learner has reached on each topic (Access, Awareness, Understanding, Internalization, Production), and the specific checks, explanations, and answers that moved them there.
- **Work a learner submits**: a claim, the sources and quotes they attached to it, and their answer to a transfer-item question, when they choose to submit a Production for citation.
- **Teacher decisions**: when a teacher approves or returns a learner's submitted work, we store that decision and the teacher's reason.
- **Consent and age record**: a role (student, teacher, or independent learner), a coarse age bucket (under 13, 13 to 17, or 18 and over, never a birth date), and how consent was obtained (school, parent, or self, for an adult learner).

We do not collect a birth date, a home address, a phone number, a photo, or any biometric signal. We do not run behavioral advertising, and we never will: no learner's activity is used to target an ad, on this product or anywhere else.

## 3. Consent

**Under 13, in the United States.** We collect nothing beyond what is strictly needed for the account to exist until we have verifiable parental consent, or until a school has consented on the parent's behalf under FERPA's school-official exception (see section 5). A learner whose consent status is not yet on file cannot use the AI workspace tools or submit a Production; `src/lib/research-os/consent.ts`'s `requireConsent` check is what enforces this in the product itself, described at a technical level in `learning/research-os/compliance/README.md`.

**13 to 17.** The same consent gate applies; a school's consent under its own agreement with us, or a parent's own consent, unlocks the same features.

**18 and over, or a teacher's own account.** No parent or school consent is required; the learner or teacher consents for themselves at account creation.

**Outside the United States.** The age at which a learner can consent for themselves varies by country and, within the European Union, by member state. `_intake/research-os-k12/04-compliance-distribution.md` section 3 names the specific ages researched so far; a jurisdiction-aware version of this policy's consent rule is Phase B work, not yet built (see this directory's `README.md`).

## 4. How a school works with us

When a district or school uses this product, we act as a **school official** under FERPA: the school keeps control over how its students' data is used, we use it only to deliver the product, and we never redisclose it without the school's consent. A signed data privacy agreement, built on the Student Data Privacy Consortium's National Data Privacy Agreement, sets these terms in writing; see `learning/research-os/compliance/STUDENT-DATA-PRIVACY-ADDENDUM-DRAFT.md`.

## 5. No Sale or Advertising

We do not sell a learner's data. We do not use it to target advertising, to any learner, ever. We build no profile of a learner beyond what routes them through the knowledge graph and shows their own teacher their own progress.

## 6. AI use

The workspace's AI tools (Locate, Quote, Check, Organize) never write a learner's claim or synthesis for them; they retrieve sources, grade a learner's own explanation against grounding, and relabel a learner's own notes. `learning/research-os/compliance/AI-DISCLOSURE-DRAFT.md` describes exactly what the AI does and does not do, and names the human teacher review every submitted Production goes through before it is accepted.

## 7. Retention and Deletion

We keep a learner's data while their account is active. A parent, an eligible learner (13 or older, in most US states), or a school official acting on a family's behalf can request a full export or a full, permanent deletion of a learner's data at any time. `POST /api/research-os/privacy` is the technical route this runs through; see `learning/research-os/compliance/README.md` for the current state of that route (self-service in-product access to it is Phase B work, not yet built, the API exists today for a school official or the founder to run a request on a family's behalf).

Deletion is permanent and cannot be undone. A production that has already been accepted, cited, and paid keeps its already-completed payment and public attribution record, the same way a real-world payment already made is not clawed back by a later privacy request; every other row tied to the learner is removed.

## 8. Security

[Placeholder, counsel and security review required before publication: encryption in transit and at rest, access control, breach notification timeline and process, matching New York Education Law 2-d's 7-calendar-day district notice requirement where applicable.]

## 9. Our status

Bucket Foundation is a nonprofit organization with a 501(c)(3) determination pending from the IRS. We do not describe ourselves as tax-exempt until that determination arrives. See `GOVERNANCE.md` for our current legal structure and conflict-of-interest disclosure.

## 10. Contact

[Placeholder: a named privacy contact email and, once formal incorporation completes, a mailing address, required by most state student-privacy statutes as a point of contact for a parent or district inquiry.]

## 11. Changes to this policy

We will post any material change to this policy here, dated, before it takes effect, and will notify any school or district we have a signed agreement with directly.

---

**Reminders for counsel review**: this draft has not been checked against New York Education Law 2-d's Parents' Bill of Rights requirement (a named, separate document many districts expect alongside the policy itself), Illinois SOPPA's public-operator-list obligations (which sit on the district, but our contract terms need to support it), or the EU AI Act Annex III transparency obligations that apply once any EU rollout is planned (`_intake/research-os-k12/04-compliance-distribution.md` section 3 recommends gating any EU launch behind a dedicated AI Act review, separate from this policy).
