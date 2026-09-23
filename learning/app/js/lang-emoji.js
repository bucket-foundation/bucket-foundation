(function () {
  "use strict";
  var EMOJI = {
    zero: "0️⃣", one: "1️⃣", two: "2️⃣", three: "3️⃣", four: "4️⃣",
    five: "5️⃣", six: "6️⃣", seven: "7️⃣", eight: "8️⃣", nine: "9️⃣", ten: "🔟",
    red: "🔴", blue: "🔵", green: "🟢", yellow: "🟡", black: "⚫",
    white: "⚪", brown: "🟤",
    woman: "👩", man: "👨", child: "🧒", mother: "👩‍🍼", father: "👨‍🍼",
    friend: "🤝", people: "👥", person: "🧍", king: "🤴", guest: "🙋", baby: "👶",
    dog: "🐕", cat: "🐈", fish: "🐟", bird: "🐦", horse: "🐎", cow: "🐄",
    snake: "🐍", worm: "🐛",
    eye: "👁️", ear: "👂", nose: "👃", mouth: "👄", hand: "✋", foot: "🦶",
    head: "🗣️", heart: "❤️", tooth: "🦷", hair: "💇", arm: "💪", leg: "🦵",
    tongue: "👅", bone: "🦴", blood: "🩸", neck: "🧣", skin: "🫆",
    water: "💧", sun: "☀️", moon: "🌙", star: "⭐", fire: "🔥", tree: "🌳",
    flower: "🌸", earth: "🌍", sky: "🌤️", rain: "🌧️", snow: "❄️", cloud: "☁️",
    mountain: "⛰️", river: "🏞️", sea: "🌊", ocean: "🌊", wind: "🌬️", ice: "🧊",
    lake: "🏞️", hill: "⛰️", rock: "🪨", stone: "🪨", grass: "🌱", leaf: "🍃",
    wood: "🪵", sand: "🏖️", lightning: "⚡", thunder: "🌩️", smoke: "💨",
    seed: "🌰", root: "🥕", gold: "🥇", silver: "🥈", iron: "⛓️", salt: "🧂",
    egg: "🥚", honey: "🍯",
    bread: "🍞", milk: "🥛", wine: "🍷", fruit: "🍎", meat: "🍖",
    book: "📖", house: "🏠", door: "🚪", letter: "✉️", road: "🛣️",
    day: "🌞", night: "🌃", year: "📅",
    eat: "🍽️", drink: "🥤", sleep: "😴", run: "🏃", walk: "🚶", swim: "🏊",
    read: "📚", write: "✍️", sit: "🪑", stand: "🧍", fly: "🕊️", cry: "😢",
    laugh: "😄", love: "💗", sing: "🎤", song: "🎵", fall: "🍂", burn: "🔥",
    big: "🐘", small: "🐜", hot: "🥵", cold: "🥶", new: "✨", old: "👴",
    long: "📏", short: "📐", round: "⭕", full: "🈵", empty: "🈳", sharp: "🔪",
    wet: "💦", dry: "🏜️", heavy: "🏋️",
  };

  function emojiFor(idOrAtom) {
    var id = typeof idOrAtom === "string" ? idOrAtom : (idOrAtom && idOrAtom.id);
    if (!id) return null;
    return EMOJI[id] || null;
  }

  var api = { map: EMOJI, emojiFor: emojiFor, has: function (id) { return !!emojiFor(id); }, count: Object.keys(EMOJI).length };
  if (typeof window !== "undefined") window.LangEmoji = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
