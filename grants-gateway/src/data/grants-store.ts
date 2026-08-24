/**
 * Grants data layer.
 *
 * v0.1 ships an in-memory fixture with 5 plausible-shape (fake-content)
 * grants so all three endpoints work end-to-end. The real ingestion
 * (grants.gov XML extract, NIH RePORTER API, NSF awards, IRS 990-PF
 * "Grants Paid" parse) is bead bkt-ugw (P2).
 *
 * TODO(bkt-ugw): replace MemoryGrantsStore with PostgresGrantsStore,
 * loading from `data/grants/*.parquet` produced by the ingestion pipeline.
 * The interface is the contract, keep it stable.
 */

import type { Grant, GrantQuery } from "../types.js";

export interface GrantsStore {
  /** Fetch a single grant by stable id; null if not found. */
  getById(id: string): Promise<Grant | null>;
  /** Structured search. Implementations may use SQL, ES, or in-memory. */
  search(q: GrantQuery): Promise<Grant[]>;
  /** Iterate all grants, used by /insight to score the full set. */
  all(): Promise<Grant[]>;
  /** Stable hex SHA-256 of the corpus (for feed402 §4 corpus_sha256). */
  corpusHash(): Promise<string>;
}

const FIXTURES: Grant[] = [
  {
    id: "grants-gov:HHS-2026-NIH-AG-001",
    title: "Mechanisms of Aging and Geroscience (R01)",
    funder: "NIH / National Institute on Aging",
    source: "grants.gov",
    summary:
      "Hypothesis-driven basic and translational research on biological mechanisms of aging, including mitochondrial function, proteostasis, senescence, and circadian biology.",
    eligibility:
      "Domestic and foreign higher-education institutions; nonprofits with or without 501(c)(3) status; small businesses.",
    topics: ["longevity", "aging", "mitochondria", "biophysics"],
    amount_max_usd: 500_000,
    amount_min_usd: 100_000,
    deadline: "2026-10-05",
    rolling: false,
    canonical_url: "https://www.grants.gov/web/grants/view-opportunity.html?oppId=HHS-2026-NIH-AG-001",
    last_seen_at: "2026-05-01T00:00:00Z",
  },
  {
    id: "nsf-awards:2026-CISE-AI-OPEN-204",
    title: "Open-Source AI Infrastructure for Scientific Discovery",
    funder: "NSF / CISE",
    source: "nsf-awards",
    summary:
      "Supports development of open-source AI infrastructure (datasets, evaluation harnesses, model registries, paid-data protocols) that accelerates scientific research.",
    eligibility:
      "Universities, nonprofits, and consortia. Industry partners eligible as subrecipients only.",
    topics: ["ai", "open-source", "infrastructure", "data-protocols"],
    amount_max_usd: 1_500_000,
    amount_min_usd: 250_000,
    deadline: "2026-09-15",
    rolling: false,
    canonical_url: "https://www.nsf.gov/awardsearch/showAward?AWD_ID=2026-CISE-AI-OPEN-204",
    last_seen_at: "2026-05-01T00:00:00Z",
  },
  {
    id: "irs-990pf:13-1837418:2024:0042",
    title: "Sloan Research Foundations — Foundational Mathematics Grant",
    funder: "Alfred P. Sloan Foundation",
    source: "irs-990pf",
    summary:
      "Unrestricted research grants to early-career mathematicians working on foundational problems in geometry, number theory, and category theory.",
    eligibility: "Tenure-track faculty at US/Canadian PhD-granting institutions, within 6 years of PhD.",
    topics: ["mathematics", "foundations", "research"],
    amount_max_usd: 75_000,
    amount_min_usd: 75_000,
    deadline: null,
    rolling: true,
    canonical_url: "https://projects.propublica.org/nonprofits/organizations/131837418",
    last_seen_at: "2026-05-01T00:00:00Z",
  },
  {
    id: "grants-gov:NSF-26-512-PHY",
    title: "Foundations of Quantum Information Science",
    funder: "NSF / Physics",
    source: "grants.gov",
    summary:
      "Theoretical and experimental research on the physical foundations of quantum information, including measurement theory and decoherence.",
    eligibility: "Accredited US institutions of higher education and affiliated nonprofits.",
    topics: ["physics", "quantum", "foundations", "information"],
    amount_max_usd: 800_000,
    amount_min_usd: 150_000,
    deadline: "2026-12-01",
    rolling: false,
    canonical_url: "https://www.grants.gov/web/grants/view-opportunity.html?oppId=NSF-26-512-PHY",
    last_seen_at: "2026-05-01T00:00:00Z",
  },
  {
    id: "nih-reporter:5R01AG099999-02",
    title: "Citation Infrastructure for Open Biomedical Knowledge",
    funder: "NIH / NLM",
    source: "nih-reporter",
    summary:
      "Develops public infrastructure for paid-once-citeable-forever scientific records — payment rails, mint-to-author flows, and machine-readable citation envelopes.",
    eligibility: "501(c)(3) nonprofits with prior open-source software releases.",
    topics: ["open-science", "citation", "data-protocols", "nonprofit"],
    amount_max_usd: 350_000,
    amount_min_usd: 50_000,
    deadline: "2026-07-20",
    rolling: false,
    canonical_url: "https://reporter.nih.gov/project-details/5R01AG099999-02",
    last_seen_at: "2026-05-01T00:00:00Z",
  },
];

export class MemoryGrantsStore implements GrantsStore {
  constructor(private readonly rows: Grant[] = FIXTURES) {}

  async getById(id: string): Promise<Grant | null> {
    return this.rows.find((g) => g.id === id) ?? null;
  }

  async all(): Promise<Grant[]> {
    return [...this.rows];
  }

  async search(q: GrantQuery): Promise<Grant[]> {
    const topic = q.topic?.toLowerCase();
    const funder = q.funder?.toLowerCase();
    const eligibility = q.eligibility?.toLowerCase();
    const beforeTs = q.deadline_before ? Date.parse(q.deadline_before) : null;

    const out = this.rows.filter((g) => {
      if (topic) {
        const haystack = [g.summary, ...g.topics, g.title].join(" ").toLowerCase();
        if (!haystack.includes(topic)) return false;
      }
      if (funder && !g.funder.toLowerCase().includes(funder)) return false;
      if (eligibility && !g.eligibility.toLowerCase().includes(eligibility)) return false;
      if (q.min_amount != null && (g.amount_max_usd ?? 0) < q.min_amount) return false;
      if (q.max_amount != null && (g.amount_min_usd ?? Infinity) > q.max_amount) return false;
      if (beforeTs != null) {
        if (g.rolling) {
          // rolling = always open, counts as "before any date"
        } else if (!g.deadline || Date.parse(g.deadline) > beforeTs) {
          return false;
        }
      }
      return true;
    });

    return q.limit ? out.slice(0, q.limit) : out;
  }

  async corpusHash(): Promise<string> {
    // Lazy: stable hash over sorted ids. Real impl SHA-256s the body too.
    const sorted = [...this.rows].map((g) => g.id).sort();
    // tiny FNV-1a over the joined string, hex-padded; replaced when we move
    // to a real persisted corpus.
    let h = 0x811c9dc5;
    const s = sorted.join("\n");
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(64, "0");
  }
}
