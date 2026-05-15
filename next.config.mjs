/** @type {import('next').NextConfig} */
const SECURITY_HEADERS = [
  { key: "X-Robots-Tag", value: "all" },
  {
    key: "Link",
    value:
      '</cite-forever/v0.1>; rel="license"; title="bucket.foundation cite-forever v0.1", </.well-known/feed402.json>; rel="alternate"; type="application/json"; title="feed402"',
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
];

const nextConfig = {
  // Pre-existing lint warnings in unrelated files (chat, etc.) shouldn't
  // block production builds. CI/local lint stays separate.
  eslint: { ignoreDuringBuilds: true },

  // The /api/canon/search Lambda + the canon-graph + canon-evidence libs
  // read files from _intake/ via fs.readFileSync at runtime. Next.js's
  // file tracer can't see dynamic paths so we whitelist them explicitly,
  // otherwise Vercel ships the Lambda without those files and the
  // search index comes back empty (HTTP 503 index_empty).
  outputFileTracingIncludes: {
    "/api/canon/search": [
      "./_intake/embeddings-v2/claims-vectors.npy",
      "./_intake/embeddings-v2/clusters.json",
      "./_intake/embeddings-v2/multi-branch-graph.json",
      "./_intake/embeddings/claim-evidence.jsonl",
      "./bucket-canon/**",
    ],
    "/api/canon/debugfs": [
      "./_intake/embeddings-v2/claims-vectors.npy",
      "./_intake/embeddings/claim-evidence.jsonl",
      "./bucket-canon/**",
    ],
    "/canon/graph": [
      "./_intake/connections/graph.json",
      "./_intake/connections/centrality.json",
    ],
    "/canon/claims/[concept]/[slug]": [
      "./_intake/embeddings/claim-evidence.jsonl",
      "./bucket-canon/**",
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        source: "/api/research",
        headers: [
          { key: "X-Robots-Tag", value: "all" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
