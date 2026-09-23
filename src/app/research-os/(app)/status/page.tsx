import type { Metadata } from "next";
import Link from "next/link";
import { checkEngine, checkModel, fetchRuns, REPO, type Check, type CheckState, type RunSummary } from "@/lib/research-os/status";

export const metadata: Metadata = { title: "Status", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LABEL = "small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]";

const STATE: Record<CheckState, { word: string; tone: string }> = {
  up: { word: "up", tone: "text-[color:var(--laurel-deep)] border-[color:var(--laurel-deep)]" },
  unhealthy: { word: "unhealthy", tone: "text-[color:var(--crimson)] border-[color:var(--crimson)]" },
  unreachable: { word: "no answer", tone: "text-[color:var(--gold-deep)] border-[color:var(--gold-deep)]" },
  unset: { word: "not set here", tone: "text-[color:var(--basalt-3)] border-[color:var(--hairline)]" },
};

function CheckRow({ c }: { c: Check }) {
  const s = STATE[c.state];
  return (
    <li className="border-b border-[color:var(--hairline)] py-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <span className="text-[15px] text-[color:var(--basalt)] min-w-[160px]">{c.name}</span>
      <span className={`border px-2 py-[2px] text-[11px] small-caps tracking-[0.12em] ${s.tone}`}>{s.word}</span>
      <span className="text-[13px] text-[color:var(--basalt-2)] basis-full md:basis-auto md:flex-1">
        {c.detail}
        {c.ms !== null && <span className="text-[color:var(--basalt-3)]"> {c.ms} ms.</span>}
      </span>
    </li>
  );
}

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

function RunList({ branch, runs }: { branch: string; runs: RunSummary[] | null }) {
  return (
    <div className="mt-4">
      <h3 className={LABEL}>{branch}</h3>
      {runs === null ? (
        <p className="mt-2 text-[13px] text-[color:var(--gold-deep)]">GitHub did not answer this server, so these runs were not checked. This says nothing about the builds themselves.</p>
      ) : runs.length === 0 ? (
        <p className="mt-2 text-[13px] text-[color:var(--basalt-2)]">No runs on this branch.</p>
      ) : (
        <ul className="mt-2 border-t border-[color:var(--hairline)]">
          {runs.map((r) => {
            const ok = r.conclusion === "success";
            const running = r.status !== "completed";
            const tone = running ? "text-[color:var(--gold-deep)]" : ok ? "text-[color:var(--laurel-deep)]" : r.conclusion === "skipped" ? "text-[color:var(--basalt-3)]" : "text-[color:var(--crimson)]";
            return (
              <li key={r.workflow} className="border-b border-[color:var(--hairline)] py-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px]">
                <a href={r.url} target="_blank" rel="noreferrer" className="text-[color:var(--basalt)] underline underline-offset-4 min-w-[160px]">
                  {r.workflow}
                </a>
                <span className={`small-caps text-[11px] tracking-[0.12em] ${tone}`}>{running ? r.status.replace("_", " ") : r.conclusion ?? "none"}</span>
                <span className="text-[color:var(--basalt-3)]">
                  <code className="font-mono text-[12px]">{r.sha}</code> · {when(r.at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default async function StatusPage() {
  const [engine, model, dev, main] = await Promise.all([
    checkEngine(process.env.HTE_SERVE_URL, fetch),
    checkModel(process.env.LLM_BASE_URL, process.env.LLM_API_KEY, fetch),
    fetchRuns("dev", fetch),
    fetchRuns("main", fetch),
  ]);
  const checkedAt = new Date().toISOString();

  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-[900px]">
      <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2rem)] leading-[1.1] chisel text-[color:var(--basalt)]">Status</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--basalt-2)] max-w-[70ch]">
        What Research OS runs on, checked from this deployment&apos;s server at {when(checkedAt)}. &ldquo;No answer&rdquo; means this server could not reach the service, which is either down or out of its reach. &ldquo;Not set here&rdquo; means this deployment has no address for it.
      </p>

      <section className="mt-6">
        <h2 className={LABEL}>services</h2>
        <ul className="mt-2 border-t border-[color:var(--hairline)]">
          <CheckRow c={engine} />
          <CheckRow c={model} />
        </ul>
      </section>

      <section className="mt-8">
        <h2 className={LABEL}>builds</h2>
        <p className="mt-2 text-[13px] text-[color:var(--basalt-2)] max-w-[70ch]">
          The newest run of each workflow on <code className="font-mono text-[12px]">dev</code>, where work lands, and <code className="font-mono text-[12px]">main</code>, which the public site builds from.{" "}
          <a href={`https://github.com/${REPO}/actions`} target="_blank" rel="noreferrer" className="underline underline-offset-4">
            All runs
          </a>
          .
        </p>
        <RunList branch="dev" runs={dev} />
        <RunList branch="main" runs={main} />
      </section>

      <p className="mt-8 text-[12px] text-[color:var(--basalt-3)]">
        <Link href="/research-os/status" className="underline underline-offset-4">
          Check again
        </Link>
      </p>
    </div>
  );
}
