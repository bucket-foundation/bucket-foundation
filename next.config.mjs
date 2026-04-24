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
