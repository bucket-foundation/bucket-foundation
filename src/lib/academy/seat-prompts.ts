import type { LangItem } from "./lang-systems";
import type { LobbyPromptRow } from "./lobbies";
import { seededRandom } from "./lobbies";
import type { FairCard } from "./fair-score";

const FOILS = 3;

export function answerLangFor(card: FairCard | null, wordLang: string, root: string, item: Pick<LangItem, "forms">): string | null {
  if (!card) return null;
  const spoken = card.speaks.find((s) => s.lang === wordLang);
  if (spoken && spoken.level >= 3) return card.learn.find((l) => l !== wordLang && item.forms[l]) ?? null;
  const known = card.speaks.filter((s) => s.lang !== wordLang && item.forms[s.lang]).sort((a, b) => b.level - a.level)[0]?.lang ?? null;
  return known && known !== root ? known : null;
}

function seedOf(s: string): string {
  let h = BigInt(1469598103934665603);
  for (const c of s) h = BigInt.asUintN(64, (h ^ BigInt(c.charCodeAt(0))) * BigInt(1099511628211));
  return h.toString();
}

export function seatPrompt(row: LobbyPromptRow, items: readonly LangItem[], byId: (id: string) => LangItem | undefined, card: FairCard | null, root: string, key: string): LobbyPromptRow {
  if (row.mode !== "form") return row;
  const item = byId(row.item_id);
  if (!item?.forms[row.lang]) return row;
  const lang = answerLangFor(card, row.lang, root, item);
  if (!lang) return row;
  const answer = item.forms[lang];
  const rand = seededRandom(seedOf(`${key}|${row.round}`));
  const taken = new Set([answer.toLowerCase()]);
  const foils: string[] = [];
  const pool = items.filter((i) => i.id !== item.id && i.kind === "word" && i.forms[lang]);
  const same = pool.filter((i) => i.category === item.category);
  for (const list of [same, pool]) {
    const start = Math.floor(rand() * Math.max(1, list.length));
    for (let k = 0; k < list.length && foils.length < FOILS; k++) {
      const f = list[(start + k) % list.length].forms[lang];
      if (taken.has(f.toLowerCase())) continue;
      taken.add(f.toLowerCase());
      foils.push(f);
    }
  }
  if (!foils.length) return row;
  const choices = [answer, ...foils];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { ...row, mode: "meaning", gloss: item.forms[row.lang], choices, answer };
}
