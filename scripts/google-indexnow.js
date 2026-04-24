#!/usr/bin/env node
/* eslint-disable */
// Google Indexing API push. Requires Google Cloud service account with
// Indexing API enabled + added as Owner on the GSC property.
//
// Setup:
//   1. GCP console → create project → enable "Indexing API"
//   2. IAM & Admin → service accounts → create → download JSON key
//   3. Google Search Console → Settings → Users & permissions → add
//      the service-account email as Owner
//   4. Put the JSON into .env.local as a single line:
//        GOOGLE_INDEXING_SA_JSON='{"type":"service_account",...}'
//   5. npm i googleapis   # if not already installed
//   6. node scripts/google-indexnow.js
//
// Docs: https://developers.google.com/search/apis/indexing-api/v3/prereqs

const raw = process.env.GOOGLE_INDEXING_SA_JSON;
if (!raw) {
  console.error("GOOGLE_INDEXING_SA_JSON not set. See docs/INDEXING.md.");
  process.exit(1);
}

let google;
try {
  ({ google } = require("googleapis"));
} catch {
  console.error("googleapis not installed. Run: npm i -D googleapis");
  process.exit(1);
}

const sa = JSON.parse(raw);
const BASE = "https://www.bucket.foundation";

async function loadSitemapUrls() {
  const res = await fetch(`${BASE}/sitemap.xml`);
  const xml = await res.text();
  // Handle sitemap index too — fetch children if present
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const urls = [];
  for (const u of locs) {
    if (/sitemap.*\.xml$/i.test(u)) {
      try {
        const child = await (await fetch(u)).text();
        for (const m of child.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.push(m[1]);
      } catch {}
    } else {
      urls.push(u);
    }
  }
  return [...new Set(urls)];
}

(async () => {
  const urls = await loadSitemapUrls();
  console.log(`Loaded ${urls.length} URLs from sitemap.`);

  const jwt = new google.auth.JWT(
    sa.client_email,
    null,
    sa.private_key,
    ["https://www.googleapis.com/auth/indexing"]
  );
  await jwt.authorize();

  const indexing = google.indexing({ version: "v3", auth: jwt });

  let ok = 0, fail = 0;
  for (const url of urls) {
    try {
      await indexing.urlNotifications.publish({
        requestBody: { url, type: "URL_UPDATED" },
      });
      ok++;
      process.stdout.write(".");
    } catch (err) {
      fail++;
      process.stdout.write("x");
      console.error(`\n  ${url}: ${err.message}`);
    }
  }
  console.log(`\nDone. ok=${ok} fail=${fail}`);
})();
