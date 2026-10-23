const nextConfig = {
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/d8/index.html" }] };
  },
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/photon/**": ["./data/photons.json.gz"],
    "/word/**": ["./data/photons.json.gz"],
  },
};

module.exports = nextConfig;
