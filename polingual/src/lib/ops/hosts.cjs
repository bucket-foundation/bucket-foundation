const ADMIN_HOSTS = require("./admin-hosts.json");

function adminHosts(env = process.env) {
  const extra = (env.POLINGUAL_ADMIN_DEV_HOST || "").trim().toLowerCase();
  return extra ? [...ADMIN_HOSTS, extra] : [...ADMIN_HOSTS];
}

function adminRewrites(env = process.env) {
  return adminHosts(env).flatMap((value) => [
    { source: "/", has: [{ type: "host", value }], destination: "/ops" },
    { source: "/:path((?!ops(?:/|$)|_next/|api/|media/).+)", has: [{ type: "host", value }], destination: "/ops/:path" },
  ]);
}

module.exports = { adminHosts, adminRewrites };
