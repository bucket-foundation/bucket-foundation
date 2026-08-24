// /canon/[slug]/feed.xml, Atom 1.0 feed of milestones filtered by branch.

import whatsNewData from "../../../../../data/whats-new.json";
import { getBranches } from "@/lib/canon-fs";

export const dynamic = "force-static";

const BASE = "https://www.bucket.foundation";
const REPO = "https://github.com/bucket-foundation/bucket-foundation";

type Milestone = {
  id: string;
  date: string;
  category: string;
  branch: string | null;
  title: string;
  summary: string;
  commit: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generateStaticParams() {
  return getBranches().map((b) => ({ slug: b.slug }));
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const branches = getBranches();
  const branch = branches.find((b) => b.slug === params.slug);
  const dirMatch = branch?.dir;
  const entries = ((whatsNewData as any).entries as Milestone[])
    .filter((m) => m.branch && (m.branch === dirMatch || m.branch === params.slug))
    .sort((a, b) => b.date.localeCompare(a.date));

  const updated = entries[0]?.date
    ? new Date(entries[0].date).toISOString()
    : new Date().toISOString();

  const items = entries.map((m) => `
  <entry>
    <id>${BASE}/canon/${params.slug}#${m.id}</id>
    <title>${esc(m.title)}</title>
    <updated>${new Date(m.date).toISOString()}</updated>
    <link href="${REPO}/commit/${m.commit}" rel="alternate"/>
    <category term="${esc(m.category)}"/>
    <summary>${esc(m.summary)}</summary>
  </entry>`).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>bucket.foundation · ${esc(branch?.name || params.slug)} · canon feed</title>
  <id>${BASE}/canon/${params.slug}/feed.xml</id>
  <link href="${BASE}/canon/${params.slug}/feed.xml" rel="self"/>
  <link href="${BASE}/canon/${params.slug}" rel="alternate"/>
  <updated>${updated}</updated>
${items}
</feed>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/atom+xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
