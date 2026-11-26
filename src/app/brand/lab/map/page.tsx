import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Repo Map", robots: { index: false } };

type Box = { name: string; size: string; items: string[]; tone?: "keep" | "move" | "cut" };

const ROUTES_BEFORE: Box[] = [
  { name: "Foundation pages", size: "8 routes", items: ["/about 66", "/mission 514", "/manifesto 25", "/governance 25", "/terms 95", "/privacy 136", "/support 210", "/whats-new 572"] },
  { name: "Learning pages", size: "7 routes", items: ["/learn 834", "/academy 98", "/ladder 212", "/explore 1637", "/earth 836", "/sacred-history 464", "/build 305"] },
  { name: "Canon pages", size: "18 routes", items: ["/canon + 9 subroutes", "/excerpts + 2", "/cite-forever/v0.1 258", "/protocol + 2 876", "/contributors + 1 213", "/contribute 391"] },
  { name: "Account pages", size: "9 routes", items: ["/account 125", "/settings 91", "/sign-in 421", "/access 292", "/consent/parent 83", "/verify 361", "/m/[handle]", "/s/[[...kind]]", "/auth 2"] },
  { name: "App download", size: "3 routes", items: ["/download 514", "/device 136", "/demo 27"] },
  { name: "Research", size: "107 routes", items: ["/research 66 routes", "/research-os 41 routes"] },
  { name: "Other", size: "18 routes", items: ["/admin 12", "/kruse + search 679", "/internal/plans 2", "/decks", "/brand 4"] },
  { name: "API", size: "205 routes", items: ["academy 65", "research-os 46", "research 43", "whats-new 7", "polingual 7", "cron 7", "admin 5", "+17 small groups"] },
];

const ROUTES_AFTER: Box[] = [
  { name: "/about", size: "1 page, 4 sections", tone: "move", items: ["#mission from /mission", "#manifesto from /manifesto", "#governance from /governance", "#changelog from /whats-new"] },
  { name: "/legal", size: "1 page", tone: "move", items: ["#terms from /terms", "#privacy from /privacy", "#support from /support"] },
  { name: "/learn", size: "1 hub", tone: "move", items: ["/learn/academy", "/learn/ladder", "/learn/explore", "/learn/earth", "/learn/sacred-history", "/learn/build"] },
  { name: "/canon", size: "1 hub", tone: "move", items: ["/canon/excerpts", "/canon/protocol", "/canon/cite", "/canon/contributors", "/canon/contribute"] },
  { name: "/account", size: "1 hub", tone: "move", items: ["/account/settings", "/account/sign-in", "/account/access", "/account/verify", "/account/consent", "/m/[handle] stays"] },
  { name: "/research-os", size: "app", tone: "keep", items: ["/research-os 41", "/research 66 stays as published research"] },
  { name: "Polingual", size: "outbound link", tone: "cut", items: ["/download, /device, /demo redirect to polingual.com"] },
  { name: "Dev only", size: "never shipped", tone: "cut", items: ["/brand/lab", "/internal/plans", "/decks"] },
];

const REPO_BEFORE: Box[] = [
  { name: "Site code", size: "1,294 files, 25M", items: ["src", "public 2,476 files 199M", "packages: bkt, bkt-ui, ros-contract", "scripts 766", "tests", "supabase"] },
  { name: "Apps", size: "~1,300 files, 51M", items: ["apple 972", "android 276", "desktop 20", "packages/bkt-desktop", "packages/bkt-mobile", "packages/polingual-desktop"] },
  { name: "Polingual", size: "~850 files, 21M", items: ["polingual 840", "polingual-site 5", "polyglot 1"] },
  { name: "Research data", size: "~127,000 files, 4.6G", items: ["archaeology 84,152 / 1.5G", "pubmed 16,429", "learning 11,383", "yt 5,974 / 506M", "openalex-fanout 5,055 / 989M", "openalex 1,206 / 1.0G", "_intake 1,637", "blog 1,638", "gutenberg 414", "arxiv 359", "wikisource 354", "quantum 839", "archive 795"] },
  { name: "Canon and papers", size: "~1,150 files", items: ["bucket-canon 892", "papers 157", "canon-figures 29", "lean 36", "manifesto-source 7", "museum 180"] },
  { name: "Ops and grants", size: "~110 files", items: ["grants-gateway 27", "grants-targets 13", "nonprofit-application 17", "gtm 9", "decks 38", "reports 9", "kruse-pitch 2"] },
  { name: "Brand", size: "1,174 files, 56M", items: ["brand", "figma-export 20"] },
  { name: "Old GitHub repos", size: "6 repos", items: ["gianyrox/bucket", "bucket-app", "bucket-landing", "bucket-docs", "bucketGovGrants", "polingual-site"] },
];

const REPO_AFTER: Box[] = [
  { name: "bucket-foundation", size: "site, ~4,500 files", tone: "keep", items: ["src", "public", "packages/bkt, bkt-ui, ros-contract", "scripts", "tests", "supabase", "brand"] },
  { name: "bucket-apps", size: "new repo", tone: "move", items: ["apple", "android", "desktop", "bkt-desktop", "bkt-mobile"] },
  { name: "polingual", size: "new repo", tone: "move", items: ["polingual", "polingual-site", "polingual-desktop", "polyglot"] },
  { name: "bucket-data", size: "new repo or bucket storage", tone: "move", items: ["archaeology", "pubmed", "openalex*", "yt", "learning", "_intake", "gutenberg", "arxiv", "wikisource", "quantum", "archive", "blog"] },
  { name: "bucket-canon", size: "new repo", tone: "move", items: ["bucket-canon", "canon-figures", "papers", "lean", "manifesto-source", "museum"] },
  { name: "bucket-ops", size: "private repo", tone: "move", items: ["grants-*", "nonprofit-application", "gtm", "decks", "reports", "kruse-pitch"] },
  { name: "Archive on GitHub", size: "6 repos", tone: "cut", items: ["bucket", "bucket-app", "bucket-landing", "bucket-docs", "bucketGovGrants", "polingual-site"] },
];

const CHROME_BEFORE: Box[] = [
  { name: "Footers", size: "15", items: ["FooterV3", "SiteFooter slim", "FooterVersion", "12 page-local <footer> tags: canon/graph, canon/bridges, earth, excerpts, kruse/search, m/[handle], sacred-history, verify, research-os x5"] },
  { name: "Headers", size: "1", items: ["HeaderV3"] },
];

const CHROME_AFTER: Box[] = [
  { name: "SiteFooter", size: "1 component", tone: "keep", items: ["variant full", "variant slim for / and app pages", "nav built from one route list"] },
  { name: "Page sources blocks", size: "<aside>", tone: "move", items: ["the 12 page-local footers become a Sources block"] },
  { name: "SiteHeader", size: "1", tone: "keep", items: ["nav built from the same route list"] },
];

const TONE = { keep: "var(--bk-success)", move: "var(--bk-link)", cut: "var(--bk-danger)" } as const;

function Column({ title, boxes }: { title: string; boxes: Box[] }) {
  return (
    <div className="flex-1 min-w-0">
      <h3 className="font-mono text-xs uppercase tracking-widest mb-3 text-[color:var(--bk-muted)]">{title}</h3>
      <div className="grid gap-3">
        {boxes.map((b) => (
          <div key={b.name} className="rounded border bg-[color:var(--bk-card)] p-3" style={{ borderColor: b.tone ? TONE[b.tone] : "var(--bk-line)", borderLeftWidth: b.tone ? 4 : 1 }}>
            <div className="flex justify-between gap-2 text-sm font-semibold"><span>{b.name}</span><span className="font-mono text-xs text-[color:var(--bk-muted)]">{b.size}</span></div>
            <ul className="mt-1 flex flex-wrap gap-1">
              {b.items.map((i) => <li key={i} className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[color:var(--bk-surface)]">{i}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pair({ title, before, after }: { title: string; before: Box[]; after: Box[] }) {
  return (
    <section className="mb-14">
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      <div className="flex flex-col md:flex-row gap-6">
        <Column title="Before" boxes={before} />
        <Column title="After" boxes={after} />
      </div>
    </section>
  );
}

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="max-w-7xl mx-auto px-4 py-10 text-[color:var(--bk-text)]">
      <h1 className="text-3xl font-semibold mb-2">Repo Map</h1>
      <p className="font-mono text-xs mb-3 text-[color:var(--bk-muted)]">143,893 tracked files · 174 page routes · 205 API routes · 6 packages · 15 footers. Numbers after a route are lines of code.</p>
      <p className="font-mono text-xs mb-10 flex gap-4">
        <span style={{ color: TONE.keep }}>■ keep</span><span style={{ color: TONE.move }}>■ merge or move</span><span style={{ color: TONE.cut }}>■ cut or archive</span>
      </p>
      <Pair title="Routes" before={ROUTES_BEFORE} after={ROUTES_AFTER} />
      <Pair title="Footers and headers" before={CHROME_BEFORE} after={CHROME_AFTER} />
      <Pair title="Repos" before={REPO_BEFORE} after={REPO_AFTER} />
    </main>
  );
}
