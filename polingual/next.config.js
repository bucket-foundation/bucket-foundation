const path = require("path");
const SITE_LANGS = require("./src/lib/site-langs.json");
const { syncCorpus } = require("./scripts/sync-corpus.cjs");
const { adminRewrites } = require("./src/lib/ops/hosts.cjs");

const SYNC_PHASES = ["phase-production-build", "phase-development-server"];

const SYNC_BASE = (process.env.POLINGUAL_SYNC_BASE || "https://www.bucket.foundation").replace(/\/$/, "");

const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [...adminRewrites(), { source: "/", has: [{ type: "host", value: "beta.polingual.com" }], destination: "/beta" }, { source: "/", destination: "/d8/index.html" }, ...SITE_LANGS.map((l) => ({ source: `/${l}`, destination: `/d8/${l}.html` }))],
      afterFiles: [
        { source: "/api/academy/:path*", destination: `${SYNC_BASE}/api/academy/:path*` },
        { source: "/api/polingual/checkout", destination: `${SYNC_BASE}/api/polingual/checkout` },
        { source: "/api/polingual/portal", destination: `${SYNC_BASE}/api/polingual/portal` },
      ],
    };
  },
  async headers() {
    return [
      { source: "/academy-app/corpus/:path*", headers: [{ key: "cache-control", value: "public, max-age=86400, s-maxage=31536000" }] },
      { source: "/academy-app/polingual/:path*", headers: [{ key: "cache-control", value: "public, max-age=86400, s-maxage=31536000" }] },
      { source: "/academy-app/audio/:path*", headers: [{ key: "cache-control", value: "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=2592000" }] },
    ];
  },
  async redirects() {
    return [
      { source: "/word/:id(photon.*)", destination: "/photon/:id", permanent: true },
      { source: "/admin", missing: [{ type: "host", value: "admin.polingual.com" }], destination: `${SYNC_BASE}/admin/growth`, permanent: false },
    ];
  },
  reactStrictMode: true,
  experimental: { externalDir: true, globalNotFound: true },
  outputFileTracingIncludes: {
    "/api/photon/**": ["./data/photons.json.gz"],
    "/photon/**": ["./data/photons.json.gz"],
  },
  webpack(config) {
    config.resolve.modules = [path.join(__dirname, "node_modules"), "node_modules"];
    return config;
  },
};

module.exports = Object.assign((phase) => (SYNC_PHASES.includes(phase) ? { ...nextConfig, env: { NEXT_PUBLIC_CORPUS_V: syncCorpus() } } : nextConfig), nextConfig, { SYNC_PHASES });
