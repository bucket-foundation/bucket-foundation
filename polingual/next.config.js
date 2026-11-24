const path = require("path");
const SITE_LANGS = require("./src/lib/site-langs.json");

const SYNC_BASE = (process.env.POLINGUAL_SYNC_BASE || "https://www.bucket.foundation").replace(/\/$/, "");

const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", has: [{ type: "host", value: "beta.polingual.com" }], destination: "/beta" }, { source: "/", destination: "/d8/index.html" }, ...SITE_LANGS.map((l) => ({ source: `/${l}`, destination: `/d8/${l}.html` }))],
      afterFiles: [
        { source: "/api/academy/:path*", destination: `${SYNC_BASE}/api/academy/:path*` },
        { source: "/api/polingual/checkout", destination: `${SYNC_BASE}/api/polingual/checkout` },
        { source: "/api/polingual/portal", destination: `${SYNC_BASE}/api/polingual/portal` },
        { source: "/academy-app/:path*", destination: `${SYNC_BASE}/academy-app/:path*` },
      ],
    };
  },
  async redirects() {
    return [
      { source: "/word/:id(photon.*)", destination: "/photon/:id", permanent: true },
      { source: "/admin", destination: `${SYNC_BASE}/admin/growth`, permanent: false },
      { source: "/:path*", has: [{ type: "host", value: "admin.polingual.com" }], destination: `${SYNC_BASE}/admin/growth`, permanent: false },
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

module.exports = nextConfig;
