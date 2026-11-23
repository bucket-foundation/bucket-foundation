import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import styles from "./inventory.module.css";

export const metadata: Metadata = pageMeta({ path: "/design/inventory", title: "Polingual Inventory", description: "Everything built for Polingual, per platform." });

type State = "shipped" | "built" | "in review" | "missing";
type Item = { name: string; path: string; state: State; img?: string; wide?: boolean };
type Section = { title: string; items: Item[] };

const I = "/design/inventory/";
const ios = (size: string, n: string) => `${I}ios-${size}-${n}.webp`;
const STEPS = ["1-onboarding", "2-systems", "3-study", "4-placement", "5-progress", "6-paywall"];
const GAMES = ["babel-match", "flag-tiles", "forehead", "polyword", "shift", "voice-atlas", "word-snake"];
const DESIGN = ["home", "lobby", "controller", "profile", "shop", "tv"];

const SECTIONS: Section[] = [
  {
    title: "iOS and iPadOS",
    items: [
      ...STEPS.map((s) => ({ name: `iPhone ${s.slice(2)}`, path: `apple/Polingual/AppStore/screenshots/iphone-6.9/${s}.png`, state: "shipped" as State, img: ios("iphone-6.9", s) })),
      ...STEPS.map((s) => ({ name: `iPad ${s.slice(2)}`, path: `apple/Polingual/AppStore/screenshots/ipad-13/${s}.png`, state: "shipped" as State, img: ios("ipad-13", s), wide: true })),
      ...["01-translate", "02-heritage-letter", "03-heritage-spell"].map((s) => ({ name: `1.0.1 ${s.slice(3)}`, path: `apple/AppStore/screenshots/polingual-1.0.1/iphone69-${s}.png`, state: "in review" as State, img: `${I}ios101-iphone69-${s}.webp` })),
      { name: "App sources", path: "apple/Polingual/Sources", state: "shipped" },
      { name: "Watch app", path: "apple/Polingual/Watch", state: "built" },
      { name: "Widget", path: "apple/Polingual/Widget", state: "built" },
    ],
  },
  {
    title: "macOS",
    items: [{ name: "PolingualMac", path: "apple/project.yml, apple/Polingual/PolingualMac.entitlements", state: "built" }],
  },
  {
    title: "Android",
    items: [
      { name: "App module", path: "android/polingual", state: "built" },
      { name: "Learn, Study, Today", path: "feat/android-polingual: LearnScreen.kt, StudyScreen.kt, TodayScreen.kt", state: "built" },
      { name: "Games and lobbies", path: "feat/android-polingual: GameScreens.kt, LobbyScreens.kt", state: "built" },
      { name: "Video", path: "feat/android-polingual: VideoScreens.kt", state: "in review" },
      { name: "Rewards", path: "feat/android-polingual: Rewards.kt", state: "in review" },
      { name: "Phone screenshots", path: "com.polingual.app on device", state: "missing" },
    ],
  },
  {
    title: "Web",
    items: [
      { name: "Play hub", path: "/play", state: "built", img: `${I}web-play.webp`, wide: true },
      ...GAMES.map((g) => ({ name: g.replace("-", " "), path: `/play/${g}`, state: "built" as State, img: `${I}web-play-${g}.webp`, wide: true })),
      { name: "Video room", path: "/play/video on feat/polingual-video", state: "in review" },
    ],
  },
  {
    title: "Brand",
    items: [
      ...["mark", "wordmark", "wordtype", "app-icon-1024"].map((k) => ({ name: k, path: `public/brand/kit/${k}.png`, state: "shipped" as State, img: `${I}kit-${k}.webp` })),
      { name: "Brand page", path: "/brand", state: "built", img: `${I}web-brand.webp`, wide: true },
      { name: "Play design", path: "/design/play", state: "built", img: `${I}web-design-play.webp`, wide: true },
      ...DESIGN.map((d) => ({ name: `Play ${d}`, path: `/design/play/${d}`, state: "built" as State, img: `${I}web-design-play-${d}.webp`, wide: true })),
      ...["cover", "d-base", "d-dot", "d-euclid", "e-0", "g-0"].map((d) => ({ name: `Round 2 ${d}`, path: `brand/_round2/thumbs/deck-${d}-390.jpg`, state: "built" as State, img: `${I}r2-deck-${d}.webp` })),
    ],
  },
  {
    title: "Linux, Windows and Rust desktop",
    items: [{ name: "Desktop app", path: "bead bkt-qqxje", state: "missing" }],
  },
];

const STATE_CLASS: Record<State, string> = { shipped: styles.shipped, built: styles.built, "in review": styles.review, missing: styles.missing };

export default function InventoryPage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Polingual inventory</h1>
      {SECTIONS.map((section) => (
        <section key={section.title} className={styles.section}>
          <h2 className={styles.heading}>
            {section.title} <span className={styles.count}>{section.items.length}</span>
          </h2>
          <ul className={styles.grid}>
            {section.items.map((item) => (
              <li key={item.path + item.name} className={item.wide ? `${styles.card} ${styles.wide}` : styles.card}>
                <div className={styles.thumb}>
                  {item.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.img} alt={item.name} loading="lazy" />
                  ) : (
                    <span className={styles.blank}>{item.name.slice(0, 2)}</span>
                  )}
                </div>
                <div className={styles.meta}>
                  <strong>{item.name}</strong>
                  <code>{item.path}</code>
                  <span className={`${styles.state} ${STATE_CLASS[item.state]}`}>{item.state}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
