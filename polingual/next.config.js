const path = require("path");

const SYNC_BASE = (process.env.POLINGUAL_SYNC_BASE || "https://www.bucket.foundation").replace(/\/$/, "");

const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/d8/index.html" }, { source: "/es", destination: "/d8/es.html" }],
      afterFiles: [
        { source: "/api/academy/:path*", destination: `${SYNC_BASE}/api/academy/:path*` },
        { source: "/academy-app/:path*", destination: `${SYNC_BASE}/academy-app/:path*` },
      ],
    };
  },
  reactStrictMode: true,
  experimental: { externalDir: true },
  outputFileTracingIncludes: {
    "/api/photon/**": ["./data/photons.json.gz"],
    "/word/**": ["./data/photons.json.gz"],
  },
  webpack(config) {
    config.resolve.modules = [path.join(__dirname, "node_modules"), "node_modules"];
    return config;
  },
};

module.exports = nextConfig;
