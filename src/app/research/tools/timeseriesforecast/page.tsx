import Link from "next/link";
import Script from "next/script";
import { toolMetadata, toolJsonLd, getTool } from "@/lib/tools";

export const metadata = toolMetadata("timeseriesforecast");
const _jsonld = toolJsonLd("timeseriesforecast");
import TimeSeriesForecastClient from "./TimeSeriesForecastClient";

// TimeSeriesForecast run page — server shell framing the interactive client island.
export default function Page() {
  const t = getTool("timeseriesforecast");
  return (
    <main className="stone-bone relative grain">
      {_jsonld && (
        <Script
          id="ld-tool-timeseriesforecast"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(_jsonld) }}
        />
      )}
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-5">
          <Link
            href="/research/tools"
            className="text-[color:var(--aegean-deep)] hover:text-[color:var(--basalt)]"
          >
            § Research · tools
          </Link>{" "}
          / {t?.name ?? "TimeSeriesForecast"}
        </div>
        <h1 className="font-display uppercase text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          forecast a <span className="inlay-gold">series.</span>
        </h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-[color:var(--basalt-2)] max-w-2xl">
          Paste a numeric series and (optionally) its seasonal period.
          TimeSeriesForecast fits Holt-Winters triple exponential smoothing —
          level, trend, and seasonal terms with α/β/γ chosen by minimizing
          in-sample error — decomposes the series, and forecasts forward. Crucially
          it reports an honest holdout backtest (MAE/RMSE/MAPE) against a naive
          last-value baseline: a forecast that does not beat naive adds nothing.
          Dependency-light real numpy, no GPU.
        </p>
        <div className="carved-rule max-w-xs mt-10" />

        <div className="mt-12">
          <TimeSeriesForecastClient />
        </div>
      </div>
    </main>
  );
}
