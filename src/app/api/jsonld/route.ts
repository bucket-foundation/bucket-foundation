import { NextResponse } from "next/server";
import { BRANCHES } from "@/lib/canon";

export const dynamic = "force-static";

const BASE = "https://www.bucket.foundation";

export async function GET() {
  const graph: any[] = [
    {
      "@type": ["NGO", "Organization", "ResearchOrganization"],
      "@id": `${BASE}#org`,
      name: "bucket.foundation",
      url: BASE,
      logo: `${BASE}/icon.png`,
      nonprofitStatus: "Nonprofit501c3",
      license: `${BASE}/cite-forever/v0.1`,
    },
    {
      "@type": "WebSite",
      "@id": `${BASE}#site`,
      url: BASE,
      name: "bucket.foundation",
      publisher: { "@id": `${BASE}#org` },
    },
    ...BRANCHES.map((b) => ({
      "@type": "CreativeWork",
      "@id": `${BASE}/canon/${b.slug}`,
      name: `Canon · ${b.name}`,
      url: `${BASE}/canon/${b.slug}`,
      description: b.thesis,
      isPartOf: { "@id": `${BASE}#canon` },
      license: `${BASE}/cite-forever/v0.1`,
      isAccessibleForFree: true,
    })),
    ...BRANCHES.flatMap((b) =>
      b.figures.map((f) => ({
        "@type": "Person",
        "@id": `${BASE}/canon/${b.slug}/figures/${f.slug}`,
        name: f.name,
        description: f.note,
        url: `${BASE}/canon/${b.slug}/figures/${f.slug}`,
      }))
    ),
  ];

  return NextResponse.json(
    { "@context": "https://schema.org", "@graph": graph },
    {
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=3600",
        "content-type": "application/ld+json; charset=utf-8",
      },
    }
  );
}
