"use client";

import { useState } from "react";
import Header from "../Header";
import { GROUPS, ME, RARITY, type Look } from "../mock";
import { LABELS, LAYERS, PIGMENTS, SKINS, lookFromSeed, normalizeLook, type Layer } from "@/ui/avatar";
import { Avatar, Coins, Flag, TierBadge } from "../../../play-kit/parts";
import s from "../design.module.css";
import { Button, Card, Pill } from "@/ui";

const PASSPORT = ["it", "es", "fr", "de", "ja", "pt", "ar"];

const TABS: { id: Layer; name: string }[] = [
  { id: "shape", name: "Body" }, { id: "skin", name: "Skin" }, { id: "color", name: "Color" }, { id: "outfit", name: "Outfit" },
  { id: "face", name: "Face" }, { id: "hat", name: "Hat" }, { id: "accessory", name: "Extras" }, { id: "plinth", name: "Plinth" },
  { id: "backdrop", name: "Backdrop" }, { id: "frame", name: "Frame" },
];
const HEAD_TABS: Layer[] = ["skin", "face", "hat", "accessory"];
const SWATCH_TABS: Layer[] = ["skin", "color", "plinth", "backdrop"];

type Part = { rarity: string; price: number; owned: boolean };
const FREE: Part = { rarity: "Common", price: 0, owned: true };
const CATALOG: Record<string, Part> = {
  "outfit.cape": { rarity: "Rare", price: 400, owned: false }, "outfit.sash": { rarity: "Common", price: 150, owned: false }, "outfit.vest": { rarity: "Common", price: 150, owned: true },
  "face.wow": { rarity: "Rare", price: 400, owned: false }, "face.starry": { rarity: "Epic", price: 900, owned: false }, "face.proud": { rarity: "Earn only", price: 0, owned: false },
  "hat.cap": { rarity: "Common", price: 150, owned: false }, "hat.fez": { rarity: "Common", price: 150, owned: false }, "hat.sombrero": { rarity: "Rare", price: 400, owned: false },
  "hat.laurel": { rarity: "Epic", price: 900, owned: false }, "hat.crown": { rarity: "Epic", price: 900, owned: false },
  "accessory.monocle": { rarity: "Rare", price: 400, owned: false }, "accessory.headphones": { rarity: "Common", price: 150, owned: false }, "accessory.medal": { rarity: "Earn only", price: 0, owned: false },
  "plinth.ochre": { rarity: "Legendary", price: 2000, owned: false }, "plinth.maya": { rarity: "Earn only", price: 0, owned: false },
  "frame.ring": { rarity: "Earn only", price: 0, owned: true }, "frame.sparkle": { rarity: "Earn only", price: 0, owned: false }, "frame.laurel": { rarity: "Earn only", price: 0, owned: false },
  "frame.rays": { rarity: "Legendary", price: 2000, owned: false }, "frame.crest": { rarity: "Earn only", price: 0, owned: false },
};
const part = (layer: Layer, v: string) => CATALOG[`${layer}.${v}`] ?? FREE;
const hex = (layer: Layer, v: string) => (layer === "skin" ? SKINS[v as keyof typeof SKINS] : PIGMENTS[v as keyof typeof PIGMENTS] ?? "transparent");

export default function ProfileMock() {
  const [look, setLook] = useState<Look>(ME.look);
  const [tab, setTab] = useState<Layer>("hat");
  const [toast, setToast] = useState<string | null>(null);

  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 1600);
  };

  const pick = (layer: Layer, v: string) => {
    setLook(normalizeLook({ ...look, [layer]: v }));
    const p = part(layer, v);
    if (!p.owned) flash(p.price ? `Preview. Get it for ${p.price} coins in the shop` : "Earn it by climbing the leagues");
  };

  const random = () => setLook(lookFromSeed(`${ME.handle}-${Date.now()}`));

  return (
    <>
      <Header />
      <main className={s.main}>
        <div className={s.profile}>
          <section className={s.pcard} aria-label="Profile card">
            <TierBadge tier={ME.tier} />
            <Avatar look={look} size={200} bounce label={`${ME.handle} avatar`} />
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
            <Button onClick={() => flash("Card image saved")}>Share card</Button>
          </section>

          <Card as="section" aria-label="Avatar editor" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className={s.between}>
              <h1 style={{ fontSize: 32 }}>Avatar</h1>
              <Coins n={ME.coins} />
            </div>
            <div className={s.tabs} role="tablist">
              {TABS.map((x) => (
                <Pill key={x.id} role="tab" aria-selected={tab === x.id} aria-pressed={tab === x.id} onClick={() => setTab(x.id)}>{x.name}</Pill>
              ))}
            </div>
            <div className={s.items} role="tabpanel">
              {LAYERS[tab].map((v) => {
                const p = part(tab, v);
                return (
                  <button key={v} className={s.item} aria-pressed={look[tab] === v} onClick={() => pick(tab, v)}>
                    <Avatar look={{ ...look, [tab]: v }} size={HEAD_TABS.includes(tab) ? 72 : 64} variant={HEAD_TABS.includes(tab) ? "head" : "full"} label={LABELS[v]} />
                    <b className={s.row} style={{ gap: 6 }}>{SWATCH_TABS.includes(tab) && v !== "none" && <span className={s.swatch} style={{ background: hex(tab, v), width: 14, height: 14, borderWidth: 1 }} aria-hidden />}{LABELS[v]}</b>
                    <span className={s.rar} style={{ background: RARITY[p.rarity] }}>{p.rarity}</span>
                    <span className={s.mono} style={{ fontSize: 13 }}>{p.owned ? "Owned" : p.price ? `${p.price} coins` : "Earn"}</span>
                  </button>
                );
              })}
            </div>
            <div className={s.row}>
              <Button variant="ghost" size="md" onClick={random}>Randomize</Button>
              <Button variant="ghost" size="md" onClick={() => setLook(ME.look)}>Undo</Button>
              <Button onClick={() => flash("Saved")}>Save look</Button>
            </div>
            <p className={s.note}>Items change looks only. Every player answers the same questions on the same timer.</p>
            <div className={s.between} style={{ borderTop: "1px solid var(--hair)", paddingTop: 12 }}>
              <span><b>Show me in the public feed</b><br /><small className={s.muted}>Adults only. Off by default.</small></span>
              <Pill aria-pressed={false}>Off</Pill>
            </div>
          </Card>
        </div>
      </main>
      {toast && <div className={s.toast} role="status">{toast}</div>}
    </>
  );
}
