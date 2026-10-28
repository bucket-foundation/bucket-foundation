import type { GrowthReport } from "@/lib/growth/report";

const H2 = "small-caps text-[12px] tracking-[0.18em] text-[color:var(--basalt-2)] mb-3";
const TH = "text-left px-2 py-2 small-caps text-[10px] tracking-[0.14em] text-[color:var(--basalt-3)] whitespace-nowrap";
const TD = "px-2 py-2 text-[13px] text-[color:var(--basalt)] align-top";

function pct(v: number | null): string {
  return v === null ? "-" : `${Math.round(v * 100)}%`;
}

export default function GrowthReportView({ data }: { data: GrowthReport & { truncated?: boolean } }) {
  const top = data.funnel.find((s) => s.count !== null && s.count > 0)?.count ?? null;

  return (
    <>
      <p className="text-[12px] text-[color:var(--basalt-3)]">
        Generated {data.generatedAt.slice(0, 16).replace("T", " ")} UTC. App Store Connect snapshot {data.snapshotAt ? data.snapshotAt.slice(0, 16).replace("T", " ") + " UTC" : "not taken yet"}.
        {data.truncated ? " Event cap reached: counts are partial." : ""}
      </p>
      <div>
        <h2 className={H2}>Funnel</h2>
        <ol className="flex flex-col gap-2">
          {data.funnel.map((s) => (
            <li key={s.key} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-display text-[24px] leading-none text-[color:var(--basalt)] min-w-[64px]">{s.count ?? "-"}</span>
                <span className="text-[14px] text-[color:var(--basalt)]">{s.label}</span>
                <span className="text-[11px] text-[color:var(--basalt-3)]">{s.source}</span>
              </div>
              {s.count !== null && top ? (
                <div className="h-[6px] bg-[color:var(--gold)]" style={{ width: `${Math.max(2, Math.min(100, (s.count / top) * 100))}%` }} />
              ) : null}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[13px] text-[color:var(--basalt-2)]">
          Retention of testers: D1 {pct(data.retention[1])}, D7 {pct(data.retention[7])}, D30 {pct(data.retention[30])}.
        </p>
      </div>
      <div>
        <h2 className={H2}>Signups by week</h2>
        <p className="text-[13px] text-[color:var(--basalt-2)]">{data.signupsByWeek.map((w) => `${w.week}: ${w.count}`).join(" · ") || "-"}</p>
      </div>
      {(["bucket", "polingual"] as const).map((app) => (
        <div key={app}>
          <h2 className={H2}>
            {app} builds, median {data.medianDaysBetweenBuilds[app] ?? "-"} days apart
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[color:var(--hairline)]">
                  {["uploaded", "version", "build", "gap", "state", "what changed"].map((h) => (
                    <th key={h} className={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.cadence[app].map((b) => (
                  <tr key={`${b.version}-${b.build}`} className="border-b border-[color:var(--hairline)]">
                    <td className={TD + " whitespace-nowrap"}>{b.uploadedAt.slice(0, 10)}</td>
                    <td className={TD}>{b.version}</td>
                    <td className={TD}>{b.build}</td>
                    <td className={TD}>{b.daysSincePrevious === null ? "-" : `${b.daysSincePrevious}d`}</td>
                    <td className={TD}>{b.state.toLowerCase()}</td>
                    <td className={TD}>
                      {b.notes.length ? (
                        <ul className="list-disc pl-4">{b.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                      ) : (
                        <span className="text-[color:var(--basalt-3)]">{b.tag ? "no commits" : "no build tag"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <div>
        <h2 className={H2}>Daily activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[color:var(--hairline)]">
                {["day", "DAU", "WAU", "reviews"].map((h) => (
                  <th key={h} className={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data.activity.days].reverse().map((d) => (
                <tr key={d.day} className="border-b border-[color:var(--hairline)]">
                  <td className={TD + " whitespace-nowrap"}>{d.day}</td>
                  <td className={TD}>{d.dau}</td>
                  <td className={TD}>{d.wau}</td>
                  <td className={TD}>{d.reviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h2 className={H2}>Retention cohorts by enrollment week</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[color:var(--hairline)]">
                {["week", "testers", "W0", "W1", "W2", "W3", "W4"].map((h) => (
                  <th key={h} className={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.activity.cohorts.map((c) => (
                <tr key={c.week} className="border-b border-[color:var(--hairline)]">
                  <td className={TD + " whitespace-nowrap"}>{c.week}</td>
                  <td className={TD}>{c.users}</td>
                  {c.retained.map((r, i) => (
                    <td key={i} className={TD}>{pct(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.activity.cohorts.length === 0 && <p className="text-[13px] text-[color:var(--basalt-3)]">No testers enrolled in the last 8 weeks.</p>}
      </div>
    </>
  );
}
