import type { Metadata } from "next";
import finalists from "@/data/logo-finalists.json";

export const metadata: Metadata = {
  title: "Logo Finalists",
  description: "Six finished treatments of the dial inverse omega, at every size and in mockups.",
  robots: { index: false },
};

type Finalist = (typeof finalists)[number];

const SIZES = [16, 32, 180, 512, 1024];
const HOME_TILES = ["#34C759", "#0A84FF", "#FF9F0A", "#FF375F", "#5E5CE6", "#64D2FF", "#30D158"];

function Sizes({ f }: { f: Finalist }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      {SIZES.map((s) => {
        const shown = Math.min(s, 180);
        return (
          <figure key={s} className="flex flex-col items-center gap-1">
            <img
              src={f.image}
              width={shown}
              height={shown}
              alt={`${f.label} at ${s} px`}
              className={s >= 180 ? "rounded-[22%]" : s === 32 ? "rounded-[7px]" : "rounded-[3px]"}
            />
            <figcaption className="text-[10px] text-[#5b5547]">{s > 180 ? `${s} px, shown at 180` : `${s} px`}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

function Tab({ f }: { f: Finalist }) {
  return (
    <div className="overflow-hidden rounded-lg border border-black/10 bg-[#DEE1E6]">
      <div className="flex items-end gap-1 px-2 pt-2">
        <div className="flex h-8 w-48 items-center gap-2 rounded-t-md bg-white px-3 text-[12px] text-[#202124]">
          <img src={f.image} width={16} height={16} alt="" className="rounded-[3px]" />
          <span className="truncate">bucket.foundation</span>
        </div>
        <div className="flex h-7 w-28 items-center gap-2 px-2 text-[12px] text-[#5f6368]">
          <span className="h-4 w-4 rounded-sm bg-[#9aa0a6]" />
          Inbox
        </div>
      </div>
      <div className="h-7 bg-white px-3 text-[11px] leading-7 text-[#5f6368]">bucket.foundation/canon</div>
    </div>
  );
}

function Home({ f }: { f: Finalist }) {
  return (
    <div className="w-[230px] shrink-0 rounded-[40px] border-[9px] border-[#1c1c1e] bg-gradient-to-b from-[#3a4a6b] to-[#b7896a] px-4 pb-6 pt-8">
      <div className="grid grid-cols-4 gap-x-3 gap-y-4">
        {HOME_TILES.map((c, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="h-[40px] w-[40px] rounded-[10px]" style={{ background: c }} />
            <span className="text-[8px] text-white/90">App</span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-1">
          <img src={f.image} width={40} height={40} alt="" className="rounded-[10px]" />
          <span className="text-[8px] text-white">Bucket</span>
        </div>
      </div>
    </div>
  );
}

function Header({ f }: { f: Finalist }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-black/10 bg-[#EFE8D4] px-4 py-3">
      <img src={f.image} width={36} height={36} alt="" className="rounded-[9px]" />
      <span className="font-bold uppercase tracking-[0.08em] text-[#1F1C16]">
        bucket<span className="text-[#B07620]">.</span>foundation
      </span>
    </div>
  );
}

function Share({ f }: { f: Finalist }) {
  return (
    <div className="flex aspect-[1200/630] w-full items-center gap-5 overflow-hidden rounded-lg border border-black/10 bg-[#15130f] px-6">
      <img src={f.image} width={120} height={120} alt="" className="w-[28%] rounded-[22%]" />
      <div className="min-w-0">
        <p className="font-serif text-[clamp(16px,2.4vw,30px)] text-[#F3E3B8]">bucket.foundation</p>
        <p className="font-serif text-[clamp(11px,1.3vw,16px)] italic text-[#D9A43A]">free to read · paid to cite</p>
      </div>
    </div>
  );
}

export default function LogoPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-10 text-center">
        <h1 className="font-serif text-4xl text-[#1c1a16]">Logo Finalists</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-[#3b372f]">
          Six treatments of the dial inverse omega, each rendered by brand/omega-variants/gen.py with the dial geometry.
          Pick one and scripts/brand/build-logo.mjs regenerates every icon from it.
        </p>
      </div>
      <ol className="flex flex-col gap-8">
        {finalists.map((f, i) => (
          <li key={f.id} className="rounded-2xl border border-black/10 bg-[#F4EEDD] p-5">
            <div className="mb-4 flex flex-wrap items-baseline gap-x-3">
              <span className="text-xs uppercase tracking-widest text-[#8a5a12]">Finalist {i + 1}</span>
              <h2 className="font-serif text-2xl text-[#1c1a16]">{f.label}</h2>
              <code className="text-[11px] text-[#5b5547]">{f.id} · {f.source}</code>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_230px_1fr]">
              <Sizes f={f} />
              <Home f={f} />
              <div className="flex min-w-0 flex-col gap-3">
                <Tab f={f} />
                <Header f={f} />
                <Share f={f} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
