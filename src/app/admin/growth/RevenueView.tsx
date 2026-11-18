import type { ReactNode } from "react";
import { REVENUE_PRODUCTS, type Money, type RevenueReport } from "@/lib/growth/revenue";

const H2 = "small-caps text-[12px] tracking-[0.18em] text-[color:var(--basalt-2)] mb-3";
const TH = "text-left px-2 py-2 small-caps text-[10px] tracking-[0.14em] text-[color:var(--basalt-3)] whitespace-nowrap";
const TD = "px-2 py-2 text-[13px] text-[color:var(--basalt)] align-top";
const NONE = "no data yet";

function fig(v: number | null): ReactNode {
  return v === null ? <span className="text-[color:var(--basalt-3)]">{NONE}</span> : v;
}

function cash(v: Money[] | null): ReactNode {
  if (v === null) return <span className="text-[color:var(--basalt-3)]">{NONE}</span>;
  return v.length ? v.map((m) => `${m.currency} ${m.amount.toFixed(2)}`).join(", ") : "0";
}

function short(sku: string): string {
  return sku.replace(/^com\.polingual\./, "");
}

function Figure({ label, value, detail }: { label: string; value: ReactNode; detail: string }) {
  return (
    <div className="border border-[color:var(--hairline)] p-4 flex flex-col gap-1">
      <span className="small-caps text-[10px] tracking-[0.14em] text-[color:var(--basalt-3)]">{label}</span>
      <span className="font-display text-[24px] leading-tight text-[color:var(--basalt)]">{value}</span>
      <span className="text-[11px] text-[color:var(--basalt-3)]">{detail}</span>
    </div>
  );
}

export function RevenueFigures({ revenue }: { revenue: RevenueReport }) {
  const window = revenue.windowDays ? `last ${revenue.windowDays} days` : "App Store Connect";
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <Figure label="proceeds" value={cash(revenue.proceeds)} detail={revenue.units === null ? `${window}, purchases: ${NONE}` : `${window}, ${revenue.units} purchases`} />
      <Figure label="active subscriptions" value={fig(revenue.activeSubscriptions)} detail={revenue.activeAsOf ? `as of ${revenue.activeAsOf}` : "subscription report"} />
      <Figure
        label="trials started"
        value={fig(revenue.trialsStarted)}
        detail={revenue.trialsConverted === null ? "subscription event report" : `${revenue.trialsConverted} converted to paid, ${window}`}
      />
      <Figure label="offer code redemptions" value={fig(revenue.offerCodeRedemptions)} detail={window} />
    </div>
  );
}

export function RevenueProducts({ revenue }: { revenue: RevenueReport }) {
  return (
    <div>
      <h2 className={H2}>Revenue by product</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[color:var(--hairline)]">
              {["product", "units", "proceeds", "active", "in trial", "on offer code"].map((h) => (
                <th key={h} className={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {revenue.products.map((p) => (
              <tr key={p.sku} className="border-b border-[color:var(--hairline)]">
                <td className={TD}>
                  {p.sku}
                  {!p.inAppStoreConnect && <span className="block text-[11px] text-[color:var(--basalt-3)]">no product with this ID in App Store Connect</span>}
                </td>
                <td className={TD}>{fig(p.units)}</td>
                <td className={TD}>{cash(p.proceeds)}</td>
                <td className={TD}>{fig(p.active)}</td>
                <td className={TD}>{fig(p.trial)}</td>
                <td className={TD}>{fig(p.offerCode)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[13px] text-[color:var(--basalt-2)]">App downloads: {fig(revenue.appUnits)}</p>
      {revenue.notes.map((n, i) => (
        <p key={i} className="mt-1 text-[12px] text-[color:var(--basalt-3)]">{n}</p>
      ))}
    </div>
  );
}

export function RevenueDaily({ revenue }: { revenue: RevenueReport }) {
  const extra = revenue.products.map((p) => p.sku).filter((s) => !(REVENUE_PRODUCTS as readonly string[]).includes(s));
  const skus = [...REVENUE_PRODUCTS, ...extra];
  const main = [...(revenue.proceeds ?? [])].sort((a, b) => b.amount - a.amount)[0]?.currency;
  const amount = (d: RevenueReport["daily"][number]) => d.proceeds?.find((m) => m.currency === main)?.amount ?? 0;
  const top = Math.max(0, ...revenue.daily.map(amount));
  return (
    <>
      <div>
        <h2 className={H2}>Daily revenue</h2>
        {revenue.daily.length === 0 ? (
          <p className="text-[13px] text-[color:var(--basalt-3)]">{NONE}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[color:var(--hairline)]">
                  {["day", "downloads", ...skus.map(short), "proceeds", "trials", "converted", "codes"].map((h) => (
                    <th key={h} className={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {revenue.daily.map((d) => (
                  <tr key={d.day} className="border-b border-[color:var(--hairline)]">
                    <td className={TD + " whitespace-nowrap"}>{d.day}</td>
                    <td className={TD}>{fig(d.appUnits)}</td>
                    {skus.map((s) => (
                      <td key={s} className={TD}>{fig(d.units ? (d.units[s] ?? 0) : null)}</td>
                    ))}
                    <td className={TD + " min-w-[140px]"}>
                      {cash(d.proceeds)}
                      {top > 0 && amount(d) > 0 ? <div className="mt-1 h-[6px] bg-[color:var(--gold)]" title={`${main} share of the best day`} style={{ width: `${Math.max(2, (amount(d) / top) * 100)}%` }} /> : null}
                    </td>
                    <td className={TD}>{fig(d.trialsStarted)}</td>
                    <td className={TD}>{fig(d.trialsConverted)}</td>
                    <td className={TD}>{fig(d.offerCodeRedemptions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div>
        <h2 className={H2}>Subscription events</h2>
        {revenue.events === null || revenue.events.length === 0 ? (
          <p className="text-[13px] text-[color:var(--basalt-3)]">{revenue.events === null ? NONE : "Apple reported no subscription events in the window."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[color:var(--hairline)]">
                  {["event", "count"].map((h) => (
                    <th key={h} className={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {revenue.events.map((e) => (
                  <tr key={e.event} className="border-b border-[color:var(--hairline)]">
                    <td className={TD}>{e.event}</td>
                    <td className={TD}>{e.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
