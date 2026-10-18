const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/photon/**": ["./data/photons.json.gz"],
    "/word/**": ["./data/photons.json.gz"],
  },
};

module.exports = nextConfig;
