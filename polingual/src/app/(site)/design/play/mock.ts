import type { Look } from "../../play-kit/tokens";

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
  look: { body: "#D9381E", face: "grin", hat: "beret", outfit: "scarf", plinth: "#26428B" },
};

export const FRIENDS: Player[] = [
  { handle: "ana.sol", lang: "es", country: "Spain", tier: 5, level: 22, coins: 0, look: { body: "#E9A23B", face: "smile", hat: "sombrero", outfit: "stripe", plinth: "#5B1A4A" }, online: true, where: "Flags room, 6 of 8" },
  { handle: "kenji", lang: "ja", country: "Japan", tier: 3, level: 9, coins: 0, look: { body: "#6FB7C2", face: "cool", hat: "cap", outfit: "plain", plinth: "#1E7A5A" }, online: true, where: "Tiles, round 4" },
  { handle: "lea.b", lang: "fr", country: "France", tier: 6, level: 31, coins: 0, look: { body: "#26428B", face: "wow", hat: "crown", outfit: "cape", plinth: "#E9A23B" }, online: true, where: "In the lobby" },
  { handle: "omar.k", lang: "ar", country: "Egypt", tier: 2, level: 5, coins: 0, look: { body: "#1E7A5A", face: "smile", hat: "none", outfit: "scarf", plinth: "#D9381E" }, online: false },
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
  { handle: "nonna.r", lang: "it", points: 940, look: { body: "#5B1A4A", face: "smile" as const, hat: "crown" as const, outfit: "cape" as const, plinth: "#E9A23B" } },
  { handle: "gio.polly", lang: "it", points: 815, look: ME.look },
  { handle: "sofi", lang: "it", points: 610, look: { body: "#6FB7C2", face: "wow" as const, hat: "cap" as const, outfit: "stripe" as const, plinth: "#1E7A5A" } },
  { handle: "marco", lang: "it", points: 240, look: { body: "#E9A23B", face: "cool" as const, hat: "none" as const, outfit: "plain" as const, plinth: "#26428B" } },
];

export const ANSWERS = [
  { color: "#D9381E", shape: "triangle", text: "dog" },
  { color: "#26428B", shape: "diamond", text: "house" },
  { color: "#E9A23B", shape: "circle", text: "water" },
  { color: "#1E7A5A", shape: "square", text: "bread" },
] as const;

export const SHOP = [
  { id: "beret", name: "Paris beret", slot: "hat", rarity: "Common", price: 150, owned: true },
  { id: "sombrero", name: "Fiesta sombrero", slot: "hat", rarity: "Rare", price: 400, owned: false },
  { id: "crown", name: "Lapis crown", slot: "hat", rarity: "Epic", price: 900, owned: false },
  { id: "cape", name: "Flag cape", slot: "outfit", rarity: "Rare", price: 400, owned: false },
  { id: "stripe", name: "Sailor stripe", slot: "outfit", rarity: "Common", price: 150, owned: true },
  { id: "cap", name: "Tokyo cap", slot: "hat", rarity: "Common", price: 150, owned: false },
  { id: "plinth-gold", name: "Gold plinth", slot: "plinth", rarity: "Legendary", price: 2000, owned: false },
  { id: "plinth-maya", name: "Maya plinth", slot: "plinth", rarity: "Earn only", price: 0, owned: false },
];

export const PACKS = [
  { name: "Handful", coins: 500, price: "$0.99" },
  { name: "Pouch", coins: 1200, price: "$1.99" },
  { name: "Chest", coins: 3500, price: "$4.99", best: true },
  { name: "Vault", coins: 8000, price: "$9.99" },
];

export const RARITY: Record<string, string> = { Common: "#6FB7C2", Rare: "#26428B", Epic: "#5B1A4A", Legendary: "#E9A23B", "Earn only": "#1E7A5A" };
