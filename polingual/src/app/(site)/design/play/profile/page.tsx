"use client";

import { useState } from "react";
import Header from "../Header";
import { GROUPS, ME, RARITY, type Look } from "../mock";
import { Avatar, Coins, Flag, TierBadge } from "../../../play-kit/parts";
import s from "../design.module.css";

const COLORS = ["#D9381E", "#26428B", "#E9A23B", "#1E7A5A", "#6FB7C2", "#5B1A4A"];
const PASSPORT = ["it", "es", "fr", "de", "ja", "pt", "ar"];

type Tab = "body" | "face" | "hat" | "outfit" | "plinth";
type Part = { v: string; name: string; rarity: string; price: number; owned: boolean };

const PARTS: Record<Exclude<Tab, "body" | "plinth">, Part[]> = {
  face: [
    { v: "smile", name: "Smile", rarity: "Common", price: 0, owned: true },
    { v: "grin", name: "Grin", rarity: "Common", price: 0, owned: true },
    { v: "wow", name: "Wow", rarity: "Rare", price: 400, owned: false },
    { v: "cool", name: "Shades", rarity: "Earn only", price: 0, owned: false },
  ],
  hat: [
    { v: "none", name: "None", rarity: "Common", price: 0, owned: true },
    { v: "beret", name: "Beret", rarity: "Common", price: 150, owned: true },
    { v: "cap", name: "Tokyo cap", rarity: "Common", price: 150, owned: false },
    { v: "sombrero", name: "Sombrero", rarity: "Rare", price: 400, owned: false },
    { v: "crown", name: "Lapis crown", rarity: "Epic", price: 900, owned: false },
  ],
  outfit: [
    { v: "plain", name: "Plain", rarity: "Common", price: 0, owned: true },
    { v: "scarf", name: "Ochre scarf", rarity: "Common", price: 150, owned: true },
    { v: "stripe", name: "Stripe", rarity: "Common", price: 150, owned: true },
    { v: "cape", name: "Flag cape", rarity: "Rare", price: 400, owned: false },
  ],
};

export default function ProfileMock() {
  const [look, setLook] = useState<Look>(ME.look);
  const [tab, setTab] = useState<Tab>("hat");
  const [toast, setToast] = useState<string | null>(null);

  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 1600);
  };

  const pick = (key: keyof Look, p: Part) => {
    setLook({ ...look, [key]: p.v } as Look);
    if (!p.owned) flash(p.price ? `Preview. Get it for ${p.price} coins in the shop` : "Earn it from a 30 day streak");
  };

  const random = () => {
    const r = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    setLook({ body: r(COLORS), face: r(PARTS.face).v as Look["face"], hat: r(PARTS.hat).v as Look["hat"], outfit: r(PARTS.outfit).v as Look["outfit"], plinth: r(COLORS) });
  };

  return (
    <>
      <Header />
      <main className={s.main}>
        <div className={s.profile}>
          <section className={s.pcard} aria-label="Profile card">
            <TierBadge tier={ME.tier} />
            <Avatar look={look} size={180} bounce />
            <div className={s.row} style={{ justifyContent: "center" }}><Flag lang={ME.lang} size={20} /><h2>{ME.handle}</h2></div>
            <span className={s.mono} style={{ fontSize: 13 }}>{ME.country.toUpperCase()}, LEVEL {ME.level}</span>
            <div className={s.xp} aria-label="Level progress 62 percent"><i style={{ width: "62%" }} /></div>
            <div className={s.stats}>
              <div><b>212</b><span>games</span></div>
              <div><b>48</b><span>wins</span></div>
              <div><b>23</b><span>best streak</span></div>
            </div>
            <p className={s.mono} style={{ margin: 0, fontSize: 12 }}>FLAG PASSPORT</p>
            <div className={s.passport}>{PASSPORT.map((l) => <Flag key={l} lang={l} size={18} />)}</div>
            <div className={s.row} style={{ justifyContent: "center" }}>
              {GROUPS.map((g) => <span key={g.name} className={s.tier} data-small style={{ background: g.color, color: "#F6EEDC" }}>{g.name}</span>)}
            </div>
            <button className={s.cta} onClick={() => flash("Card image saved")}>Share card</button>
          </section>

          <section className={s.card} aria-label="Avatar editor" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className={s.between}>
              <h1 style={{ fontSize: 32 }}>Avatar</h1>
              <Coins n={ME.coins} />
            </div>
            <div className={s.tabs} role="tablist">
              {(["body", "face", "hat", "outfit", "plinth"] as Tab[]).map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} aria-pressed={tab === t} className={s.chip} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
            {(tab === "body" || tab === "plinth") && (
              <div className={s.row}>
                {COLORS.map((c) => (
                  <button key={c} className={s.swatch} style={{ background: c }} aria-label={`Color ${c}`} aria-pressed={look[tab] === c} onClick={() => setLook({ ...look, [tab]: c })} />
                ))}
              </div>
            )}
            {tab !== "body" && tab !== "plinth" && (
              <div className={s.items}>
                {PARTS[tab].map((p) => (
                  <button key={p.v} className={s.item} aria-pressed={look[tab] === p.v} onClick={() => pick(tab, p)}>
                    <Avatar look={{ ...look, [tab]: p.v } as Look} size={64} />
                    <b>{p.name}</b>
                    <span className={s.rar} style={{ background: RARITY[p.rarity] }}>{p.rarity}</span>
                    <span className={s.mono} style={{ fontSize: 13 }}>{p.owned ? "Owned" : p.price ? `${p.price} coins` : "Earn"}</span>
                  </button>
                ))}
              </div>
            )}
            <div className={s.row}>
              <button className={s.ghost} onClick={random}>Randomize</button>
              <button className={s.ghost} onClick={() => setLook(ME.look)}>Undo</button>
              <button className={s.cta} onClick={() => flash("Saved")}>Save look</button>
            </div>
            <p className={s.note}>Items change looks only. Every player answers the same questions on the same timer.</p>
            <div className={s.between} style={{ borderTop: "1px solid var(--hair)", paddingTop: 12 }}>
              <span><b>Show me in the public feed</b><br /><small className={s.muted}>Adults only. Off by default.</small></span>
              <button className={s.chip} aria-pressed={false}>Off</button>
            </div>
          </section>
        </div>
      </main>
      {toast && <div className={s.toast} role="status">{toast}</div>}
    </>
  );
}
