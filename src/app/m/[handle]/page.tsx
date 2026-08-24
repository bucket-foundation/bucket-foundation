/**
 * src/app/m/[handle]/page.tsx (bkt-coh)
 * ----------------------------------------------------------------------------
 * The PUBLIC Mastery Profile, bucket.foundation/m/<handle>.
 *
 * The headline differentiator of Bucket Academy (learning/EPIC.md §2): the
 * learning map made into a public, shareable "verifiable digital resume". This
 * is the MVP /-signal phase (MASTERY-PROFILE.md §3.1, Phase 1): a clean
 * screenshot-native page showing the concentric-shell map of mastered concepts
 * across canon branches + a per-branch mastery summary (started/mastered
 * depth Recall→Apply→Derive→Teach, recency, with visible uncertainty) + an
 * evidence-framing placeholder + a "Verify" stub.
 *
 * HARD GUARDRAIL (EPIC.md §5): NO certified/precise numeric rating, no claim of
 * credentialed mastery. Framed throughout as "built by learning over time," an
 * evolving record built from proven work.
 *
 * Privacy: server-rendered with the service-role assembler. Rendered ONLY when
 * the learner has opted in (is_public = true); otherwise notFound(). Minimal PII
 * (handle + optional display name; never the email).
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  assemblePublicProfile,
  type ProgressRow,
  type PublicProfile,
} from "@/lib/academy/profile";
import type { BranchSummary } from "@/lib/academy/mastery";
import MasteryMap from "./MasteryMap";
import CredentialPanel from "./CredentialPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface ProfileRecord {
  user_id: string;
  handle: string;
  display_name: string | null;
  is_public: boolean;
}

/** Service-role fetch of a PUBLIC profile by handle, assembled. Returns null if
 * unconfigured, missing, or private (private == invisible). */
async function fetchPublicProfile(handleRaw: string): Promise<PublicProfile | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  const handle = handleRaw.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9_-]{1,30}[a-z0-9])$/.test(handle)) return null;

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: "bucket" },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await svc
    .from("academy_profiles")
    .select("user_id,handle,display_name,is_public")
    .eq("handle", handle)
    .maybeSingle();
  if (error || !data) return null;
  const rec = data as unknown as ProfileRecord;
  if (!rec.is_public) return null;

  const { data: rows } = await svc
    .from("academy_progress")
    .select("branch,data,updated_at")
    .eq("user_id", rec.user_id);

  return assemblePublicProfile(
    rec.handle,
    rec.display_name,
    (rows as unknown as ProgressRow[]) || []
  );
}

export async function generateMetadata({
  params,
}: {
  params: { handle: string };
}): Promise<Metadata> {
  const profile = await fetchPublicProfile(params.handle);
  if (!profile) {
    return { title: "Mastery Profile · bucket.foundation", robots: { index: false } };
  }
  const name = profile.displayName || profile.handle;
  const title = `${name} · Mastery Profile · Bucket`;
  const desc =
    `${profile.totals.conceptsMastered} concepts mastered across ` +
    `${profile.totals.branchesTouched} canon branch` +
    `${profile.totals.branchesTouched === 1 ? "" : "es"} — a learning record built over time. ` +
    `build the past. build history.`;
  return {
    title,
    description: desc,
    alternates: { canonical: `/m/${profile.handle}` },
    openGraph: {
      title,
      description: desc,
      url: `https://www.bucket.foundation/m/${profile.handle}`,
      type: "profile",
    },
    twitter: { card: "summary_large_image", title, description: desc },
  };
}

const DEPTH_RANK: Record<string, number> = {
  "Not started": 0,
  Recall: 1,
  Apply: 2,
  Derive: 3,
  "Teach-back": 4,
};
const DEPTH_LADDER = ["Recall", "Apply", "Derive", "Teach-back"];
const CONFIDENCE_LABEL: Record<string, string> = {
  emerging: "Emerging",
  developing: "Developing",
  established: "Established",
};

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.round(days / 30)} mo ago`;
  return `${Math.round(days / 365)} yr ago`;
}

export default async function MasteryProfilePage({
  params,
}: {
  params: { handle: string };
}) {
  const profile = await fetchPublicProfile(params.handle);
  if (!profile) notFound();

  const name = profile.displayName || profile.handle;

  return (
    <main className="mp-root">
      <Styles />

      <header className="mp-head">
        <div className="mp-kicker">Bucket · Mastery Profile</div>
        <h1 className="mp-name">{name}</h1>
        <div className="mp-handle">@{profile.handle}</div>
        <p className="mp-headline">{profile.framing.headline}</p>

        <div className="mp-totals">
          <Stat value={profile.totals.conceptsMastered} label="mastered" />
          <Stat value={profile.totals.conceptsStarted} label="started" />
          <Stat value={profile.totals.branchesTouched} label="branches" />
          <Stat value={profile.totals.deepestDepthLabel} label="deepest" small />
        </div>
        <div className="mp-recency">
          Last built on{" "}
          <strong>{relTime(profile.totals.lastActivity)}</strong>
        </div>
      </header>

      {/* the-signal disclaimer, the EPIC §5 guardrail, made visible */}
      <div className="mp-disclaimer" role="note">
        {profile.framing.disclaimer}
      </div>

      {/* bkt-52p: verifiable-credential surface. Owner sees "issue"; everyone
 sees a "Verify" affordance (the viral backlink). Client island, 
 ownership + issuance are re-verified server-side from the token. */}
      <CredentialPanel handle={profile.handle} />

      {profile.branches.length === 0 ? (
        <div className="mp-empty">
          No public branches yet — {name} is just getting started.
        </div>
      ) : (
        profile.branches.map((b) => <BranchCard key={b.branch} branch={b} />)
      )}

      <footer className="mp-foot">
        <a className="mp-cta" href="/academy">
          Build your own → Bucket Academy
        </a>
        <div className="mp-slogan">build the past. build history.</div>
      </footer>
    </main>
  );
}

function Stat({
  value,
  label,
  small,
}: {
  value: number | string;
  label: string;
  small?: boolean;
}) {
  return (
    <div className="mp-stat">
      <div className={"mp-stat-val" + (small ? " sm" : "")}>{value}</div>
      <div className="mp-stat-lbl">{label}</div>
    </div>
  );
}

function BranchCard({ branch }: { branch: BranchSummary }) {
  const pct = Math.round(branch.meanMastery * 100);
  const deepestRank = DEPTH_RANK[branch.deepestDepthLabel] || 0;
  // top mastered concepts for the evidence-framing teaser
  const topMastered = branch.concepts
    .filter((c) => c.mastered)
    .slice(0, 6);
  const inspect = branch.concepts.filter((c) => c.started).slice(0, 8);

  return (
    <section className="mp-branch">
      <div className="mp-branch-head">
        <h2 className="mp-branch-title">{branch.title}</h2>
        <span className={"mp-conf conf-" + branch.confidence}>
          {CONFIDENCE_LABEL[branch.confidence] || branch.confidence}
        </span>
      </div>

      <div className="mp-branch-grid">
        <div className="mp-map-col">
          <MasteryMap branch={branch} />
          <div className="mp-map-legend">
            <span><i className="dot prereq" /> Prerequisite</span>
            <span><i className="dot nucleus" /> Nucleus</span>
            <span><i className="dot frontier" /> Frontier</span>
          </div>
        </div>

        <div className="mp-stat-col">
          <div className="mp-mini-row">
            <span>{branch.mastered} mastered</span>
            <span>·</span>
            <span>{branch.started} started</span>
            <span>·</span>
            <span>{branch.total} concepts</span>
          </div>

          {/* coarse progress bar, labelled "progress", never "score" */}
          <div className="mp-bar-label">
            Learning progress <span className="mp-pct">{pct}%</span>
          </div>
          <div className="mp-bar">
            <i style={{ width: pct + "%" }} />
          </div>
          <div className="mp-conf-note">{branch.confidenceNote}</div>

          {/* depth ladder reached */}
          <div className="mp-depth">
            <div className="mp-depth-label">Depth reached</div>
            <div className="mp-ladder">
              {DEPTH_LADDER.map((d, i) => (
                <span
                  key={d}
                  className={"mp-rung" + (i < deepestRank ? " on" : "")}
                  title={d}
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

          <div className="mp-recency-sm">
            Last re-demonstrated <strong>{relTime(branch.lastActivity)}</strong>
          </div>
        </div>
      </div>

      {/* per-shell summary */}
      <div className="mp-shells">
        {branch.shells.map((s) => (
          <div className="mp-shell-row" key={s.shell}>
            <span className={"mp-shell-name shell-" + s.shell}>{s.label}</span>
            <div className="mp-shell-bar">
              <i
                className={"shell-" + s.shell}
                style={{ width: Math.round(s.meanMastery * 100) + "%" }}
              />
            </div>
            <span className="mp-shell-count">
              {s.mastered}/{s.total}
            </span>
          </div>
        ))}
      </div>

      {/* evidence framing (placeholder) + verify stub */}
      <details className="mp-evidence">
        <summary>
          Evidence — what {branch.title} mastery is built from
        </summary>
        <div className="mp-evidence-body">
          <p className="mp-evidence-note">
            Each mastered concept here was reached by retrieval with feedback and
            re-demonstrated over time (spaced repetition), not by reading or
            clicking through. Concepts demonstrated to Derive or Teach-back, with a
            spaced re-demonstration trail, can be issued as a cryptographically
            signed credential (Open Badges 3.0 / W3C VC) that attests evidence of
            demonstrated mastery — not a score.
          </p>
          {topMastered.length > 0 && (
            <ul className="mp-evidence-list">
              {topMastered.map((c) => (
                <li key={c.id}>
                  <span className={"dot shell-" + c.shell} />
                  {c.title}
                  <span className="mp-evi-depth">{c.depthLabel}</span>
                </li>
              ))}
            </ul>
          )}
          <a className="mp-verify" href="/verify">
            <span className="mp-verify-ico">⛉</span>
            <span className="mp-verify-txt">
              Verify a credential (Open Badges 3.0 / W3C VC)
            </span>
          </a>
        </div>
      </details>

      {/* screen-reader / inspect list-mode, the same signal, non-visual */}
      <details className="mp-inspect">
        <summary>Concept-by-concept (list view)</summary>
        <ul className="mp-inspect-list">
          {inspect.map((c) => (
            <li key={c.id}>
              <span className={"dot shell-" + c.shell} />
              <span className="mp-ic-title">{c.title}</span>
              <span className="mp-ic-meta">
                {Math.round(c.mastery * 100)}% · {c.depthLabel}
                {c.retrievability != null
                  ? ` · ${Math.round(c.retrievability * 100)}% retained`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

/* Scoped, self-contained styles in the bucket aesthetic (bone/basalt/aegean/
 * gold/laurel, Cinzel display + Fraunces body, both already loaded by the root
 * layout). Inline so the page is fully standalone + screenshot-native. */
function Styles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
.mp-root{--bone:#EFE8D4;--bone-2:#E4DCC4;--card:#F5F0E1;--basalt:#1F1C16;--ink-dim:#4A4238;--ink-faint:#6F6A5E;--aegean:#2E6B6B;--aegean-deep:#1F4F4F;--gold:#B8861E;--gold-deep:#8A641A;--laurel:#5A7A3A;--line:rgba(31,28,22,.12);--line-2:rgba(31,28,22,.06);
  max-width:760px;margin:0 auto;padding:28px 18px 80px;color:var(--basalt);font-family:"Fraunces",Georgia,serif;}
.mp-head{text-align:center;padding:18px 0 8px;}
.mp-kicker{font-family:"Cinzel",serif;text-transform:uppercase;letter-spacing:.16em;font-size:11px;color:var(--gold-deep);}
.mp-name{font-family:"Cinzel",serif;font-weight:700;font-size:34px;line-height:1.1;margin:10px 0 2px;}
.mp-handle{color:var(--ink-faint);font-size:14px;font-family:"JetBrains Mono",monospace;}
.mp-headline{max-width:540px;margin:14px auto 0;font-size:17px;line-height:1.5;color:var(--ink-dim);}
.mp-totals{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:20px 0 6px;}
.mp-stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 16px;min-width:78px;}
.mp-stat-val{font-family:"Cinzel",serif;font-weight:700;font-size:24px;line-height:1;}
.mp-stat-val.sm{font-size:15px;padding-top:5px;}
.mp-stat-lbl{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-faint);margin-top:4px;}
.mp-recency{font-size:13px;color:var(--ink-faint);margin-top:6px;}
.mp-disclaimer{background:rgba(184,134,30,.08);border:1px solid rgba(184,134,30,.28);border-radius:12px;padding:12px 16px;margin:18px 0 24px;font-size:13.5px;line-height:1.5;color:var(--ink-dim);}
.mp-empty{text-align:center;color:var(--ink-faint);padding:40px 0;}
.mp-branch{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;margin:0 0 20px;}
.mp-branch-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;}
.mp-branch-title{font-family:"Cinzel",serif;font-weight:600;font-size:21px;margin:0;}
.mp-conf{font-family:"Cinzel",serif;text-transform:uppercase;letter-spacing:.08em;font-size:10px;padding:4px 9px;border-radius:999px;border:1px solid var(--line);}
.conf-emerging{color:var(--ink-faint);background:var(--bone-2);}
.conf-developing{color:var(--aegean-deep);border-color:rgba(46,107,107,.35);background:rgba(46,107,107,.07);}
.conf-established{color:var(--laurel);border-color:rgba(90,122,58,.4);background:rgba(90,122,58,.08);}
.mp-branch-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center;}
@media(max-width:560px){.mp-branch-grid{grid-template-columns:1fr;}}
.mp-map-legend{display:flex;gap:14px;justify-content:center;font-size:11px;color:var(--ink-faint);margin-top:6px;flex-wrap:wrap;}
.mp-map-legend .dot,.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:middle;}
.dot.prereq,.dot.shell-prereq{background:var(--aegean);}
.dot.nucleus,.dot.shell-nucleus{background:var(--gold);}
.dot.frontier,.dot.shell-frontier{background:var(--laurel);}
.mp-mini-row{display:flex;gap:6px;font-size:13px;color:var(--ink-dim);margin-bottom:10px;flex-wrap:wrap;}
.mp-bar-label{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-faint);display:flex;justify-content:space-between;}
.mp-pct{color:var(--gold-deep);font-weight:600;}
.mp-bar{height:8px;background:var(--bone-2);border-radius:999px;overflow:hidden;margin:5px 0 8px;}
.mp-bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--aegean),var(--gold));border-radius:999px;}
.mp-conf-note{font-size:12px;color:var(--ink-faint);line-height:1.45;margin-bottom:12px;}
.mp-depth-label{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-faint);margin-bottom:5px;}
.mp-ladder{display:flex;gap:4px;flex-wrap:wrap;}
.mp-rung{font-size:11px;padding:3px 8px;border-radius:999px;border:1px solid var(--line);color:var(--ink-faint);background:var(--bone);}
.mp-rung.on{color:#fff;background:var(--aegean);border-color:var(--aegean);}
.mp-recency-sm{font-size:12px;color:var(--ink-faint);margin-top:10px;}
.mp-shells{margin-top:14px;display:flex;flex-direction:column;gap:7px;}
.mp-shell-row{display:flex;align-items:center;gap:10px;font-size:13px;}
.mp-shell-name{min-width:96px;}
.mp-shell-name.shell-prereq{color:var(--aegean-deep);}
.mp-shell-name.shell-nucleus{color:var(--gold-deep);}
.mp-shell-name.shell-frontier{color:var(--laurel-deep,#3E5A2A);}
.mp-shell-bar{flex:1;height:6px;background:var(--bone-2);border-radius:999px;overflow:hidden;}
.mp-shell-bar>i{display:block;height:100%;border-radius:999px;}
.mp-shell-bar>i.shell-prereq{background:var(--aegean);}
.mp-shell-bar>i.shell-nucleus{background:var(--gold);}
.mp-shell-bar>i.shell-frontier{background:var(--laurel);}
.mp-shell-count{min-width:42px;text-align:right;color:var(--ink-faint);font-variant-numeric:tabular-nums;}
.mp-evidence,.mp-inspect{margin-top:14px;border-top:1px solid var(--line-2);padding-top:10px;}
.mp-evidence summary,.mp-inspect summary{cursor:pointer;font-family:"Cinzel",serif;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--aegean-deep);}
.mp-evidence-note{font-size:13.5px;line-height:1.55;color:var(--ink-dim);margin:10px 0;}
.mp-evidence-list{list-style:none;padding:0;margin:8px 0;display:flex;flex-direction:column;gap:5px;}
.mp-evidence-list li,.mp-inspect-list li{font-size:13.5px;display:flex;align-items:center;gap:6px;}
.mp-evi-depth,.mp-ic-meta{margin-left:auto;font-size:11px;color:var(--ink-faint);font-variant-numeric:tabular-nums;}
.mp-verify{display:inline-flex;align-items:center;gap:8px;margin-top:8px;padding:8px 12px;border:1px solid var(--line);border-radius:10px;color:var(--aegean-deep);font-size:13px;text-decoration:none;}
.mp-verify:hover{border-color:rgba(46,107,107,.4);background:rgba(46,107,107,.06);}
.mp-verify-ico{color:var(--gold-deep);font-size:15px;}
.mp-inspect-list{list-style:none;padding:0;margin:10px 0 0;display:flex;flex-direction:column;gap:6px;}
.mp-ic-title{flex:0 1 auto;}
.mp-foot{text-align:center;margin-top:34px;}
.mp-cta{display:inline-block;background:var(--basalt);color:var(--bone);text-decoration:none;font-family:"Cinzel",serif;font-size:14px;letter-spacing:.04em;padding:13px 24px;border-radius:999px;}
.mp-cta:hover{background:var(--aegean-deep);}
.mp-slogan{margin-top:16px;font-style:italic;color:var(--ink-faint);font-size:14px;}
`,
      }}
    />
  );
}
