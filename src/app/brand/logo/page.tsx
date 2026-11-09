import type { Metadata } from "next";
import InverseOmega from "@/components/InverseOmega";

export const metadata: Metadata = {
  title: "Logo v2",
  description: "Current and new bucket.foundation marks side by side, with mockups.",
  robots: { index: false },
};

const SIZES = [16, 32, 180, 512, 1024];

const CURRENT = {
  label: "Current",
  note: "Three marks in use: purple flame omega favicon, black lyre header, Capacitor placeholder iOS icon.",
  small: "/brand/logo-v1/icon.svg",
  large: "/brand/logo-v1/icon.png",
  ios: "/brand/logo-v1/ios.png",
  og: "/brand/logo-v1/og.png",
};

const NEXT = {
  label: "New",
  note: "One master SVG, brand/logo-v2/master.svg. Tab sizes drop to one string so the lyre reads at 16 px.",
  small: "/icon.svg",
  large: "/brand/logo/app-icon.svg",
  ios: "/brand/logo/app-icon.svg",
  og: "/opengraph-image.png",
};

type Mark = typeof CURRENT;

function SizeRow({ mark, dark }: { mark: Mark; dark: boolean }) {
  return (
    <div
      className={`flex flex-wrap items-end gap-6 rounded-2xl p-5 ${dark ? "bg-[#0E0C09]" : "bg-[#F4EEDD]"}`}
    >
      {SIZES.map((s) => {
        const shown = Math.min(s, 220);
        return (
          <figure key={s} className="flex flex-col items-center gap-2">
            <img
              src={s <= 32 ? mark.small : mark.large}
              width={s}
              height={s}
              style={{ width: shown, height: shown }}
              alt={`${mark.label} mark at ${s} px`}
              className={s >= 180 ? "rounded-[22%]" : ""}
            />
            <figcaption className={`text-[11px] ${dark ? "text-[#9C9584]" : "text-[#5b5547]"}`}>
              {s > 220 ? `${s} px, shown at 220` : `${s} px`}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

function BrowserTab({ mark }: { mark: Mark }) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-[#DEE1E6]">
      <div className="flex items-end gap-1 px-2 pt-2">
        <div className="flex h-9 w-56 items-center gap-2 rounded-t-lg bg-white px-3 text-[12px] text-[#202124]">
          <img src={mark.small} width={16} height={16} alt="" />
          <span className="truncate">bucket.foundation</span>
        </div>
        <div className="flex h-8 w-44 items-center gap-2 px-3 text-[12px] text-[#5f6368]">
          <span className="h-4 w-4 rounded-sm bg-[#9aa0a6]" />
          <span className="truncate">Inbox</span>
        </div>
      </div>
      <div className="h-8 bg-white px-3 text-[12px] leading-8 text-[#5f6368]">bucket.foundation/canon</div>
    </div>
  );
}

const HOME_TILES = ["#34C759", "#0A84FF", "#FF9F0A", "#FF375F", "#5E5CE6", "#64D2FF", "#30D158"];

function HomeScreen({ mark }: { mark: Mark }) {
  return (
    <div className="mx-auto w-[260px] rounded-[44px] border-[10px] border-[#1c1c1e] bg-gradient-to-b from-[#3a4a6b] to-[#b7896a] p-5">
      <div className="grid grid-cols-4 gap-x-3 gap-y-4">
        {HOME_TILES.map((c, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="h-[46px] w-[46px] rounded-[11px]" style={{ background: c }} />
            <span className="text-[9px] text-white/90">App</span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-1">
          <img src={mark.ios} width={46} height={46} alt="" className="rounded-[11px]" />
          <span className="text-[9px] text-white">Bucket</span>
        </div>
      </div>
    </div>
  );
}

function Column({ mark, children }: { mark: Mark; children?: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-5">
      <div>
        <h2 className="font-serif text-3xl text-[#1c1a16]">{mark.label}</h2>
        <p className="mt-1 text-sm text-[#5b5547]">{mark.note}</p>
      </div>
      <SizeRow mark={mark} dark={false} />
      <SizeRow mark={mark} dark />
      <BrowserTab mark={mark} />
      <HomeScreen mark={mark} />
      {children}
      <img src={mark.og} alt={`${mark.label} share card`} className="w-full rounded-xl border border-black/10" />
    </section>
  );
}

function Header({ current }: { current: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-[#EFE8D4] px-4 py-3">
      {current ? (
        <img src="/brand/logo-v1/lyre.png" width={40} height={40} alt="" className="mix-blend-multiply" />
      ) : (
        <InverseOmega size={40} variant="carved" />
      )}
      <span className="font-bold uppercase tracking-[0.08em] text-[#1F1C16]">
        bucket<span className="text-[#B07620]">.</span>foundation
      </span>
    </div>
  );
}

export default function LogoPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <div className="rounded-[48px] bg-[#0E0C09] p-6 shadow-[0_0_60px_rgba(226,170,63,0.35)]">
          <InverseOmega size={180} variant="inlay" />
        </div>
        <h1 className="font-serif text-4xl text-[#1c1a16]">Logo v2</h1>
        <p className="max-w-xl text-sm text-[#3b372f]">
          The gold inverse-omega lyre, drawn once in brand/logo-v2/master.svg. Every favicon, app icon,
          share card and header mark below comes from that file through scripts/brand/build-logo.mjs.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Column mark={CURRENT}>
          <Header current />
        </Column>
        <Column mark={NEXT}>
          <Header current={false} />
        </Column>
      </div>
    </main>
  );
}
