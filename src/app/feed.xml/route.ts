import { BRANCHES } from "@/lib/canon";
import { publicWhatsNew } from "@/lib/whats-new/cached";
import { feedItemXml, feedItems, type FeedItem } from "@/lib/whats-new/public";

export const dynamic = "force-dynamic";

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

type Item = Omit<FeedItem, "categories">;

async function items(): Promise<FeedItem[]> {
  const now = new Date().toISOString();
  const top: Item[] = [
    { title: "bucket.foundation — build the past. build history. the new renaissance.", path: "/", desc: DESC, date: now },
    { title: "The Canon — 8 branches of foundations", path: "/canon", desc: "Mathematics, physics, chemistry, information, biophysics, cosmology, mind, earth.", date: now },
    { title: "Manifesto", path: "/manifesto", desc: "AI + foundations + a small number of brilliant humans = the next layer of reality.", date: now },
    { title: "feed402 / x402 Protocol", path: "/protocol", desc: "Open standard for paid research endpoints over x402 on Base.", date: now },
    { title: "Protocol Envelope", path: "/protocol/envelope", desc: "Citeable envelope: data + citation + receipt.", date: now },
    { title: "cite-forever license v0.1", path: "/cite-forever/v0.1", desc: "Free to read. Paid to cite. Every citation routes fees to the author, forever.", date: now },
    { title: "Build on bucket", path: "/build", desc: "Submit foundations through Research OS. Reviewed work becomes canon; citations settle over x402 on Base.", date: now },
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

  const plain = [...top, ...branch, ...figures].map((it) => ({ ...it, categories: [] }));
  return [...plain, ...feedItems(await publicWhatsNew())];
}

export async function GET() {
  const now = new Date().toUTCString();
  const entries = (await items()).map((it) => feedItemXml(it, now, BASE)).join("\n    ");

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
    headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" },
  });
}
