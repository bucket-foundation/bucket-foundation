# INDEXING RUNBOOK — bucket.foundation

> Goal: bucket.foundation discoverable in Google, Bing, DuckDuckGo, Kagi,
> Brave, Perplexity, Claude, ChatGPT, Gemini within 7 days of launch.

Last updated: 2026-04-24.

## What ships in code (already live)

- `public/robots.txt` (via `src/app/robots.ts`) — allow-list every major crawler + AI bot
- `public/sitemap.xml` (via `src/app/sitemap.ts`) — all static pages + canon branches + figures
- `public/feed.xml` (via `src/app/feed.xml/route.ts`) — RSS feed for every major page
- `public/llms.txt`, `public/llms-full.txt`, `public/ai.txt` — AI agent discovery
- `public/.well-known/feed402.json`, `ai-plugin.json`, `mcp.json`
- `GET /api/jsonld` — aggregated schema.org JSON-LD across the site
- `GET /api/indexnow/ping` — one-shot fan-out to Bing / Yandex / Seznam / Naver
- IndexNow ownership token: `public/b254d06bf09a600cccd29a489b7a0bb90097fd22c976105b9edcbb77b6fc56f2.txt`
- JSON-LD `@graph` in `<head>` on every page (Organization + WebSite + CreativeWork + SoftwareApplication)
- `<link rel="alternate">` for RSS, Atom, JSON-LD, feed402

## Automation (run from repo root)

```bash
# Push URLs to Bing / Yandex / Seznam / Naver
./scripts/indexnow-ping.sh

# Archive every page on archive.org (rate-limited, ~1 URL / 2s)
./scripts/archive-org-ping.sh

# Push URLs to Google (requires GOOGLE_INDEXING_SA_JSON env — see below)
node ./scripts/google-indexnow.js
```

Re-run after every major content change (new canon branch, new figure,
new protocol doc).

---

## Manual actions — what Gian has to do

Priorities: **P0 = do now, P1 = this week, P2 = nice-to-have**.

### P0 — Do first (highest leverage, 30 min total)

1. **Google Search Console** *(5 min)* — https://search.google.com/search-console
   - Add property: `bucket.foundation` (domain-level, DNS TXT)
   - Submit `https://www.bucket.foundation/sitemap.xml`
   - Request indexing on the top 5 URLs manually: `/`, `/canon`, `/manifesto`, `/protocol`, `/cite-forever/v0.1`
   - Copy verification token → paste into `src/app/layout.tsx` → `verification.google`

2. **Google Indexing API service account** *(10 min)* — https://developers.google.com/search/apis/indexing-api/v3/prereqs
   - GCP console → create / pick project → enable "Indexing API"
   - IAM → create service account → download JSON key
   - GSC → Settings → Users & permissions → add service-account email as **Owner**
   - Export: `export GOOGLE_INDEXING_SA_JSON="$(cat /path/to/sa.json)"`
   - Run `node scripts/google-indexnow.js`

3. **Bing Webmaster Tools** *(5 min)* — https://www.bing.com/webmasters
   - "Import from GSC" — one-click
   - Confirm IndexNow key auto-detected at `/b254d06bf…c56f2.txt`
   - Also powers DuckDuckGo (which is Bing + their own crawler)

### P1 — This week

4. **Kagi submit** — https://kagi.com/url — paste homepage; free
5. **Brave Search** — https://search.brave.com/help/webmaster-tools — submit site; independent index, growing fast
6. **Anthropic ClaudeBot** — no public inclusion form as of 2026-04. Respects `robots.txt` (we already allow). Action: `WebSearch "Anthropic ClaudeBot inclusion request 2026"` quarterly; register if a form appears. Meanwhile: drive backlinks (items 10-12) so Claude's web tool *finds* us via normal search.
7. **OpenAI / GPTBot** — auto-discovers via `robots.txt` (already allowed). No accelerated path exposed in 2026-04. No action.
8. **Perplexity / PerplexityBot** — auto-discovers via `robots.txt` (already allowed). Submit homepage to their "Discover" via any organic-post path (X, Reddit, HN). No direct form.
9. **archive.org Wayback** — `./scripts/archive-org-ping.sh` (already run 2026-04-24). Re-run monthly.

### P2 — Backlinks drive indexation, run as content polish completes

10. **Show HN** — https://news.ycombinator.com/submit — "Bucket: free to read, paid to cite research canon on x402"
11. **Product Hunt** — https://www.producthunt.com/ — schedule launch; DeSci + open-science angle
12. **Reddit** — r/DeSci, r/opensource, r/science (organic, not spam) — one link + thoughtful comment thread
13. **GitHub README polish** — on `bucket-foundation/bucket-foundation` + `bucket-foundation/bucket-mcp`, prominent link to https://www.bucket.foundation, `/llms.txt`, `/feed.xml`
14. **npm package homepage** — verify `@bucket-foundation/mcp` `package.json` has `homepage: https://www.bucket.foundation`
15. **Wikipedia (careful)** — once nonprofit filing is live and citeable, a stub page on the feed402 protocol or cite-forever license (NOT bucket.foundation itself — that's autobiography and gets reverted)

### P2 — AI agent ecosystem

16. **Claude desktop / mcp registry** — `/.well-known/mcp.json` is live. Submit the MCP server to Anthropic's public MCP registry once it exists (watch anthropic.com/news).
17. **OpenAI GPT store** — create a "bucket.foundation research" Custom GPT pointing to the API; drives agent-side awareness even if GPTBot hasn't crawled yet.

---

## Verification checklist (re-run weekly for first month)

```bash
# All core SEO endpoints must 200 with the right content-type
for path in /robots.txt /sitemap.xml /feed.xml /llms.txt /ai.txt \
            /.well-known/feed402.json /.well-known/mcp.json; do
  printf '%-40s ' "$path"
  curl -sI "https://www.bucket.foundation$path" | awk '/^HTTP|^content-type/'
done

# Google coverage
# → https://search.google.com/search-console (Pages → Indexed)

# Test AI discovery
# → Claude.ai web search: "bucket.foundation canon"
# → ChatGPT browse: "site:bucket.foundation"
# → Perplexity: "bucket.foundation cite-forever"
```

---

## IndexNow key provenance

Owner-verification token is a 64-char hex string generated 2026-04-24 via
`python3 -c "import secrets; print(secrets.token_hex(32))"`.

- **Key location**: `/home/gian/agfarms/bucket-foundation/public/b254d06bf09a600cccd29a489b7a0bb90097fd22c976105b9edcbb77b6fc56f2.txt`
- **Served at**: `https://www.bucket.foundation/b254d06bf09a600cccd29a489b7a0bb90097fd22c976105b9edcbb77b6fc56f2.txt`
- **Source of truth**: `src/lib/indexnow.ts`

Rotate by regenerating the key, renaming the public file, updating
`src/lib/indexnow.ts`, and re-running `./scripts/indexnow-ping.sh`.
