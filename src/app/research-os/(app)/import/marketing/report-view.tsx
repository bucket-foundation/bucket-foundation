"use client";

type Num = number | null | undefined;

interface Funnel {
  spend: Num;
  impressions: Num;
  clicks: Num;
  conversions: Num;
  revenue: Num;
  ctr: Num;
  cpc: Num;
  cpa: Num;
  roas: Num;
}

interface Series {
  start: string;
  end: string;
  step: string;
  slope_unit: string;
  trend: { slope: Num; r2: Num; direction: string };
  season: { lag: number } | null;
  anomalies: { days?: { date: string; value: number }[]; skipped?: string };
}

interface CurrencyBlock {
  funnel: Funnel | null;
  channels: Record<string, Funnel & { share: Num }>;
  campaigns: (Funnel & { campaign: string })[];
  orders: { count: number; customers: number; revenue: Num } | null;
  blended: { cac: Num; roas: Num; ltv_hist: Num; ltv_window: [string, string] | null; reason?: string };
  cohorts: { rows?: { cohort: string; customers: number; retention: Num[] }[]; skipped?: string };
  attribution: { last_touch?: Record<string, number>; linear?: Record<string, number>; model?: string; skipped?: string };
  series: Record<string, Series>;
}

export interface MarketingSection {
  sources: { file: string; platform: string | null; grain: string | null }[];
  warnings: { code: string; where: string; message: string }[];
  by_currency: Record<string, CurrencyBlock>;
  citations?: Record<string, string>;
  date_rule?: string;
}

const money = (v: Num) => (v === null || v === undefined ? "-" : v.toLocaleString(undefined, { maximumFractionDigits: 2 }));
const pct = (v: Num) => (v === null || v === undefined ? "-" : `${(100 * v).toFixed(2)}%`);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[color:var(--hairline)] p-3">
      <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">{label}</div>
      <div className="text-[18px] tabular-nums">{value}</div>
    </div>
  );
}

function Block({ currency, b }: { currency: string; b: CurrencyBlock }) {
  const f = b.funnel;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display uppercase text-[16px]">{currency}</h2>
      {f && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat label="spend" value={money(f.spend)} />
          <Stat label="CTR" value={pct(f.ctr)} />
          <Stat label="CPC" value={money(f.cpc)} />
          <Stat label="CPA" value={money(f.cpa)} />
          <Stat label="platform ROAS" value={money(f.roas)} />
          <Stat label="blended CAC" value={money(b.blended.cac)} />
          <Stat label="blended ROAS" value={money(b.blended.roas)} />
          <Stat label="historical LTV" value={money(b.blended.ltv_hist)} />
        </div>
      )}
      {!f && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat label="orders" value={money(b.orders?.count)} />
          <Stat label="customers" value={money(b.orders?.customers)} />
          <Stat label="revenue" value={money(b.orders?.revenue)} />
          <Stat label="historical LTV" value={money(b.blended.ltv_hist)} />
        </div>
      )}
      {b.blended.reason && <p className="text-[13px] text-[color:var(--basalt-2)]">{b.blended.reason}.</p>}
      {Object.keys(b.channels).length > 0 && (
        <div className="overflow-x-auto">
          <table className="text-[13px] w-full">
            <thead>
              <tr className="text-left">
                <th>channel</th>
                <th>spend</th>
                <th>share</th>
                <th>CTR</th>
                <th>CPA</th>
                <th>ROAS</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(b.channels).map(([name, c]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td className="tabular-nums">{money(c.spend)}</td>
                  <td className="tabular-nums">{pct(c.share)}</td>
                  <td className="tabular-nums">{pct(c.ctr)}</td>
                  <td className="tabular-nums">{money(c.cpa)}</td>
                  <td className="tabular-nums">{money(c.roas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {b.cohorts.rows && b.cohorts.rows.length > 0 && (
        <div className="overflow-x-auto">
          <h3 className="small-caps text-[11px] tracking-[0.18em]">cohort retention by first-order month</h3>
          <table className="text-[12px] tabular-nums">
            <tbody>
              {b.cohorts.rows.map((r) => (
                <tr key={r.cohort}>
                  <td className="pr-3">
                    {r.cohort} ({r.customers})
                  </td>
                  {r.retention.slice(0, 6).map((x, k) => (
                    <td key={k} className="pr-3">
                      {pct(x)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {b.attribution.last_touch && (
        <div>
          <h3 className="small-caps text-[11px] tracking-[0.18em]">attribution</h3>
          <p className="text-[12px] text-[color:var(--basalt-2)]">{b.attribution.model}</p>
          <ul className="text-[13px]">
            {Object.entries(b.attribution.last_touch).map(([ch, v]) => (
              <li key={ch}>
                {ch}: last touch {money(v)}, linear {money(b.attribution.linear?.[ch])}
              </li>
            ))}
          </ul>
        </div>
      )}
      {Object.keys(b.series).length > 0 && (
        <div>
          <h3 className="small-caps text-[11px] tracking-[0.18em]">time series</h3>
          <ul className="text-[13px]">
            {Object.entries(b.series).map(([label, s]) => (
              <li key={label}>
                {label}: {s.start} to {s.end}, slope {money(s.trend.slope)} {s.slope_unit} ({s.trend.direction}), season {s.season ? `every ${s.season.lag} ${s.step}s` : "none found"},{" "}
                {s.anomalies.days ? `${s.anomalies.days.length} unusual ${s.step}s${s.anomalies.days.length ? `: ${s.anomalies.days.map((d) => d.date).join(", ")}` : ""}` : s.anomalies.skipped}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function MarketingReportView({ section }: { section: MarketingSection }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="text-[13px]">
        <ul>
          {section.sources.map((s, i) => (
            <li key={`${s.file}-${i}`}>
              {s.file}: {s.platform ?? "no marketing columns found"}
            </li>
          ))}
        </ul>
        {section.warnings.length > 0 && (
          <ul className="mt-2 text-[color:var(--basalt-2)]">
            {section.warnings.map((w, i) => (
              <li key={`${w.code}-${i}`}>
                {w.code} {w.where}: {w.message}
              </li>
            ))}
          </ul>
        )}
        {section.date_rule && <p className="mt-2 text-[color:var(--basalt-2)]">Dates: {section.date_rule}.</p>}
      </section>
      {Object.entries(section.by_currency).map(([cur, b]) => (
        <Block key={cur} currency={cur} b={b} />
      ))}
    </div>
  );
}
