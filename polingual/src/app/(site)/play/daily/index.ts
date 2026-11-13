import type { ArtName } from "@/ui/art";
import type { DailyGame } from "@/lib/daily/store";

export interface DailyGameCard {
  slug: DailyGame;
  href: string;
  title: string;
  blurb: string;
  art: ArtName;
  daily: true;
}

export const DAILY_GAMES: DailyGameCard[] = [
  { slug: "daily-set", href: "/play/daily-set", title: "Daily Set", blurb: "Six words. The same six for everyone on your languages today.", art: "bunting", daily: true },
  { slug: "mini", href: "/play/mini", title: "Mini", blurb: "A small crossword in your language. New every day.", art: "girih", daily: true },
  { slug: "word-groups", href: "/play/word-groups", title: "Word Groups", blurb: "Sort sixteen of your words into four groups. New every day.", art: "sk-kente", daily: true },
  { slug: "speed-match", href: "/play/speed-match", title: "Speed Match", blurb: "Pair words against a 60 second clock.", art: "streak-flame", daily: true },
  { slug: "which-voice", href: "/play/which-voice", title: "Which Voice", blurb: "Listen, then pick the flag.", art: "script-he", daily: true },
  { slug: "letter-sprint", href: "/play/letter-sprint", title: "Letter Sprint", blurb: "Hear a sound, then find its letter.", art: "calligraphy-ain", daily: true },
];
