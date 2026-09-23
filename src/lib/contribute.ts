import { GITHUB_ORG_URL, CONTACT_EMAIL, mailto } from "./support";

export { GITHUB_ORG_URL, CONTACT_EMAIL };

export const ZENODO_DOI = "10.5281/zenodo.20774322";
export const ZENODO_DOI_URL = `https://doi.org/${ZENODO_DOI}`;

export const DATA_LICENSE = "CC-BY-4.0";
export const DATA_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";

export const CODE_LICENSE = "MIT";
export const INTENT_LICENSE = "CC0";

export type Repo = {
  name: string;
  url: string;
  blurb: string;
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
      "The reconciled research-economy graph, 73 funders, ~958k grants, ~$658B, ~8.1M rows, and the pipeline that builds it. Open datasets, born citeable.",
    firstIssues: firstIssues("research-atlas"),
  },
  {
    name: "x402-research-gateway",
    url: orgRepo("x402-research-gateway"),
    blurb:
      "Paid research gateway on Base, PubMed, Semantic Scholar, OpenAlex, ClinicalTrials, PubChem, and a feed402-compliant insight tier. The live merchant on the rail.",
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

export const CONTRIBUTE_MAILTO = mailto(
  "Contributing to bucket.foundation",
  "Hi, I'd like to contribute to bucket.foundation.\n\n" +
    "I can help with (delete as needed): primary research / claims for the canon · " +
    "code on the open-source repos · a new or improved research tool · " +
    "improving an existing canon branch · using/citing the datasets.\n\n" +
    "A bit about me:\n",
);

export const ATLAS_CITATION =
  "Dichio, G. (Bucket Foundation). research-atlas: the global research-economy graph. " +
  `Zenodo. ${ZENODO_DOI_URL}`;
