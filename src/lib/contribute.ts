/**
 * bucket.foundation — contribute config
 * -------------------------------------
 * SINGLE SOURCE OF TRUTH for the /contribute page: the open-source repos, the
 * canon branches, the citation handles, and the contact CTA. Sibling to
 * src/lib/support.ts (which owns the *funding* knobs) — this file owns the
 * *contributing* knobs. The contact email + GitHub org URL are reused from
 * support.ts so there is still exactly one contact knob.
 *
 * No secrets here — every value is a public URL, a DOI, or a license name.
 */

import { GITHUB_ORG_URL, CONTACT_EMAIL, mailto } from "./support";

export { GITHUB_ORG_URL, CONTACT_EMAIL };

/** The canonical Zenodo DOI for the research-atlas corpus + the first paper. */
export const ZENODO_DOI = "10.5281/zenodo.20774322";
export const ZENODO_DOI_URL = `https://doi.org/${ZENODO_DOI}`;

/** The open data + content license surfaced for citation/reuse. */
export const DATA_LICENSE = "CC-BY-4.0";
export const DATA_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";

/** Code license (the repos) + intent license (the protocol spec). */
export const CODE_LICENSE = "MIT";
export const INTENT_LICENSE = "CC0";

/**
 * The open-source repos under github.com/bucket-foundation. `firstIssues` deep-
 * links the "good first issue" label filter so a newcomer lands on tractable
 * work; `prs` is the bare repo for opening a PR.
 */
export type Repo = {
  name: string;
  url: string;
  blurb: string;
  /** Deep link to the repo's "good first issue" label, ready to triage. */
  firstIssues: string;
};

const orgRepo = (name: string) => `${GITHUB_ORG_URL}/${name}`;
const firstIssues = (name: string) =>
  `${orgRepo(name)}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`;

export const REPOS: Repo[] = [
  {
    name: "bucket-foundation",
    url: orgRepo("bucket-foundation"),
    blurb:
      "The site, the canon renderer, the 20 research tools, the academy, and the publish/cite flow. Next.js + TypeScript. Where most front-of-house contributions land.",
    firstIssues: firstIssues("bucket-foundation"),
  },
  {
    name: "research-atlas",
    url: orgRepo("research-atlas"),
    blurb:
      "The reconciled research-economy graph — 73 funders, ~958k grants, ~$658B, ~8.1M rows — and the pipeline that builds it. Open datasets, born citeable.",
    firstIssues: firstIssues("research-atlas"),
  },
  {
    name: "x402-research-gateway",
    url: orgRepo("x402-research-gateway"),
    blurb:
      "Paid research gateway on Base — PubMed, Semantic Scholar, OpenAlex, ClinicalTrials, PubChem, and a feed402-compliant insight tier. The live merchant on the rail.",
    firstIssues: firstIssues("x402-research-gateway"),
  },
  {
    name: "feed402",
    url: orgRepo("feed402"),
    blurb:
      "The open standard for free-to-read, citeable research endpoints over x402. MIT code, CC0-in-intent spec. The protocol every Bucket endpoint speaks.",
    firstIssues: firstIssues("feed402"),
  },
  {
    name: "bucket-mcp",
    url: orgRepo("bucket-mcp"),
    blurb:
      "The Model Context Protocol server that exposes the canon, the atlas, and the tools to AI agents. Bring Bucket into Claude, Cursor, and any MCP client.",
    firstIssues: firstIssues("bucket-mcp"),
  },
];

/**
 * The seven canon branches (the contribute page links each one so a domain
 * expert can jump straight to the branch they can improve). `roman` matches the
 * canon UI numbering; `slug` is the route under /canon/<slug>.
 */
export type CanonBranch = { roman: string; slug: string; name: string };

export const CANON_BRANCHES: CanonBranch[] = [
  { roman: "I", slug: "mathematics", name: "mathematics" },
  { roman: "II", slug: "physics", name: "physics" },
  { roman: "III", slug: "chemistry", name: "chemistry" },
  { roman: "IV", slug: "information", name: "information" },
  { roman: "V", slug: "biophysics", name: "biophysics" },
  { roman: "VI", slug: "cosmology", name: "cosmology" },
  { roman: "VII", slug: "mind", name: "mind" },
];

/** Prefilled "I'd like to contribute" email CTA (reuses the one contact knob). */
export const CONTRIBUTE_MAILTO = mailto(
  "Contributing to bucket.foundation",
  "Hi — I'd like to contribute to bucket.foundation.\n\n" +
    "I can help with (delete as needed): primary research / claims for the canon · " +
    "code on the open-source repos · a new or improved research tool · " +
    "improving an existing canon branch · using/citing the datasets.\n\n" +
    "A bit about me:\n",
);

/** The "cite this" snippet shown on the page (kept in config so it stays in sync). */
export const ATLAS_CITATION =
  "Dichio, G. (Bucket Foundation). research-atlas: the global research-economy graph. " +
  `Zenodo. ${ZENODO_DOI_URL}`;
