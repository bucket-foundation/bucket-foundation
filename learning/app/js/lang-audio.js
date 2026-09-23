(function (root) {
  "use strict";

  var BCP47 = {
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    it: "it-IT",
    pt: "pt-PT",
    de: "de-DE",
    la: "it-IT",
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

  function warm() {
    if (!supported()) return;
    try {
      getVoices();
      if (typeof root.speechSynthesis.onvoiceschanged === "undefined") return;
      if (!warm._wired) {
        warm._wired = true;
        root.speechSynthesis.addEventListener("voiceschanged", function () {
          _voiceCache = {};
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
      cancel();
      var u = new root.SpeechSynthesisUtterance(word);
      var v = voiceFor(lang);
      if (v) u.voice = v;
      u.lang = (v && v.lang) || BCP47[lang] || lang || "en-US";
      u.rate = typeof opts.rate === "number" ? opts.rate : 0.9;
      u.pitch = typeof opts.pitch === "number" ? opts.pitch : 1.0;
      u.volume = typeof opts.volume === "number" ? opts.volume : 1.0;
      root.speechSynthesis.speak(u);
      return true;
    } catch (e) {
      return false;
    }
  }

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
