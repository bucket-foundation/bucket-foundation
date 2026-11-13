import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyGroups } from "./groups";
import { dailyMini } from "./mini";
import { dailySeed, fnv, mixed, SeededRandom } from "./rng";
import { dailySet, formOf, GameDeck, starter } from "./words";
import { nativeCorpus } from "./fixture";

test("xorshift, Lemire draw and FNV match the native reference values", () => {
  const r = new SeededRandom(4n);
  assert.deepEqual([r.next(), r.next(), r.next()], [4329079044n, 4611971995335151878n, 7816862149684023332n]);
  const b = new SeededRandom(4n);
  assert.deepEqual(Array.from({ length: 5 }, () => b.below(10)), [0, 2, 4, 9, 3]);
  assert.equal(fnv("2026-11-12|en|es,fr"), 14495648844298516471n);
  assert.equal(dailySeed("2026-11-12", "en", ["fr", "es"]), 14495648844298516471n);
  assert.equal(new SeededRandom(0n).next(), new SeededRandom(0x9e3779b97f4a7c15n).next());
});

test("shuffle and mixed match Kotlin and Swift for seed 99", () => {
  const ten = Array.from({ length: 10 }, (_, i) => i);
  assert.deepEqual(new SeededRandom(99n).shuffled(ten), [0, 2, 1, 5, 8, 9, 7, 4, 6, 3]);
  assert.deepEqual(mixed(ten, new SeededRandom(99n)), [9, 6, 4, 0, 8, 1, 5, 3, 2, 7]);
});

const DAILY: Record<string, string> = {
  "es,fr|2026-11-12": "es:snow:plata/tierra/cielo/nieve;fr:fire:glace/feu/terre/plage;es:cow:pájaro/caballo/vaca/ratón;fr:hot:rapide/plein/chaud/court;es:money:bolsa/llave/silla/dinero;fr:bad:nouveau/chaud/plein/mauvais",
  "es,fr|2026-11-13": "es:bear:pollo/gato/oso/ojo;fr:poor:heureux/mauvais/propre/pauvre;es:short:lleno/malo/corto/vacío;fr:eat:ouvrir/mourir/venir/manger;es:tomorrow:marido/mes/semana/mañana;fr:wet:froid/triste/grand/mouillé",
  "de,it,pt|2026-11-12": "de:five:fünf/drei/zehn/eins;it:sheep:maiale/ragno/pecora/ape;pt:window:camisa/escola/janela/ponte;de:young:hart/jung/gut/neu;it:bone:sangue/dente/osso/gamba;pt:table:bola/cama/igreja/mesa",
  "de,it,pt|2026-11-13": "de:know:singen/kommen/wissen/rennen;it:night:ora/borsa/notte/mese;pt:live:achar/viver/dizer/tomar;de:eye:Auge/Ohr/Bein/Herz;it:knife:coltello/musica/carta/strada;pt:cry:achar/ouvir/chorar/ajudar",
};

const MINI: Record<string, string> = {
  "es,fr|2026-11-12": "es 1a@0,1:CINCO;2d@0,4:CUATRO;3a@2,1:MITAD;4d@3,0:UNO;5a@4,0:NÚMERO keys=ACDEHILMNORSTUVZÚ",
  "es,fr|2026-11-13": "es 1d@0,0:NUEVE;2d@0,5:CINCO;3a@1,0:UNO;4d@1,2:OCHO;5a@2,2:CIEN keys=ACDEHILMNORSTUVZÚ",
  "de,it,pt|2026-11-12": "de 1a@0,0:SECHS;1d@0,0:SIEBEN;2d@0,3:HÄLFTE;3d@2,5:NEUN;4a@5,2:ZEHN keys=ABCEFHILNRSTUVZÄÜ",
  "de,it,pt|2026-11-13": "pt 1d@0,2:CINCO;2a@1,0:SEIS;2d@1,0:SETE;3a@3,2:CEM;4d@3,4:MIL keys=ACDEILMNOQRSTUVZÚ",
};

const GROUPS: Record<string, string> = {
  "es,fr|2026-11-12": "es/number=thousand,one,nine,zero;es/family=daughter,man,mother,father;fr/family=friend,woman,brother,baby;fr/number=seven,three,nine,number tiles=zero,one,brother,thousand,friend,nine,three,man,seven,mother,nine,woman,number,father,daughter,baby",
  "es,fr|2026-11-13": "fr/number=four,number,eight,zero;fr/family=mother,name,father,people;es/family=child,father,daughter,baby;es/number=seven,nine,eight,number tiles=eight,number,eight,name,number,baby,nine,daughter,child,father,father,zero,mother,seven,people,four",
  "de,it,pt|2026-11-12": "de/family=mother,people,woman,father;de/number=hundred,nine,three,one;it/number=ten,two,half,four;it/family=woman,friend,people,mother tiles=mother,friend,nine,two,ten,father,four,three,hundred,people,people,one,woman,mother,half,woman",
  "de,it,pt|2026-11-13": "de/family=man,daughter,people,woman;de/number=zero,three,nine,four;pt/number=hundred,half,six,ten;pt/family=husband,mother,people,son tiles=half,six,four,man,woman,people,hundred,ten,son,people,nine,husband,zero,daughter,mother,three",
};

for (const targets of [["es", "fr"], ["de", "it", "pt"]]) {
  for (const day of ["2026-11-12", "2026-11-13"]) {
    const key = `${targets.join(",")}|${day}`;
    test(`daily games match the native goldens for ${key}`, () => {
      const corpus = nativeCorpus();
      const set = dailySet(new GameDeck(corpus, "en", targets), day);
      assert.equal(set.map((p) => `${p.word.lang}:${p.word.itemId}:${p.choices.join("/")}`).join(";"), DAILY[key]);
      const m = dailyMini(starter("en", targets, corpus), day, "en", targets);
      assert.equal(`${m?.lang} ${m?.entries.map((e) => `${e.number}${e.across ? "a" : "d"}@${e.row},${e.col}:${e.letters.join("")}`).join(";")} keys=${m?.keys.join("")}`, MINI[key]);
      const g = dailyGroups(starter("en", targets, corpus, 60), day, "en", targets, (w) => corpus.byId.get(w.itemId)?.category ?? null, (w, l) => {
        const item = corpus.byId.get(w.itemId);
        return !!item && formOf(item, l)?.toLowerCase() === w.form.toLowerCase();
      });
      const desc = g?.groups.map((x) => `${x.link.kind === "theme" ? x.link.theme : x.link.lang}/${x.link.kind === "languageTheme" ? x.link.theme : x.link.kind}=${x.words.map((w) => w.itemId).join(",")}`).join(";");
      assert.equal(`${desc} tiles=${g?.tiles.map((w) => w.itemId).join(",")}`, GROUPS[key]);
    });
  }
}
