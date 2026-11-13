export const PLAN_DOCS = [
  { slug: "android-plan", title: "Android Native Plan", file: "docs/internal/android/ANDROID-NATIVE-PLAN.md" },
  { slug: "android-research", title: "Android Surfaces Research", file: "docs/internal/android/android-surfaces-research.md" },
  { slug: "apple-plan", title: "Apple Native Plan", file: "docs/internal/APPLE-NATIVE-PLAN.md" },
  { slug: "polingual-games", title: "Polingual Games Research", file: "docs/internal/polingual/GAMES-RESEARCH.md" },
  { slug: "polingual-ideal", title: "Polingual Play Ideal State", file: "docs/internal/polingual/PLAY-IDEAL-STATE.md" },
] as const;

export const plansEnabled = () => process.env.NODE_ENV !== "production";
