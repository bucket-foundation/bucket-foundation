(function () {
  "use strict";

  var ASSET_BASE = "polingual/";

  var PROXY_BASE = "/api/polingual";
  var PROXY_TIMEOUT_MS = 6000;
  var liveCooldownUntil = 0;
  var LIVE_COOLDOWN_MS = 30000;

  var LANG_NAMES_FULL = {
    ar: "Arabic", cs: "Czech", de: "German", el: "Greek", en: "English",
    es: "Spanish", fa: "Persian", fi: "Finnish", fr: "French", he: "Hebrew",
    hi: "Hindi", id: "Indonesian", it: "Italian", ja: "Japanese", ko: "Korean",
    la: "Latin", nl: "Dutch", pl: "Polish", pt: "Portuguese", ru: "Russian",
    sa: "Sanskrit", sv: "Swedish", ta: "Tamil", th: "Thai", tr: "Turkish",
    vi: "Vietnamese", zh: "Chinese",
  };
  var SEM_DIM = 768;
  var PHON_DIM = 64;
  var ROW = SEM_DIM + PHON_DIM;

  var LANG_PREF = ["en", "es", "fr", "de", "it", "pt", "la", "nl", "sv", "ru", "el", "sa"];
  var MIN_COS = 0.5;
  var REL_GAP = 0.22;
  function prefRank(lang) {
    var pi = LANG_PREF.indexOf(lang);
    return pi < 0 ? LANG_PREF.length + 1 : pi;
  }

  var state = {
    loaded: false,
    loading: null,
    words: null,
    manifest: null,
    attribution: null,
    conceptIndex: null,
    sem: null,
    pho: null,
    phoNorm: null,
    byKey: null,
    bySurface: null,
    n: 0,
  };

  function load() {
    if (state.loaded) return Promise.resolve(state);
    if (state.loading) return state.loading;
    state.loading = Promise.all([
      fetch(ASSET_BASE + "subset.json", { cache: "force-cache" }).then(function (r) {
        if (!r.ok) throw new Error("subset.json " + r.status);
        return r.json();
      }),
      fetch(ASSET_BASE + "vectors.bin", { cache: "force-cache" }).then(function (r) {
        if (!r.ok) throw new Error("vectors.bin " + r.status);
        return r.arrayBuffer();
      }),
    ])
      .then(function (parts) {
        ingest(parts[0], parts[1]);
        state.loaded = true;
        state.loading = null;
        return state;
      })
      .catch(function (e) {
        state.loading = null;
        throw e;
      });
    return state.loading;
  }

  function ingest(subset, vecBuf) {
    var W = subset.words || [];
    state.words = W;
    state.manifest = subset.manifest || {};
    state.attribution = subset.attribution || {};
    state.conceptIndex = subset.concept_index || {};
    var n = W.length;
    state.n = n;

    if (state.manifest.sem_dim) SEM_DIM = state.manifest.sem_dim | 0;
    if (state.manifest.phon_dim) PHON_DIM = state.manifest.phon_dim | 0;
    ROW = SEM_DIM + PHON_DIM;
    if (typeof state.manifest.min_cos === "number") MIN_COS = state.manifest.min_cos;
    if (typeof state.manifest.rel_gap === "number") REL_GAP = state.manifest.rel_gap;
    if (Array.isArray(state.manifest.lang_preference)) LANG_PREF = state.manifest.lang_preference;

    var raw = new Int8Array(vecBuf);
    var sem = new Float32Array(n * SEM_DIM);
    var pho = new Float32Array(n * PHON_DIM);
    var phoNorm = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var base = i * ROW;
      var so = i * SEM_DIM, ss = 0;
      for (var d = 0; d < SEM_DIM; d++) {
        var v = raw[base + d] / 127;
        sem[so + d] = v;
        ss += v * v;
      }
      var sn = Math.sqrt(ss) || 1;
      for (d = 0; d < SEM_DIM; d++) sem[so + d] /= sn;
      var po = i * PHON_DIM, ps = 0;
      for (d = 0; d < PHON_DIM; d++) {
        var pv = raw[base + SEM_DIM + d] / 127;
        pho[po + d] = pv;
        ps += pv * pv;
      }
      var pn = Math.sqrt(ps);
      phoNorm[i] = pn;
      if (pn > 0) for (d = 0; d < PHON_DIM; d++) pho[po + d] /= pn;
    }
    state.sem = sem;
    state.pho = pho;
    state.phoNorm = phoNorm;

    var byKey = new Map();
    var bySurface = new Map();
    for (i = 0; i < n; i++) {
      var w = W[i];
      var k = w.l + " " + w.s;
      if (!byKey.has(k)) byKey.set(k, i);
      if (!byKey.has(w.s)) byKey.set(w.s, i);
      var lk = w.s.toLowerCase();
      if (!byKey.has("~" + lk)) byKey.set("~" + lk, i);
      if (!bySurface.has(w.s)) bySurface.set(w.s, []);
      bySurface.get(w.s).push(i);
      var lkey = "~" + lk;
      if (!bySurface.has(lkey)) bySurface.set(lkey, []);
      bySurface.get(lkey).push(i);
    }
    state.byKey = byKey;
    state.bySurface = bySurface;
  }

  function ready() {
    return state.loaded;
  }
  function manifest() {
    return state.manifest;
  }
  function attribution() {
    return state.attribution;
  }
  function languages() {
    return (state.manifest && state.manifest.languages) || [];
  }
  function languageName(code) {
    if (!code) return code;
    var m = state.manifest && state.manifest.language_names;
    return (m && m[code]) || LANG_NAMES_FULL[code] || code;
  }
  function word(rowIdx) {
    return state.words[rowIdx];
  }

  function resolve(ref, lang) {
    if (ref == null) return -1;
    if (typeof ref === "number") return ref;
    if (typeof ref === "object" && typeof ref.row === "number") return ref.row;
    var surface, lg;
    if (typeof ref === "object") {
      surface = ref.surface != null ? ref.surface : ref.s;
      lg = ref.lang != null ? ref.lang : ref.l;
    } else {
      surface = String(ref);
      lg = lang;
    }
    var bk = state.byKey;
    if (lg && bk.has(lg + " " + surface)) return bk.get(lg + " " + surface);
    var cands = (state.bySurface && state.bySurface.get(surface)) ||
      (state.bySurface && state.bySurface.get("~" + String(surface).toLowerCase()));
    if (cands && cands.length) {
      if (lg) {
        for (var ci2 = 0; ci2 < cands.length; ci2++)
          if (state.words[cands[ci2]].l === lg) return cands[ci2];
      }
      var best = cands[0], bestRank = prefRank(state.words[cands[0]].l);
      for (var ci3 = 1; ci3 < cands.length; ci3++) {
        var rk = prefRank(state.words[cands[ci3]].l);
        if (rk < bestRank) { best = cands[ci3]; bestRank = rk; }
      }
      return best;
    }
    if (bk.has(surface)) return bk.get(surface);
    var ci = bk.get("~" + String(surface).toLowerCase());
    return ci == null ? -1 : ci;
  }

  function lookup(surface, lang) {
    if (!surface) return null;
    var i = resolve(surface, lang);
    if (i >= 0) return record(i);
    var best = spellingTopK({ s: surface, l: lang || "" }, 1, { allowMissingRow: true });
    return best.length ? best[0] : null;
  }

  function record(i) {
    if (i < 0 || i >= state.n) return null;
    var w = state.words[i];
    return {
      row: i,
      surface: w.s,
      lang: w.l,
      langName: languageName(w.l),
      gloss: w.g,
      pos: w.p || "",
      ipa: w.ipa || "",
      concept: w.c || null,
      etymology: w.e || null,
      hasPhonetic: !!w.hv,
    };
  }

  function normGloss(g) {
    return String(g || "").toLowerCase().split(/\s+/).join(" ").slice(0, 50);
  }

  function semanticTopK(ref, k, opts) {
    opts = opts || {};
    k = k || 8;
    var i = resolve(ref);
    if (i < 0) return [];
    var sem = state.sem,
      n = state.n,
      base = i * SEM_DIM;
    var srcLang = state.words[i].l;
    var srcSurface = state.words[i].s;
    var minCos = typeof opts.minCos === "number" ? opts.minCos : MIN_COS;
    var onePerLang = opts.onePerLang !== false;
    var pairs = [];
    for (var j = 0; j < n; j++) {
      if (j === i) continue;
      if (opts.crossLingualOnly && state.words[j].l === srcLang) continue;
      var jb = j * SEM_DIM,
        dot = 0;
      for (var d = 0; d < SEM_DIM; d++) dot += sem[base + d] * sem[jb + d];
      pairs.push([j, dot]);
    }
    pairs.sort(function (a, b) { return b[1] - a[1]; });
    var floor = pairs.length ? Math.max(minCos, pairs[0][1] - REL_GAP) : minCos;
    var seenLang = Object.create(null), seenGloss = Object.create(null), out = [];
    for (var p = 0; p < pairs.length && out.length < k; p++) {
      var jj = pairs[p][0], sc = pairs[p][1];
      if (sc < floor) break;
      var w = state.words[jj];
      if (onePerLang && seenLang[w.l]) continue;
      var gk = w.l + "|" + normGloss(w.g);
      if (seenGloss[gk]) continue;
      if (w.s === srcSurface) continue;
      seenLang[w.l] = 1;
      seenGloss[gk] = 1;
      var rec = record(jj);
      rec.score = Math.round(sc * 1000) / 1000;
      out.push(rec);
    }
    return out;
  }

  function phoneticTopK(ref, k) {
    var i = resolve(ref);
    if (i < 0 || state.phoNorm[i] === 0) return [];
    var pho = state.pho,
      n = state.n,
      base = i * PHON_DIM;
    var out = [];
    for (var j = 0; j < n; j++) {
      if (j === i || state.phoNorm[j] === 0) continue;
      var jb = j * PHON_DIM,
        dot = 0;
      for (var d = 0; d < PHON_DIM; d++) dot += pho[base + d] * pho[jb + d];
      out.push([j, dot]);
    }
    return topRecords(out, k || 8, "score");
  }

  function normEdit(a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    if (a === b) return 0;
    var la = a.length,
      lb = b.length;
    if (la === 0 || lb === 0) return 1;
    var prev = new Array(lb + 1),
      cur = new Array(lb + 1);
    for (var j = 0; j <= lb; j++) prev[j] = j;
    for (var i = 1; i <= la; i++) {
      cur[0] = i;
      var ca = a.charCodeAt(i - 1);
      for (j = 1; j <= lb; j++) {
        var cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
        var m = prev[j] + 1;
        var d = cur[j - 1] + 1;
        if (d < m) m = d;
        var s = prev[j - 1] + cost;
        if (s < m) m = s;
        cur[j] = m;
      }
      var tmp = prev;
      prev = cur;
      cur = tmp;
    }
    return prev[lb] / Math.max(la, lb);
  }

  function spellingTopK(ref, k, opts) {
    opts = opts || {};
    var surface, srcLang, selfRow;
    var i = resolve(ref);
    if (i >= 0) {
      surface = state.words[i].s;
      srcLang = state.words[i].l;
      selfRow = i;
    } else if (typeof ref === "object" && (ref.s || ref.surface)) {
      surface = ref.s != null ? ref.s : ref.surface;
      srcLang = ref.l != null ? ref.l : ref.lang;
      selfRow = -1;
    } else {
      return [];
    }
    var out = [];
    var W = state.words;
    for (var j = 0; j < state.n; j++) {
      if (j === selfRow) continue;
      var d = normEdit(surface, W[j].s);
      if (d < 1) out.push([j, 1 - d]);
    }
    return topRecords(out, k || 8, "similarity");
  }

  function translate(ref) {
    var i = resolve(ref);
    if (i < 0) return { concept: null, results: [] };
    var w = state.words[i];
    var concept = w.c || null;
    var seen = Object.create(null);
    var results = [];
    if (concept && state.conceptIndex[concept]) {
      state.conceptIndex[concept].forEach(function (r) {
        if (r === i) return;
        var ww = state.words[r];
        var key = ww.l + "|" + ww.s;
        if (seen[key]) return;
        seen[key] = 1;
        results.push(record(r));
      });
    }
    results.sort(function (a, b) {
      if (a.lang === w.l) return 1;
      if (b.lang === w.l) return -1;
      return a.langName.localeCompare(b.langName);
    });
    return { concept: concept, source: record(i), results: results };
  }

  function etymology(ref) {
    var i = resolve(ref);
    if (i < 0) return null;
    var w = state.words[i];
    if (!w.e) return null;
    return {
      surface: w.s,
      lang: w.l,
      langName: languageName(w.l),
      text: w.e,
      source: "Wiktionary via Kaikki (CC-BY-SA)",
      url: "https://en.wiktionary.org/wiki/" + encodeURIComponent(w.s),
    };
  }

  function topRecords(pairs, k, scoreName) {
    pairs.sort(function (a, b) {
      return b[1] - a[1];
    });
    var out = [];
    for (var i = 0; i < pairs.length && out.length < k; i++) {
      var rec = record(pairs[i][0]);
      rec[scoreName] = Math.round(pairs[i][1] * 1000) / 1000;
      out.push(rec);
    }
    return out;
  }

  function liveRecord(o, scoreField) {
    if (!o) return null;
    var lang = o.lang || o.l || "";
    var surface = o.surface != null ? o.surface : o.s;
    var rec = {
      row: -1,
      ref: { surface: surface, lang: lang },
      surface: surface,
      lang: lang,
      langName: languageName(lang),
      gloss: o.meaning_en != null ? o.meaning_en : (o.gloss || ""),
      pos: o.pos || "",
      ipa: o.ipa || "",
      concept: null,
      etymology: o.etymology || null,
      hasPhonetic: o.has_phonetic != null ? !!o.has_phonetic : !!o.ipa,
      live: true,
    };
    if (scoreField && typeof o[scoreField] === "number") {
      rec[scoreField] = Math.round(o[scoreField] * 1000) / 1000;
    }
    return rec;
  }

  function liveAttribution(prov) {
    var p = prov || {};
    if (typeof p === "string") return { source: p, license: "CC-BY-SA" };
    return {
      source: p.source || "Wiktionary via Kaikki (CC-BY-SA 3.0)",
      license: p.license || "CC-BY-SA",
      uri: p.uri || null,
    };
  }

  function liveAvailable() {
    if (typeof fetch !== "function") return false;
    if (Date.now() < liveCooldownUntil) return false;
    return true;
  }

  function proxyGet(op, params) {
    if (!liveAvailable()) return Promise.reject(new Error("live-unavailable"));
    var qs = "op=" + encodeURIComponent(op);
    for (var k in params) {
      if (params[k] == null || params[k] === "") continue;
      qs += "&" + encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
    }
    var url = PROXY_BASE + "?" + qs;
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, PROXY_TIMEOUT_MS) : null;
    return fetch(url, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) {
        if (timer) clearTimeout(timer);
        if (r.status === 503) {
          liveCooldownUntil = Date.now() + LIVE_COOLDOWN_MS;
          return Promise.reject(new Error("upstream-down"));
        }
        if (!r.ok) return Promise.reject(new Error("proxy " + r.status));
        return r.json();
      })
      .then(function (j) {
        if (j && j.error) return Promise.reject(new Error(String(j.error.code || "api-error")));
        return j;
      })
      .catch(function (e) {
        if (timer) clearTimeout(timer);
        if (e && (e.name === "AbortError" || /Failed to fetch|NetworkError|live-unavailable|upstream-down/i.test(String(e.message || e)))) {
          if (Date.now() >= liveCooldownUntil) liveCooldownUntil = Date.now() + LIVE_COOLDOWN_MS;
        }
        throw e;
      });
  }

  function lookupAsync(ref, lang) {
    var surface, lg;
    if (typeof ref === "number") {
      return Promise.resolve({ record: record(ref), source: "subset", attribution: state.attribution });
    } else if (ref && typeof ref === "object") {
      surface = ref.surface != null ? ref.surface : ref.s;
      lg = ref.lang != null ? ref.lang : (ref.l != null ? ref.l : lang);
    } else {
      surface = ref == null ? "" : String(ref);
      lg = lang;
    }
    var subsetFallback = function () {
      return { record: lookup(surface, lg), source: "subset", attribution: state.attribution };
    };
    if (!surface) return Promise.resolve(subsetFallback());
    return proxyGet("lookup", { surface: surface, lang: lg })
      .then(function (j) {
        if (!j || j.found === false) return subsetFallback();
        return { record: liveRecord(j), source: "live", attribution: liveAttribution(j.provenance) };
      })
      .catch(function () { return subsetFallback(); });
  }

  function refSurfaceLang(ref) {
    if (ref && typeof ref === "object" && ref.surface != null) return { surface: ref.surface, lang: ref.lang || "" };
    if (typeof ref === "number") {
      var w = state.words && state.words[ref];
      return w ? { surface: w.s, lang: w.l } : null;
    }
    var i = resolve(ref);
    if (i >= 0) { var ww = state.words[i]; return { surface: ww.s, lang: ww.l }; }
    if (typeof ref === "string") return { surface: ref, lang: "" };
    return null;
  }

  function neighborAsync(op, ref, k, subsetFn, extraParams) {
    var sl = refSurfaceLang(ref);
    var subsetFallback = function () {
      return { records: subsetFn(ref, k) || [], source: "subset", attribution: state.attribution };
    };
    if (!sl || !sl.surface) return Promise.resolve(subsetFallback());
    var params = { surface: sl.surface, lang: sl.lang, k: k || 12 };
    if (extraParams) for (var p in extraParams) params[p] = extraParams[p];
    var scoreField = op === "spelling" ? "similarity" : "score";
    return proxyGet(op, params)
      .then(function (j) {
        var arr = (j && j.results) || [];
        var recs = arr.map(function (o) { return liveRecord(o, scoreField); }).filter(Boolean);
        if (!recs.length) return subsetFallback();
        var attr = liveAttribution(arr[0] && arr[0].provenance);
        return { records: recs, source: "live", attribution: attr };
      })
      .catch(function () { return subsetFallback(); });
  }

  function semanticAsync(ref, k, opts) {
    opts = opts || {};
    var extra = opts.crossLingualOnly ? { cross: 1 } : null;
    return neighborAsync("semantic", ref, k, function (r, kk) {
      return semanticTopK(r, kk, opts);
    }, extra);
  }
  function phoneticAsync(ref, k) {
    return neighborAsync("phonetic", ref, k, phoneticTopK);
  }
  function spellingAsync(ref, k) {
    return neighborAsync("spelling", ref, k, spellingTopK);
  }

  function translateAsync(ref) {
    var sl = refSurfaceLang(ref);
    var subsetFallback = function () {
      var t = translate(ref);
      return { concept: t.concept, source: t.source, results: t.results || [], origin: "subset", attribution: state.attribution };
    };
    if (!sl || !sl.surface) return Promise.resolve(subsetFallback());
    return proxyGet("translate", { surface: sl.surface, from: sl.lang || "en", k: 12 })
      .then(function (j) {
        var ex = (j && j.exact_meaning_matches) || [];
        var nb = (j && j.semantic_neighbors) || [];
        var toLang = (j && j.to) || "";
        var arr = ex.concat(nb);
        var results = arr.map(function (o) {
          var oo = { surface: o.surface, lang: o.lang || toLang, meaning_en: o.meaning_en, ipa: o.ipa, pos: o.pos };
          var rec = liveRecord(oo, "score");
          return rec;
        }).filter(Boolean);
        if (!results.length) return subsetFallback();
        return {
          concept: null,
          source: liveRecord({ surface: j.word, lang: j.from, meaning_en: j.meaning_en }),
          results: results,
          origin: "live",
          attribution: liveAttribution(j.provenance),
        };
      })
      .catch(function () { return subsetFallback(); });
  }

  function etymologyAsync(ref) {
    var sl = refSurfaceLang(ref);
    var subsetFallback = function () {
      return { ety: etymology(ref), source: "subset", attribution: state.attribution };
    };
    if (!sl || !sl.surface) return Promise.resolve(subsetFallback());
    return proxyGet("etymology", { surface: sl.surface, lang: sl.lang })
      .then(function (j) {
        var text = j && j.etymology;
        if (!text) return subsetFallback();
        var prov = liveAttribution(j.provenance);
        return {
          ety: {
            surface: j.surface || sl.surface,
            lang: j.lang || sl.lang,
            langName: languageName(j.lang || sl.lang),
            text: text,
            source: prov.source,
            url: (prov.uri) || ("https://en.wiktionary.org/wiki/" + encodeURIComponent(j.surface || sl.surface)),
          },
          source: "live",
          attribution: prov,
        };
      })
      .catch(function () { return subsetFallback(); });
  }

  window.Polingual = {
    load: load,
    ready: ready,
    manifest: manifest,
    attribution: attribution,
    languages: languages,
    languageName: languageName,
    lookup: lookup,
    record: record,
    word: word,
    resolve: resolve,
    semanticTopK: semanticTopK,
    phoneticTopK: phoneticTopK,
    spellingTopK: spellingTopK,
    translate: translate,
    etymology: etymology,
    lookupAsync: lookupAsync,
    semanticAsync: semanticAsync,
    phoneticAsync: phoneticAsync,
    spellingAsync: spellingAsync,
    translateAsync: translateAsync,
    etymologyAsync: etymologyAsync,
  };
})();
