import { BRANCHES } from "@/lib/canon";

export const dynamic = "force-static";

const BASE = "https://www.bucket.foundation";
const TITLE = "bucket.foundation — the canon";
const DESC =
  "Axioms, laws, first principles. Free to read. Paid to cite. A nonprofit canon of foundations across eight branches.";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type Item = {
  title: string;
  path: string;
  desc: string;
  date: string; // ISO
};

function items(): Item[] {
  const now = new Date().toISOString();
  const top: Item[] = [
    { title: "bucket.foundation — build the past. build history. the new renaissance.", path: "/", desc: DESC, date: now },
    { title: "The Canon — 8 branches of foundations", path: "/canon", desc: "Mathematics, physics, chemistry, information, biophysics, cosmology, mind, earth.", date: now },
    { title: "Manifesto", path: "/manifesto", desc: "AI + foundations + a small number of brilliant humans = the next layer of reality.", date: now },
    { title: "feed402 / x402 Protocol", path: "/protocol", desc: "Open standard for paid research endpoints over x402 on Base.", date: now },
    { title: "Protocol Envelope", path: "/protocol/envelope", desc: "Citeable envelope: data + citation + receipt.", date: now },
    { title: "cite-forever license v0.1", path: "/cite-forever/v0.1", desc: "Free to read. Paid to cite. Every citation routes fees to the author, forever.", date: now },
    { title: "Build on bucket", path: "/build", desc: "Mint foundations as Story Protocol IP NFTs. Permanent citation over x402.", date: now },
    { title: "Learn", path: "/learn", desc: "How to use bucket with an AI — Claude.ai, ChatGPT, Perplexity.", date: now },
    { title: "Governance", path: "/governance", desc: "Nonprofit governance, conflict-of-interest disclosure, 501(c)(3) status.", date: now },
    { title: "Kruse corpus (biophysics partial source)", path: "/kruse", desc: "Jack Kruse corpus — 460 posts, one partial source for the biophysics branch.", date: now },
  ];

  const branch: Item[] = BRANCHES.map((b) => ({
    title: `Canon · ${b.name} — ${b.note}`,
    path: `/canon/${b.slug}`,
    desc: b.thesis,
    date: now,
  }));

  const figures: Item[] = BRANCHES.flatMap((b) =>
    b.figures.map((f) => ({
      title: `${f.name} (${b.name})`,
      path: `/canon/${b.slug}/figures/${f.slug}`,
      desc: `${f.note} — ${f.works} works in the canon.`,
      date: now,
    }))
  );

  return [...top, ...branch, ...figures];
}

export async function GET() {
  const now = new Date().toUTCString();
  const entries = items()
    .map((it) => {
      const url = `${BASE}${it.path}`;
      return `<item>
      <title>${esc(it.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${now}</pubDate>
      <description>${esc(it.desc)}</description>
    </item>`;
    })
    .join("\n    ");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(TITLE)}</title>
    <link>${BASE}</link>
    <description>${esc(DESC)}</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml" />
    ${entries}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
