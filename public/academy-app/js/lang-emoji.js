/* lang-emoji.js, concept → emoji map for the Languages deck (bkt-3s9).
 *
 * Powers the "can't-fail picture multiple-choice" exercise: when an atom's id
 * (the clean English concept, e.g. "water", "dog", "one") has an emoji here,
 * langMultipleChoice() shows the EMOJI as the prompt ("Which one is 💧?") with
 * the target-language words as options, a true picture choice, the Duolingo hook.
 * Atoms without an emoji fall back to the word/gloss prompt.
 *
 * Curated for the CONCRETE concepts a beginner meets first (numbers, colors,
 * family, animals, body, nature, food, common objects). Abstract/grammatical
 * concepts are intentionally left out, there is no picture for "truth".
 *
 * Keyed by atom id (the concept-index English key). Exposed as window.LangEmoji.
 */
(function () {
  "use strict";
  var EMOJI = {
    // numbers
    zero: "0️⃣", one: "1️⃣", two: "2️⃣", three: "3️⃣", four: "4️⃣",
    five: "5️⃣", six: "6️⃣", seven: "7️⃣", eight: "8️⃣", nine: "9️⃣", ten: "🔟",
    // colors (filled circles read unambiguously across platforms)
    red: "🔴", blue: "🔵", green: "🟢", yellow: "🟡", black: "⚫",
    white: "⚪", brown: "🟤",
    // people / family
    woman: "👩", man: "👨", child: "🧒", mother: "👩‍🍼", father: "👨‍🍼",
    friend: "🤝", people: "👥", person: "🧍", king: "🤴", guest: "🙋", baby: "👶",
    // animals
    dog: "🐕", cat: "🐈", fish: "🐟", bird: "🐦", horse: "🐎", cow: "🐄",
    snake: "🐍", worm: "🐛",
    // body
    eye: "👁️", ear: "👂", nose: "👃", mouth: "👄", hand: "✋", foot: "🦶",
    head: "🗣️", heart: "❤️", tooth: "🦷", hair: "💇", arm: "💪", leg: "🦵",
    tongue: "👅", bone: "🦴", blood: "🩸", neck: "🧣", skin: "🫆",
    // nature
    water: "💧", sun: "☀️", moon: "🌙", star: "⭐", fire: "🔥", tree: "🌳",
    flower: "🌸", earth: "🌍", sky: "🌤️", rain: "🌧️", snow: "❄️", cloud: "☁️",
    mountain: "⛰️", river: "🏞️", sea: "🌊", ocean: "🌊", wind: "🌬️", ice: "🧊",
    lake: "🏞️", hill: "⛰️", rock: "🪨", stone: "🪨", grass: "🌱", leaf: "🍃",
    wood: "🪵", sand: "🏖️", lightning: "⚡", thunder: "🌩️", smoke: "💨",
    seed: "🌰", root: "🥕", gold: "🥇", silver: "🥈", iron: "⛓️", salt: "🧂",
    egg: "🥚", honey: "🍯",
    // food & drink
    bread: "🍞", milk: "🥛", wine: "🍷", fruit: "🍎", meat: "🍖",
    // objects / places
    book: "📖", house: "🏠", door: "🚪", letter: "✉️", road: "🛣️",
    // time
    day: "🌞", night: "🌃", year: "📅",
    // a few high-frequency verbs with a clear icon
    eat: "🍽️", drink: "🥤", sleep: "😴", run: "🏃", walk: "🚶", swim: "🏊",
    read: "📚", write: "✍️", sit: "🪑", stand: "🧍", fly: "🕊️", cry: "😢",
    laugh: "😄", love: "💗", sing: "🎤", song: "🎵", fall: "🍂", burn: "🔥",
    // descriptors that picture cleanly
    big: "🐘", small: "🐜", hot: "🥵", cold: "🥶", new: "✨", old: "👴",
    long: "📏", short: "📐", round: "⭕", full: "🈵", empty: "🈳", sharp: "🔪",
    wet: "💦", dry: "🏜️", heavy: "🏋️",
  };

  function emojiFor(idOrAtom) {
    var id = typeof idOrAtom === "string" ? idOrAtom : (idOrAtom && idOrAtom.id);
    if (!id) return null;
    return EMOJI[id] || null;
  }

  // expose
  var api = { map: EMOJI, emojiFor: emojiFor, has: function (id) { return !!emojiFor(id); }, count: Object.keys(EMOJI).length };
  if (typeof window !== "undefined") window.LangEmoji = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
