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
  eslint: { ignoreDuringBuilds: false },

  outputFileTracingIncludes: {
    "/api/canon/search": [
      "./_intake/embeddings-v2/claims-vectors.npy",
      "./_intake/embeddings-v2/clusters.json",
      "./_intake/embeddings-v2/multi-branch-graph.json",
      "./_intake/embeddings/claim-evidence.jsonl",
      "./bucket-canon/*/sub-claims/**/*.md",
    ],
    "/canon/graph": [
      "./_intake/connections/graph.json",
      "./_intake/connections/centrality.json",
    ],
    "/excerpts/[concept]/[slug]": [
      "./_intake/embeddings/claim-evidence.jsonl",
      "./bucket-canon/*/sub-claims/**/*.md",
    ],
  },

  async redirects() {
    return [
      { source: "/canon/claims", destination: "/excerpts", permanent: true },
      { source: "/canon/claims/:concept", destination: "/excerpts/:concept", permanent: true },
      { source: "/canon/claims/:concept/:slug", destination: "/excerpts/:concept/:slug", permanent: true },
      { source: "/knowledge", destination: "/", permanent: true },
      { source: "/library", destination: "/", permanent: true },
      { source: "/assets", destination: "/", permanent: true },
      { source: "/chat", destination: "/", permanent: true },
    ];
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
