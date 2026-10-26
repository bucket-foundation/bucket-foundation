import type { EngineState } from "./engine";

export type MarkPolicy = "strip" | "lenient" | "keep";
export type SpellVerdict = "exact" | "close" | "wrong";

export interface ScriptInfo {
  script: string;
  title: string;
  marks: MarkPolicy;
  width?: boolean;
}

export const SCRIPTS: Record<string, ScriptInfo> = {
  ru: { script: "cyrillic", title: "Cyrillic alphabet", marks: "strip" },
  el: { script: "greek", title: "Greek alphabet", marks: "lenient" },
  grc: { script: "greek-ancient", title: "Ancient Greek alphabet", marks: "lenient" },
  ar: { script: "arabic", title: "Arabic alphabet", marks: "strip" },
  fa: { script: "persian", title: "Persian alphabet", marks: "strip" },
  he: { script: "hebrew", title: "Hebrew alef-bet", marks: "strip" },
  hi: { script: "devanagari", title: "Devanagari", marks: "keep" },
  sa: { script: "devanagari-sanskrit", title: "Devanagari for Sanskrit", marks: "keep" },
  ta: { script: "tamil", title: "Tamil script", marks: "keep" },
  th: { script: "thai", title: "Thai letters", marks: "keep" },
  ja: { script: "hiragana", title: "Hiragana and katakana", marks: "keep", width: true },
  zh: { script: "zhuyin", title: "Zhuyin sounds", marks: "keep", width: true },
  ko: { script: "hangul", title: "Hangul letters", marks: "keep", width: true },
};

export const HERITAGE_LANGS = Object.keys(SCRIPTS);

const ARABIC_MARKS = /[ً-ٰٟۖ-ۭـ]/g;
const HEBREW_MARKS = /[֑-ׇֽֿׁׂׅׄ]/g;
export const FOLDABLE_MARKS = /(?<![\u0400-\u04ff])[\u0306\u0308]|[\u0300-\u0305\u0307\u0309-\u036f]/g;
const PUNCT = /[\s.,;:!?¿¡"'«»()\-־،؟。、！？]+/g;

function base(s: string, lang: string): string {
  const info = SCRIPTS[lang];
  const t = s.normalize(info?.width ? "NFKC" : "NFC").toLowerCase().replace(PUNCT, " ").trim();
  return t.replace(/ +/g, " ");
}

export function foldMarks(s: string, lang: string, keepYo = false): string {
  let t = base(s, lang);
  if (lang === "ar" || lang === "fa") t = t.replace(ARABIC_MARKS, "");
  if (lang === "fa") t = t.replace(/ي/g, "ی").replace(/ك/g, "ک");
  if (lang === "he") t = t.replace(HEBREW_MARKS, "");
  if (lang === "ru" && !keepYo) t = t.replace(/ё/g, "е");
  if (SCRIPTS[lang]?.marks !== "keep") t = t.normalize("NFD").replace(FOLDABLE_MARKS, "").normalize("NFC");
  return t;
}

export function scriptDistance(a: string, b: string): number {
  const x = Array.from(a);
  const y = Array.from(b);
  const d = Array.from({ length: x.length + 1 }, (_, i) => Array.from({ length: y.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
  }
  return d[x.length][y.length];
}

export function judgeSpelled(given: string, expected: string | string[], lang: string): SpellVerdict {
  const g = base(given, lang);
  if (!g) return "wrong";
  const policy = SCRIPTS[lang]?.marks ?? "keep";
  let best: SpellVerdict = "wrong";
  for (const exp of Array.isArray(expected) ? expected : [expected]) {
    const e = base(exp, lang);
    if (g === e) return "exact";
    const gf = foldMarks(given, lang);
    const ef = foldMarks(exp, lang);
    if (gf === ef) {
      if (policy === "strip" && foldMarks(given, lang, true) === foldMarks(exp, lang, true)) return "exact";
      best = "close";
      continue;
    }
    if (Array.from(ef).length >= 4 && scriptDistance(gf, ef) <= 1) best = "close";
  }
  return best;
}

export interface Letter {
  ch: string;
  sound: string;
  name?: string;
}

export interface AlphabetUnit {
  id: string;
  lang: string;
  script: string;
  title: string;
  letters: Letter[];
}

const pairs = (s: string): Letter[] =>
  s.split(" ").map((p) => {
    const [ch, rest] = p.split("=");
    const [sound, name] = rest.split(":");
    return name ? { ch, sound, name: name.replace(/_/g, " ") } : { ch, sound };
  });

const DEVANAGARI =
  "अ=a आ=ā इ=i ई=ī उ=u ऊ=ū ऋ=ṛ ए=e ऐ=ai ओ=o औ=au क=ka ख=kha ग=ga घ=gha ङ=ṅa च=ca छ=cha ज=ja झ=jha ञ=ña ट=ṭa ठ=ṭha ड=ḍa ढ=ḍha ण=ṇa त=ta थ=tha द=da ध=dha न=na प=pa फ=pha ब=ba भ=bha म=ma य=ya र=ra ल=la व=va श=śa ष=ṣa स=sa ह=ha ◌ा=-ā ◌ि=-i ◌ी=-ī ◌ु=-u ◌ू=-ū ◌ृ=-ṛ ◌े=-e ◌ै=-ai ◌ो=-o ◌ौ=-au";

const LETTERS: Record<string, string> = {
  ru: "а=a б=b в=v г=g д=d е=ye ё=yo ж=zh з=z и=i й=y к=k л=l м=m н=n о=o п=p р=r с=s т=t у=u ф=f х=kh ц=ts ч=ch ш=sh щ=shch ъ=hard-sign ы=y ь=soft-sign э=e ю=yu я=ya",
  el: "α=a β=v γ=gh δ=dh ε=e ζ=z η=i θ=th ι=i κ=k λ=l μ=m ν=n ξ=ks ο=o π=p ρ=r σ=s τ=t υ=i φ=f χ=kh ψ=ps ω=o",
  grc: "α=a β=b γ=g δ=d ε=e ζ=zd η=ē θ=tʰ ι=i κ=k λ=l μ=m ν=n ξ=ks ο=o π=p ρ=r σ=s τ=t υ=y φ=pʰ χ=kʰ ψ=ps ω=ō",
  ar: "ا=ā ب=b ت=t ث=th ج=j ح=ḥ خ=kh د=d ذ=dh ر=r ز=z س=s ش=sh ص=ṣ ض=ḍ ط=ṭ ظ=ẓ ع=ʿ غ=gh ف=f ق=q ك=k ل=l م=m ن=n ه=h و=w ي=y",
  fa: "ا=ā:alef ب=b:be پ=p:pe ت=t:te ث=s:se ج=j:jim چ=ch:che ح=h:he-ye_jimi خ=kh:khe د=d:dal ذ=z:zal ر=r:re ز=z:ze ژ=zh:zhe س=s:sin ش=sh:shin ص=s:sad ض=z:zad ط=t:ta ظ=z:za ع=ʔ:eyn غ=gh:gheyn ف=f:fe ق=gh:ghaf ک=k:kaf گ=g:gaf ل=l:lam م=m:mim ن=n:nun و=v:vav ه=h:he ی=y:ye",
  he: "א=silent ב=b/v ג=g ד=d ה=h ו=v ז=z ח=kh ט=t י=y כ=k/kh ל=l מ=m נ=n ס=s ע=silent פ=p/f צ=ts ק=k ר=r ש=sh/s ת=t",
  hi: DEVANAGARI,
  sa: DEVANAGARI.replace("ऋ=ṛ", "ऋ=ṛ ॠ=ṝ ऌ=ḷ"),
  ta: "அ=a ஆ=ā இ=i ஈ=ī உ=u ஊ=ū எ=e ஏ=ē ஐ=ai ஒ=o ஓ=ō ஔ=au க=ka ங=ṅa ச=ca ஞ=ña ட=ṭa ண=ṇa த=ta ந=na ப=pa ம=ma ய=ya ர=ra ல=la வ=va ழ=ḻa ள=ḷa ற=ṟa ன=ṉa ◌ா=-ā ◌ி=-i ◌ீ=-ī ◌ு=-u ◌ூ=-ū ◌ெ=-e ◌ே=-ē ◌ை=-ai ◌ொ=-o ◌ோ=-ō ◌ௌ=-au",
  th: "ก=k:ko_kai ข=kh:kho_khai ฃ=kh:kho_khuat ค=kh:kho_khwai ฅ=kh:kho_khon ฆ=kh:kho_rakhang ง=ng:ngo_ngu จ=ch:cho_chan ฉ=ch:cho_ching ช=ch:cho_chang ซ=s:so_so ฌ=ch:cho_choe ญ=y:yo_ying ฎ=d:do_chada ฏ=t:to_patak ฐ=th:tho_than ฑ=th:tho_montho ฒ=th:tho_phuthao ณ=n:no_nen ด=d:do_dek ต=t:to_tao ถ=th:tho_thung ท=th:tho_thahan ธ=th:tho_thong น=n:no_nu บ=b:bo_baimai ป=p:po_pla ผ=ph:pho_phueng ฝ=f:fo_fa พ=ph:pho_phan ฟ=f:fo_fan ภ=ph:pho_samphao ม=m:mo_ma ย=y:yo_yak ร=r:ro_ruea ล=l:lo_ling ว=w:wo_waen ศ=s:so_sala ษ=s:so_ruesi ส=s:so_suea ห=h:ho_hip ฬ=l:lo_chula อ=ʔ:o_ang ฮ=h:ho_nokhuk ◌ะ=-a ◌า=-ā ◌ิ=-i ◌ี=-ī ◌ึ=-ue ◌ื=-ūe ◌ุ=-u ◌ู=-ū เ◌=e- แ◌=ae- โ◌=o- ใ◌=ai-:sara_ai_maimuan ไ◌=ai-:sara_ai_maimalai ◌ำ=-am",
  ja: "あ=a い=i う=u え=e お=o か=ka き=ki く=ku け=ke こ=ko さ=sa し=shi す=su せ=se そ=so た=ta ち=chi つ=tsu て=te と=to な=na に=ni ぬ=nu ね=ne の=no は=ha ひ=hi ふ=fu へ=he ほ=ho ま=ma み=mi む=mu め=me も=mo や=ya ゆ=yu よ=yo ら=ra り=ri る=ru れ=re ろ=ro わ=wa を=wo ん=n ア=a イ=i ウ=u エ=e オ=o カ=ka キ=ki ク=ku ケ=ke コ=ko サ=sa シ=shi ス=su セ=se ソ=so タ=ta チ=chi ツ=tsu テ=te ト=to ナ=na ニ=ni ヌ=nu ネ=ne ノ=no ハ=ha ヒ=hi フ=fu ヘ=he ホ=ho マ=ma ミ=mi ム=mu メ=me モ=mo ヤ=ya ユ=yu ヨ=yo ラ=ra リ=ri ル=ru レ=re ロ=ro ワ=wa ヲ=wo ン=n",
  zh: "ㄅ=b ㄆ=p ㄇ=m ㄈ=f ㄉ=d ㄊ=t ㄋ=n ㄌ=l ㄍ=g ㄎ=k ㄏ=h ㄐ=j ㄑ=q ㄒ=x ㄓ=zh ㄔ=ch ㄕ=sh ㄖ=r ㄗ=z ㄘ=c ㄙ=s ㄧ=i ㄨ=u ㄩ=ü ㄚ=a ㄛ=o ㄜ=e ㄝ=ê ㄞ=ai ㄟ=ei ㄠ=ao ㄡ=ou ㄢ=an ㄣ=en ㄤ=ang ㄥ=eng ㄦ=er",
  ko: "ㄱ=g ㄴ=n ㄷ=d ㄹ=r/l ㅁ=m ㅂ=b ㅅ=s ㅇ=ng ㅈ=j ㅊ=ch ㅋ=k ㅌ=t ㅍ=p ㅎ=h ㅏ=a ㅑ=ya ㅓ=eo ㅕ=yeo ㅗ=o ㅛ=yo ㅜ=u ㅠ=yu ㅡ=eu ㅣ=i",
};

export function alphabetUnit(lang: string): AlphabetUnit | null {
  const info = SCRIPTS[lang];
  const raw = LETTERS[lang];
  if (!info || !raw) return null;
  return { id: `alphabet-${info.script}`, lang, script: info.script, title: info.title, letters: pairs(raw) };
}

export function letterItemId(ch: string): string {
  return `abc:${ch}`;
}

export function letterCardId(lang: string, ch: string): string {
  return `${lang}:${letterItemId(ch)}`;
}

export function nextLetters(state: EngineState, lang: string, n = 5): Letter[] {
  const unit = alphabetUnit(lang);
  if (!unit) return [];
  const fresh = (ls: Letter[]) => ls.filter((l) => !state.cards[letterCardId(lang, l.ch)]);
  const [core, extras] = letterBlocks(unit);
  const pool = blockDone(state, lang, core) ? [...fresh(extras), ...fresh(core)] : fresh(core);
  return pool.slice(0, n);
}

export function dueLetters(state: EngineState, lang: string, now: number = Date.now()): Letter[] {
  const unit = alphabetUnit(lang);
  if (!unit) return [];
  return unit.letters.filter((l) => {
    const c = state.cards[letterCardId(lang, l.ch)];
    return c?.due != null && c.due <= now;
  });
}

export function isBaseLetter(ch: string): boolean {
  return !ch.includes("◌") && !/[\u30a0-\u30ff]/.test(ch);
}

function letterBlocks(unit: AlphabetUnit): [Letter[], Letter[]] {
  return [unit.letters.filter((l) => isBaseLetter(l.ch)), unit.letters.filter((l) => !isBaseLetter(l.ch))];
}

function blockDone(state: EngineState, lang: string, block: Letter[], share = 0.8): boolean {
  const seen = block.filter((l) => (state.cards[letterCardId(lang, l.ch)]?.reps ?? 0) > 0).length;
  return seen >= Math.ceil(block.length * share);
}

export function alphabetDone(state: EngineState, lang: string, share = 0.8): boolean {
  const unit = alphabetUnit(lang);
  if (!unit) return true;
  const [core, extras] = letterBlocks(unit);
  return blockDone(state, lang, core, share) && blockDone(state, lang, extras, share);
}
