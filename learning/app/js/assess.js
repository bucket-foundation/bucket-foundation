(function (global) {
  "use strict";

  var ASSESS = {
    NUM_REL_TOL: 0.01,
    NUM_ABS_TOL: 1e-9,
    SYMBOLIC_MAX_LEN: 24,
    DEFAULT_RUN_SIZE: 10,
    MIN_RUN_SIZE: 3,
    RATING_CORRECT: 3,
    RATING_INCORRECT: 1,
    LEVELS: ["recall", "apply", "derive", "teach"],
  };

  var SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+" };
  function asciiMath(s) {
    s = String(s == null ? "" : s);
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, function (run) {
      var out = "";
      for (var i = 0; i < run.length; i++) out += SUP[run[i]] || "";
      return "^" + out;
    });
    return s
      .replace(/[×·∙*]/g, "x")
      .replace(/[−–—]/g, "-")
      .replace(/[≈~≃≅]/g, "")
      .replace(/ /g, " ")
      .replace(/[,](?=\d{3}\b)/g, "");
  }

  function normSymbolic(s) {
    return asciiMath(s)
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[.;]+$/, "");
  }

  function parseNumber(tok) {
    if (tok == null) return null;
    var s = asciiMath(String(tok)).trim().toLowerCase();
    if (!s) return null;
    s = s.replace(/\s*x\s*10\s*\^\s*([+-]?\d+)/g, "e$1");
    s = s.replace(/(^|[^0-9.])10\s*\^\s*([+-]?\d+)/g, "$11e$2");
    s = s.replace(/\s+/g, "");
    var fr = s.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*([+-]?\d+(?:\.\d+)?)$/);
    if (fr) {
      var d = parseFloat(fr[2]);
      if (d === 0) return null;
      return parseFloat(fr[1]) / d;
    }
    var m = s.match(/^[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/);
    if (m) return parseFloat(s);
    return null;
  }

  function extractSalientNumber(str) {
    var s = asciiMath(str);
    var eq = s.lastIndexOf("=");
    var region = eq >= 0 ? s.slice(eq + 1) : s;
    var re = /([+-]?\d+(?:\.\d+)?(?:\s*[ex]\s*10\s*\^\s*[+-]?\d+|\s*e[+-]?\d+|\s*\^\s*[+-]?\d+)?)\s*(%|[a-zµμ°Ω/·\-]+(?:\^?[+-]?\d+)?)?/gi;
    var matches = [], mm;
    while ((mm = re.exec(region)) !== null) {
      var raw = mm[1];
      var val = parseNumber(raw);
      if (val == null) continue;
      var unit = (mm[2] || "").trim();
      if (/^(so|the|of|is|a|an|to|and|or|it)$/i.test(unit)) unit = "";
      matches.push({ value: val, unit: normUnit(unit) });
    }
    if (!matches.length) return null;
    return matches[matches.length - 1];
  }

  function normUnit(u) {
    if (!u) return "";
    u = String(u).toLowerCase().replace(/\s|\./g, "");
    u = u.replace(/µ|μ/g, "u");
    return u;
  }

  function unitsCompatible(a, b) {
    if (!a || !b) return true;
    return a === b;
  }

  function numbersClose(a, b, opts) {
    opts = opts || {};
    var rel = opts.rel != null ? opts.rel : ASSESS.NUM_REL_TOL;
    var abs = opts.abs != null ? opts.abs : ASSESS.NUM_ABS_TOL;
    var diff = Math.abs(a - b);
    if (diff <= abs) return true;
    var scale = Math.max(Math.abs(a), Math.abs(b));
    return diff <= rel * scale;
  }

  function gradeAnswer(userInput, canonicalAnswer, opts) {
    opts = opts || {};
    var raw = userInput == null ? "" : String(userInput).trim();
    var canon = canonicalAnswer == null ? "" : String(canonicalAnswer).trim();

    var cNum = extractSalientNumber(canon);
    if (cNum != null) {
      if (!raw) return { gradable: true, correct: false, kind: "numeric", expected: fmtNum(cNum), got: "", reason: "blank" };
      var uNum = extractSalientNumber(raw);
      if (uNum == null) {
        return { gradable: false, kind: "numeric", expected: fmtNum(cNum), got: raw, reason: "no_number_in_input" };
      }
      var ok = numbersClose(uNum.value, cNum.value, opts) && unitsCompatible(uNum.unit, cNum.unit);
      return { gradable: true, correct: ok, kind: "numeric", expected: fmtNum(cNum), got: fmtNum(uNum), reason: ok ? "match" : "value_or_unit_mismatch" };
    }

    if (canon && canon.length <= ASSESS.SYMBOLIC_MAX_LEN) {
      if (!raw) return { gradable: true, correct: false, kind: "symbolic", expected: canon, got: "", reason: "blank" };
      var nc = normSymbolic(canon);
      var nu = normSymbolic(raw);
      if (!nc) return { gradable: false, kind: "symbolic", expected: canon, got: raw, reason: "empty_canonical" };
      var ncRhs = nc.indexOf("=") >= 0 ? nc.slice(nc.lastIndexOf("=") + 1) : nc;
      var nuRhs = nu.indexOf("=") >= 0 ? nu.slice(nu.lastIndexOf("=") + 1) : nu;
      var ok2 = nu === nc || nuRhs === ncRhs || nu === ncRhs || nuRhs === nc;
      return { gradable: true, correct: ok2, kind: "symbolic", expected: canon, got: raw, reason: ok2 ? "match" : "mismatch" };
    }

    return { gradable: false, kind: "open", expected: canon, got: raw, reason: "not_auto_gradable" };
  }

  function fmtNum(n) {
    if (n == null) return "";
    if (typeof n === "object") return n.value + (n.unit ? " " + n.unit : "");
    return String(n);
  }

  function buildRun(graph, state, opts) {
    opts = opts || {};
    var atoms = (graph && graph.atoms) || [];
    var byId = (graph && graph.byId) || {};
    var size = Math.max(ASSESS.MIN_RUN_SIZE, opts.size || ASSESS.DEFAULT_RUN_SIZE);
    var rng = opts.rng || Math.random;
    var cardFor = (state && state.cardForId) || function () { return null; };
    var now = opts.now || Date.now();

    function askable(a) { return a && a.quiz && a.quiz.length; }

    var pool;
    if (opts.conceptIds && opts.conceptIds.length) {
      pool = opts.conceptIds.map(function (id) { return byId[id]; }).filter(askable);
    } else {
      var started = atoms.filter(function (a) { return askable(a) && cardFor(a.id); });
      pool = started.length ? started : atoms.filter(askable);
    }
    if (!pool.length) return { items: [], conceptCount: 0, branch: (graph && graph.branch) || null };

    function dueness(a) {
      var c = cardFor(a.id);
      if (c && c.due != null && c.due <= now) return (now - c.due);
      return -1;
    }
    var ranked = pool.slice().sort(function (a, b) {
      var da = dueness(a), db = dueness(b);
      if ((da >= 0) !== (db >= 0)) return db - da;
      return (b.leverage || 0) - (a.leverage || 0) || (rng() - 0.5);
    });

    var levelCycle = opts.levels && opts.levels.length ? opts.levels.slice() : ASSESS.LEVELS.slice();
    var items = [];
    var usedConcept = {};
    var li = 0;

    function pickItemFor(atom, preferLevel) {
      var quiz = atom.quiz || [];
      var order = [preferLevel].concat(ASSESS.LEVELS.filter(function (l) { return l !== preferLevel; }));
      for (var k = 0; k < order.length; k++) {
        var q = quiz.find(function (x) { return x.level === order[k]; });
        if (q) return { atomId: atom.id, title: atom.title || atom.id, level: q.level, prompt: q.prompt, answer: q.answer, key: q.key || null, accept: q.accept || null, tol: q.tol != null ? q.tol : null, eq: q.eq || null, shell: atom.shell };
      }
      return null;
    }

    for (var i = 0; i < ranked.length && items.length < size; i++) {
      var atom = ranked[i];
      var lvl = levelCycle[li % levelCycle.length]; li++;
      var it = pickItemFor(atom, lvl);
      if (it) { items.push(it); usedConcept[atom.id] = (usedConcept[atom.id] || []).concat(it.level); }
    }
    var di = 0;
    while (items.length < size && ranked.length) {
      var a2 = ranked[di % ranked.length]; di++;
      if (di > ranked.length * ASSESS.LEVELS.length) break;
      var used = usedConcept[a2.id] || [];
      var unused = ASSESS.LEVELS.filter(function (l) { return used.indexOf(l) < 0; });
      if (!unused.length) continue;
      var it2 = pickItemFor(a2, unused[unused.length - 1]);
      if (it2 && used.indexOf(it2.level) < 0) {
        items.push(it2);
        usedConcept[a2.id] = used.concat(it2.level);
      }
    }

    return {
      items: items,
      conceptCount: Object.keys(usedConcept).length,
      branch: (graph && graph.branch) || null,
      createdAt: now,
    };
  }

  function summarize(results) {
    results = results || [];
    var total = results.length;
    var correct = 0;
    var auto = { total: 0, correct: 0 };
    var self = { total: 0, correct: 0 };
    var byLevel = {};
    var weak = [];
    var seenWeak = {};
    results.forEach(function (r) {
      if (r.correct) correct++;
      var bucket = r.autoGraded ? auto : self;
      bucket.total++; if (r.correct) bucket.correct++;
      var lv = r.level || "recall";
      byLevel[lv] = byLevel[lv] || { total: 0, correct: 0 };
      byLevel[lv].total++; if (r.correct) byLevel[lv].correct++;
      if (!r.correct && r.atomId && !seenWeak[r.atomId]) { seenWeak[r.atomId] = 1; weak.push(r.atomId); }
    });
    var trust = auto.total === 0 ? "self" : (self.total === 0 ? "high" : "mixed");
    return {
      total: total,
      correct: correct,
      score: total ? correct / total : 0,
      auto: auto,
      self: self,
      byLevel: byLevel,
      weakConcepts: weak,
      trust: trust,
    };
  }

  function ratingFor(verdict) {
    return verdict ? ASSESS.RATING_CORRECT : ASSESS.RATING_INCORRECT;
  }

  var SUB = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };
  var LEAD_NUM = /^\s*([+-]?\d+(?:\.\d+)?(?:\s*[ex]\s*10\s*\^\s*[+-]?\d+|\s*e[+-]?\d+|\s*\/\s*\d+(?:\.\d+)?)?)/i;

  function normKeyText(s) {
    return asciiMath(s)
      .replace(/[₀-₉]/g, function (c) { return SUB[c] || c; })
      .replace(/β/g, "beta")
      .toLowerCase()
      .replace(/[’'`,]/g, "")
      .replace(/^(the|a|an)\s+/, "")
      .replace(/([a-z])\s*-\s*(?=[a-z])/g, "$1")
      .replace(/[\s_]+/g, "")
      .replace(/[.;!,]+$/, "");
  }

  var LEAD_FILLER = /^\s*(?:(?:the\s+)?answer\s+is|it\s+is|its|it's|about|approximately|approx\.?|roughly|around|nearly|so)\s*:?\s*/i;

  function keyUnit(u) {
    var n = normUnit(u).replace(/^volts?$/, "v").replace(/^bits$/, "bit");
    return n.split("/")[0];
  }

  function leadingQuantity(s) {
    var text = asciiMath(s);
    var eq = text.lastIndexOf("=");
    if (eq >= 0) text = text.slice(eq + 1);
    var prev = "";
    while (prev !== text) {
      prev = text;
      text = text.replace(LEAD_FILLER, "");
    }
    var m = text.match(LEAD_NUM);
    if (!m) return null;
    var value = parseNumber(m[1]);
    if (value == null) return null;
    var u = text.slice(m[0].length).match(/^\s*([a-zµμ°Ωå]+)/i);
    return { value: value, unit: u ? keyUnit(u[1]) : "" };
  }

  function gradeItem(userInput, item) {
    var key = item && item.key != null ? String(item.key).trim() : "";
    if (!key) return gradeAnswer(userInput, item ? item.answer : "");
    var raw = userInput == null ? "" : String(userInput).trim();
    if (!raw) return { gradable: true, correct: false, kind: "symbolic", expected: key, got: "", reason: "blank" };
    var got = normKeyText(raw);
    var forms = [key].concat(item.accept || []);
    for (var i = 0; i < forms.length; i++) if (normKeyText(forms[i]) === got) return { gradable: true, correct: true, kind: "symbolic", expected: key, got: raw, reason: "match" };
    var keyQ = leadingQuantity(key);
    if (keyQ) {
      var userQ = leadingQuantity(raw);
      var unitOk = !userQ || !userQ.unit || !keyQ.unit || userQ.unit === keyQ.unit;
      var ok = userQ != null && unitOk && numbersClose(userQ.value, keyQ.value, { rel: item.tol != null ? item.tol : ASSESS.NUM_REL_TOL });
      return { gradable: true, correct: ok, kind: "numeric", expected: key, got: raw, reason: ok ? "match" : "value_mismatch" };
    }
    return { gradable: true, correct: false, kind: "symbolic", expected: key, got: raw, reason: "mismatch" };
  }

  var api = {
    ASSESS: ASSESS,
    gradeAnswer: gradeAnswer,
    gradeItem: gradeItem,
    buildRun: buildRun,
    summarize: summarize,
    ratingFor: ratingFor,
    _parseNumber: parseNumber,
    _extractSalientNumber: extractSalientNumber,
    _normSymbolic: normSymbolic,
    _asciiMath: asciiMath,
    _numbersClose: numbersClose,
  };

  global.Assess = api;
  global.BucketAssess = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
