/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /api/photon/* is served by this app's own route handlers
  // (src/app/api/photon/*) which talk to the polingual schema on
  // db.agfarms.dev via PostgREST. No rewrite needed.
};

module.exports = nextConfig;
