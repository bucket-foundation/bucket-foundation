/* Bucket Academy — on-device language audio (bkt-n2v, epic bkt-2ea / C2).
 *
 * Zero files, zero network, zero API keys: speaks a word in its target language
 * using the browser's built-in Web Speech API (window.speechSynthesis). Picks a
 * matching voice for the language by BCP-47 tag, falls back gracefully, and is a
 * silent no-op (with a hidden button) when speech synthesis or a usable voice is
 * unavailable. Must be triggered by a user gesture — every caller wires it to a
 * click, so that constraint is satisfied by construction.
 *
 * Public:  window.LangAudio
 *   .supported()            -> boolean (speechSynthesis present in this browser)
 *   .available(lang)        -> boolean (a voice we can use for this lang, OR
 *                              supported() — voices can load async, so we don't
 *                              hard-block the button before getVoices() populates)
 *   .speak(word, lang)      -> boolean (true if an utterance was queued)
 *   .voiceFor(lang)         -> SpeechSynthesisVoice | null
 *   .cancel()               -> stop any in-flight speech
 *   .button(word, lang, opt)-> a ready 🔊 <button> (hidden if unsupported)
 */
(function (root) {
  "use strict";

  // Deck language code -> BCP-47 tag for voice selection. Latin has no TTS voices
  // anywhere, so we read it with an Italian voice (closest church/ecclesiastical
  // pronunciation most engines ship) — see lang→voice map in the bead report.
  var BCP47 = {
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    it: "it-IT",
    pt: "pt-PT",
    de: "de-DE",
    la: "it-IT", // Latin fallback → Italian voice
    nl: "nl-NL",
    sv: "sv-SE",
    ru: "ru-RU",
    ja: "ja-JP",
    zh: "zh-CN",
    el: "el-GR",
    fi: "fi-FI",
    pl: "pl-PL",
    ko: "ko-KR",
    hi: "hi-IN",
    ar: "ar-SA",
  };
  // Acceptable voice-language prefixes per deck lang (so es-MX still works for es,
  // pt-BR for pt, en-GB for en, etc.). First entry is the preferred exact region.
  var PREFIX = {
    en: ["en-us", "en-gb", "en"],
    es: ["es-es", "es-419", "es-mx", "es"],
    fr: ["fr-fr", "fr-ca", "fr"],
    it: ["it-it", "it"],
    pt: ["pt-pt", "pt-br", "pt"],
    de: ["de-de", "de-at", "de"],
    la: ["it-it", "it", "la"],
    nl: ["nl-nl", "nl-be", "nl"],
    sv: ["sv-se", "sv"],
    ru: ["ru-ru", "ru"],
    ja: ["ja-jp", "ja"],
    zh: ["zh-cn", "zh-hans", "cmn-hans-cn", "zh"],
    el: ["el-gr", "el"],
    fi: ["fi-fi", "fi"],
    pl: ["pl-pl", "pl"],
    ko: ["ko-kr", "ko"],
    hi: ["hi-in", "hi"],
    ar: ["ar-sa", "ar-eg", "ar"],
  };

  function supported() {
    return typeof root !== "undefined" &&
      "speechSynthesis" in root &&
      typeof root.SpeechSynthesisUtterance === "function";
  }

  function getVoices() {
    if (!supported()) return [];
    try { return root.speechSynthesis.getVoices() || []; } catch (e) { return []; }
  }

  // Some engines populate voices asynchronously; warm the list once so the first
  // real speak() has candidates. Safe to call repeatedly.
  function warm() {
    if (!supported()) return;
    try {
      getVoices();
      if (typeof root.speechSynthesis.onvoiceschanged === "undefined") return;
      if (!warm._wired) {
        warm._wired = true;
        root.speechSynthesis.addEventListener("voiceschanged", function () {
          _voiceCache = {}; // invalidate — better voices may have arrived
        });
      }
    } catch (e) {}
  }

  var _voiceCache = {};
  function voiceFor(lang) {
    if (!supported()) return null;
    lang = lang || "en";
    if (_voiceCache[lang]) return _voiceCache[lang];
    var voices = getVoices();
    if (!voices.length) return null;
    var prefixes = PREFIX[lang] || [String(lang).toLowerCase()];
    var pick = null;
    for (var i = 0; i < prefixes.length && !pick; i++) {
      var p = prefixes[i];
      // prefer a local (on-device) voice when several match
      var matches = voices.filter(function (v) {
        return String(v.lang || "").toLowerCase().replace("_", "-").indexOf(p) === 0;
      });
      if (matches.length) {
        var local = matches.filter(function (v) { return v.localService; });
        pick = (local[0] || matches[0]);
      }
    }
    if (pick) _voiceCache[lang] = pick;
    return pick;
  }

  // Don't hard-block the button before voices load — once supported, we keep the
  // button visible and let speak() pick the best available voice at click time.
  function available(lang) {
    return supported();
  }

  function cancel() {
    if (!supported()) return;
    try { root.speechSynthesis.cancel(); } catch (e) {}
  }

  function speak(word, lang, opts) {
    if (!supported()) return false;
    word = String(word == null ? "" : word).trim();
    if (!word) return false;
    opts = opts || {};
    warm();
    try {
      // never let queued utterances stack up on rapid taps
      cancel();
      var u = new root.SpeechSynthesisUtterance(word);
      var v = voiceFor(lang);
      if (v) u.voice = v;
      u.lang = (v && v.lang) || BCP47[lang] || lang || "en-US";
      u.rate = typeof opts.rate === "number" ? opts.rate : 0.9; // slightly slow = clearer
      u.pitch = typeof opts.pitch === "number" ? opts.pitch : 1.0;
      u.volume = typeof opts.volume === "number" ? opts.volume : 1.0;
      root.speechSynthesis.speak(u);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Build a ready-to-mount 🔊 listen button. Hidden (display:none) when unsupported
  // so the layout stays clean on browsers without speech synthesis.
  function button(word, lang, opt) {
    opt = opt || {};
    var b = document.createElement("button");
    b.type = "button";
    b.className = "lang-audio-btn" + (opt.cls ? " " + opt.cls : "");
    b.innerHTML = "🔊";
    b.setAttribute("aria-label", opt.label || ("Hear it in " + (lang || "")));
    b.title = opt.label || "Listen";
    if (!supported()) {
      b.style.display = "none";
      b.disabled = true;
      return b;
    }
    warm();
    b.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var ok = speak(word, lang, opt);
      if (ok) {
        b.classList.add("speaking");
        if (root.haptic) try { root.haptic("tap"); } catch (er) {}
        setTimeout(function () { b.classList.remove("speaking"); }, 700);
      }
    });
    return b;
  }

  // warm the voice list as soon as the module loads (no speech, just population)
  warm();

  root.LangAudio = {
    supported: supported,
    available: available,
    voiceFor: voiceFor,
    speak: speak,
    cancel: cancel,
    button: button,
    _bcp47: BCP47,
  };
})(typeof window !== "undefined" ? window : this);
