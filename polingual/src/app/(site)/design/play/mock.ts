import type { Layer, Look } from "@/ui/avatar";

export type { Look };
export { TIERS } from "../../play-kit/tokens";

export type Player = { handle: string; lang: string; country: string; tier: number; level: number; coins: number; look: Look; online?: boolean; where?: string };


export const ME: Player = {
  handle: "gio.polly",
  lang: "it",
  country: "Italy",
  tier: 4,
  level: 14,
  coins: 1340,
  look: { backdrop: "maya", plinth: "lapis", shape: "round", skin: "sand", color: "vermilion", outfit: "scarf", face: "grin", hat: "beret", accessory: "pin", frame: "ring" },
};

export const FRIENDS: Player[] = [
  { handle: "ana.sol", lang: "es", country: "Spain", tier: 5, level: 22, coins: 0, look: { backdrop: "parchment", plinth: "tyrian", shape: "bell", skin: "clay", color: "ochre", outfit: "stripe", face: "smile", hat: "sombrero", accessory: "none", frame: "sparkle" }, online: true, where: "Flags room, 6 of 8" },
  { handle: "kenji", lang: "ja", country: "Japan", tier: 3, level: 9, coins: 0, look: { backdrop: "ochre", plinth: "malachite", shape: "tall", skin: "porcelain", color: "maya", outfit: "vest", face: "proud", hat: "cap", accessory: "shades", frame: "none" }, online: true, where: "Tiles, round 4" },
  { handle: "lea.b", lang: "fr", country: "France", tier: 6, level: 31, coins: 0, look: { backdrop: "tyrian", plinth: "ochre", shape: "round", skin: "umber", color: "lapis", outfit: "cape", face: "wow", hat: "crown", accessory: "medal", frame: "laurel" }, online: true, where: "In the lobby" },
  { handle: "omar.k", lang: "ar", country: "Egypt", tier: 2, level: 5, coins: 0, look: { backdrop: "maya", plinth: "vermilion", shape: "block", skin: "cocoa", color: "malachite", outfit: "scarf", face: "shy", hat: "none", accessory: "headphones", frame: "none" }, online: false },
];

export const COUNTERS = [
  { label: "Players online", value: "2,410" },
  { label: "Rooms filling", value: "37" },
  { label: "Games today", value: "18,902" },
  { label: "Countries", value: "64" },
];

export const FEED = [
  { who: "ana.sol", lang: "es", text: "won Flags in room K7M2QX", ago: "now", kind: "win" },
  { who: "Garcia family", lang: "es", text: "started Same word on a TV", ago: "12 s", kind: "group" },
  { who: "A player from Japan", lang: "ja", text: "hit a 30 day streak", ago: "40 s", kind: "streak" },
  { who: "Tiles room 4QPT9B", lang: "de", text: "has 7 of 8 players", ago: "1 min", kind: "room" },
  { who: "lea.b", lang: "fr", text: "promoted to Vermilion league", ago: "2 min", kind: "rank" },
  { who: "A player from Brazil", lang: "pt", text: "won Same word against 11 players", ago: "3 min", kind: "win" },
];

export const ROOMS = [
  { code: "K7M2QX", game: "Flags", langs: ["es", "fr", "it", "pt"], filled: 6, size: 8, friends: 1 },
  { code: "4QPT9B", game: "Tiles", langs: ["de", "nl", "sv"], filled: 7, size: 8, friends: 0 },
  { code: "ZR8WD1", game: "Same word", langs: ["ja", "zh", "ko"], filled: 3, size: 10, friends: 1 },
];

export const GROUPS = [
  { name: "Rossi family", kind: "family", members: 5, online: 2, rank: 1, color: "#D9381E" },
  { name: "Spanish club", kind: "friends", members: 14, online: 6, rank: 3, color: "#26428B" },
];

export const GROUP_BOARD = [
  { handle: "nonna.r", lang: "it", points: 940, look: { backdrop: "ochre", plinth: "ochre", shape: "bell", skin: "honey", color: "tyrian", outfit: "cape", face: "proud", hat: "crown", accessory: "glasses", frame: "rays" } as Look },
  { handle: "gio.polly", lang: "it", points: 815, look: ME.look },
  { handle: "sofi", lang: "it", points: 610, look: { backdrop: "vermilion", plinth: "malachite", shape: "tall", skin: "sand", color: "maya", outfit: "stripe", face: "starry", hat: "beanie", accessory: "none", frame: "none" } as Look },
  { handle: "marco", lang: "it", points: 240, look: { backdrop: "lapis", plinth: "lapis", shape: "block", skin: "umber", color: "ochre", outfit: "bowtie", face: "wink", hat: "fez", accessory: "none", frame: "none" } as Look },
];

export const ANSWERS = [
  { color: "#D9381E", shape: "triangle", text: "dog" },
  { color: "#26428B", shape: "diamond", text: "house" },
  { color: "#E9A23B", shape: "circle", text: "water" },
  { color: "#1E7A5A", shape: "square", text: "bread" },
] as const;

export const SHOP: { id: string; name: string; slot: Layer; v: string; rarity: string; price: number; owned: boolean }[] = [
  { id: "beret", name: "Paris beret", slot: "hat", v: "beret", rarity: "Common", price: 150, owned: true },
  { id: "sombrero", name: "Fiesta sombrero", slot: "hat", v: "sombrero", rarity: "Rare", price: 400, owned: false },
  { id: "crown", name: "Lapis crown", slot: "hat", v: "crown", rarity: "Epic", price: 900, owned: false },
  { id: "laurel", name: "Olympian laurel", slot: "hat", v: "laurel", rarity: "Epic", price: 900, owned: false },
  { id: "cape", name: "Flag cape", slot: "outfit", v: "cape", rarity: "Rare", price: 400, owned: false },
  { id: "stripe", name: "Sailor stripe", slot: "outfit", v: "stripe", rarity: "Common", price: 150, owned: true },
  { id: "cap", name: "Tokyo cap", slot: "hat", v: "cap", rarity: "Common", price: 150, owned: false },
  { id: "starry", name: "Starry eyes", slot: "face", v: "starry", rarity: "Rare", price: 400, owned: false },
  { id: "headphones", name: "Listening kit", slot: "accessory", v: "headphones", rarity: "Common", price: 150, owned: false },
  { id: "monocle", name: "Professor monocle", slot: "accessory", v: "monocle", rarity: "Rare", price: 400, owned: false },
  { id: "plinth-gold", name: "Gold plinth", slot: "plinth", v: "ochre", rarity: "Legendary", price: 2000, owned: false },
  { id: "plinth-maya", name: "Maya plinth", slot: "plinth", v: "maya", rarity: "Earn only", price: 0, owned: false },
  { id: "frame-rays", name: "Sun rays", slot: "frame", v: "rays", rarity: "Legendary", price: 2000, owned: false },
];

export const PACKS = [
  { name: "Handful", coins: 500, price: "$0.99" },
  { name: "Pouch", coins: 1200, price: "$1.99" },
  { name: "Chest", coins: 3500, price: "$4.99", best: true },
  { name: "Vault", coins: 8000, price: "$9.99" },
];

export const RARITY: Record<string, string> = { Common: "#6FB7C2", Rare: "#26428B", Epic: "#5B1A4A", Legendary: "#E9A23B", "Earn only": "#1E7A5A" };
