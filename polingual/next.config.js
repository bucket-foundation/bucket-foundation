/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxy photon API calls to bucket.foundation so polingual can read the
  // shared photon substrate without needing the sqlite file on its own
  // deployment.
  async rewrites() {
    return [
      {
        source: "/api/photon/:path*",
        destination: "https://www.bucket.foundation/api/photon/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
