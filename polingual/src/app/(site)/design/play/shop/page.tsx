"use client";

import { useState } from "react";
import Header from "../Header";
import { ME, PACKS, RARITY, SHOP } from "../mock";
import { normalizeLook } from "@/ui/avatar";
import { Avatar, Coins } from "../../../play-kit/parts";
import s from "../design.module.css";
import { Button, ButtonLink, Card, Pill, buttonClass } from "@/ui";

type Item = (typeof SHOP)[number];

const SLOTS = ["All", "hat", "outfit", "face", "accessory", "plinth", "frame"];
const FEATURED_BG = ["#D9381E", "#26428B", "#5B1A4A", "#1E7A5A"];

export default function ShopMock() {
  const [coins, setCoins] = useState(ME.coins);
  const [slot, setSlot] = useState("All");
  const [owned, setOwned] = useState<Set<string>>(new Set(SHOP.filter((x) => x.owned).map((x) => x.id)));
  const [sheet, setSheet] = useState<Item | null>(null);
  const [teen, setTeen] = useState(false);

  const lookFor = (x: Item) => normalizeLook({ ...ME.look, [x.slot]: x.v });
  const headOnly = (x: Item) => x.slot === "face" || x.slot === "accessory";

  const buy = (x: Item) => {
    if (coins < x.price) return;
    setCoins(coins - x.price);
    setOwned(new Set([...owned, x.id]));
    setSheet(null);
  };

  const shown = SHOP.filter((x) => slot === "All" || x.slot === slot);

  return (
    <>
      <Header />
      <main className={s.main}>
        <div className={s.between}>
          <div>
            <p className={s.label}>Shop</p>
            <h1 className={s.title}>Look the part</h1>
          </div>
          <Coins n={coins} />
        </div>

        <section aria-label="Featured today">
          <div className={s.between}><h2>Today</h2><span className={s.mono} style={{ fontSize: 12 }}>NEW SET TOMORROW</span></div>
          <div className={s.shopTop} style={{ marginTop: 10 }}>
            {SHOP.filter((x) => x.price > 0).slice(1, 5).map((x, i) => (
              <button key={x.id} className={s.feat} style={{ background: FEATURED_BG[i], border: 0, font: "inherit", cursor: "pointer" }} onClick={() => setSheet(x)}>
                <Avatar look={lookFor(x)} size={96} variant={headOnly(x) ? "head" : "full"} label={x.name} bounce />
                <b>{x.name}</b>
                <span className={s.rar} style={{ background: "rgba(0,0,0,.25)" }}>{x.rarity}</span>
                <span className={s.coins} style={{ color: "var(--ink)" }}><span className={s.coin} />{x.price}</span>
              </button>
            ))}
          </div>
        </section>

        <Card as="section">
          <div className={s.tabs}>
            {SLOTS.map((t) => <Pill key={t} aria-pressed={slot === t} onClick={() => setSlot(t)}>{t[0].toUpperCase() + t.slice(1)}</Pill>)}
          </div>
          <div className={s.items} style={{ marginTop: 12 }}>
            {shown.map((x) => (
              <button key={x.id} className={s.item} aria-pressed={owned.has(x.id)} onClick={() => setSheet(x)}>
                <Avatar look={lookFor(x)} size={headOnly(x) ? 72 : 64} variant={headOnly(x) ? "head" : "full"} label={x.name} />
                <b>{x.name}</b>
                <span className={s.rar} style={{ background: RARITY[x.rarity] }}>{x.rarity}</span>
                <span className={s.mono} style={{ fontSize: 13 }}>{owned.has(x.id) ? "Owned" : x.price ? `${x.price} coins` : "30 day streak"}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card as="section">
          <div className={s.between}>
            <h2>Coins</h2>
            <Pill aria-pressed={teen} onClick={() => setTeen(!teen)}>Preview as 13 to 17</Pill>
          </div>
          <p className={s.muted} style={{ margin: "6px 0 12px" }}>Earn about 120 coins a day by playing. Packs never expire. In the app they go through the App Store or Google Play.</p>
          <div className={s.packs}>
            {PACKS.map((p, i) => (
              <button key={p.name} className={s.pack}>
                {p.best && <span className={s.best}>BEST VALUE</span>}
                <span className={s.pile}>{Array.from({ length: i + 1 }, (_, k) => <span key={k} className={s.coin} />)}</span>
                <b>{p.name}</b>
                <span className={s.mono}>{p.coins.toLocaleString("en-US")}</span>
                <span className={buttonClass({ size: "sm" })}>{p.price}</span>
              </button>
            ))}
          </div>
          {teen && <p className={s.note} style={{ marginTop: 12 }}>Under 18: purchases ask a parent through Ask to Buy or Google Play family approval. Web packs need a parent as payer, $50 a month cap.</p>}
        </Card>

        <Card as="section" style={{ background: "var(--tyrian)", color: "var(--parchment)" }}>
          <h2 style={{ color: "var(--parchment)" }}>Polingual Pro</h2>
          <p style={{ margin: "6px 0 12px" }}>No ads, the full learning layer, your missed words as a review deck, and 300 coins every month.</p>
          <ButtonLink href="/app?from=play">See Pro</ButtonLink>
        </Card>
      </main>

      {sheet && (
        <>
          <button className={s.scrim} aria-label="Close" onClick={() => setSheet(null)} />
          <div className={s.sheet} role="dialog" aria-label={sheet.name}>
            <Avatar look={lookFor(sheet)} size={160} label={sheet.name} bounce />
            <h2>{sheet.name}</h2>
            <span className={s.rar} style={{ background: RARITY[sheet.rarity] }}>{sheet.rarity}</span>
            {owned.has(sheet.id) ? (
              <Button onClick={() => setSheet(null)}>Equip</Button>
            ) : sheet.price === 0 ? (
              <p className={s.muted}>Earn only. Reach a 30 day streak.</p>
            ) : coins >= sheet.price ? (
              <Button onClick={() => buy(sheet)}>Get for {sheet.price} coins</Button>
            ) : (
              <>
                <p className={s.muted}>You need {sheet.price - coins} more coins.</p>
                <Button>Get {PACKS.find((p) => p.coins + coins >= sheet.price)?.name} pack</Button>
              </>
            )}
            <span className={s.muted} style={{ fontSize: 13 }}>About ${(sheet.price / 505).toFixed(2)} in coin pack value</span>
          </div>
        </>
      )}
    </>
  );
}
