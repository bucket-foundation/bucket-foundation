/* Bucket Academy — "Test yourself" assessment engine (bkt-v7y; advances bkt-o1w
 * assessment, bkt-3so deterministic grading, bkt-dji practice/credential firewall).
 *
 * This is the SEALED-RUN counterpart to practice (Study + drill). Where practice is
 * show-answer-then-self-rate (FSRS, retries, hints — farmable by design, ADAPTIVE-SOTA
 * §c), an assessment run presents a focused spread of quiz items the learner must
 * answer BEFORE seeing the answer, grades them deterministically where the canonical
 * answer reduces to a numeric / short-symbolic value, and falls back to an HONEST,
 * clearly-marked self-check only where it cannot.
 *
 * Three pieces, all pure + dependency-free + node-testable (UMD-ish — attaches to
 * window in the browser, module.exports under node):
 *
 *   1. gradeAnswer(userInput, canonicalAnswer)  — the deterministic grader (bkt-3so).
 *      Self-contained: a tiny numeric/units/sign/whitespace normalizer + numeric
 *      tolerance + short-symbolic string equality. Returns whether the item is
 *      auto-gradable at all (gradable=false → caller must self-check), and if so the
 *      verdict. NO external libs; if mathjs is ever added it can slot in behind this.
 *
 *   2. buildRun(graph, state, opts)  — pick a sealed spread of quiz items across the
 *      learner's due/learned concepts and Bloom levels for a branch (or a chosen set).
 *
 *   3. summarize(run)  — score the finished run: overall, by Bloom level, auto vs.
 *      self-graded split (trust), and the weak concepts to route back to Study.
 *
 * HONESTY GUARDRAIL (EPIC.md §5, ADAPTIVE-SOTA §c): this is honest INTERNAL signal that
 * sharpens the proficiency estimate — NOT a certified or public rating. The real
 * credential (sealed held-out, freshly AI-generated transfer items, effort filter,
 * exposure control, anti-gaming, time-decay) is a LATER bead and needs the AI key +
 * bkt-4at. Self-graded items are recorded at LOWER trust and weighted less than
 * deterministically auto-graded ones when they feed proficiency.
 */
(function (global) {
  "use strict";

  /* ======================================================================
   * Tunables — documented, conservative, one place.
   * ==================================================================== */
  var ASSESS = {
    // numeric equivalence tolerance (relative, with an absolute floor for ~0 answers)
    NUM_REL_TOL: 0.01, // 1% — generous enough for rounding (e.g. 6.02e23), tight enough to catch errors
    NUM_ABS_TOL: 1e-9, // absolute floor so values near 0 compare sanely
    // a "short symbolic" answer is graded by normalized string equality only when it is
    // brief enough to be unambiguous (a single expression / token, not a sentence).
    SYMBOLIC_MAX_LEN: 24,
    // run sizing
    DEFAULT_RUN_SIZE: 10,
    MIN_RUN_SIZE: 3,
    // FSRS rating mapping used to feed the engine's existing grade() path from a verdict.
    // correct → "Good" (3); incorrect → "Again" (1). Self-graded uses the same map but is
    // flagged selfGraded so the engine/audit can weight it lower (firewall, bkt-dji).
    RATING_CORRECT: 3,
    RATING_INCORRECT: 1,
    // Bloom level ordering (matches adaptive.js PROF_DEPTH_B + app.js pickLevel).
    LEVELS: ["recall", "apply", "derive", "teach"],
  };

  /* ======================================================================
   * (1) DETERMINISTIC GRADER (bkt-3so)
   *
   * The corpus stores answers as EXPLANATORY PROSE (e.g. "18 g ÷ 18 g/mol = 1 mol,
   * so 6.022×10²³ molecules."), not clean answer fields. So we:
   *   a. try to extract a SALIENT comparable value from the canonical answer — the
   *      final numeric quantity (with optional unit / scientific notation) OR a short
   *      symbolic token (e.g. "pH = 4.7", "η = 1 − T_c/T_h", "2^4 = 16 states").
   *   b. normalize the learner's input the SAME way and compare.
   *   c. if no clean salient value can be extracted, declare the item NOT auto-gradable
   *      (gradable=false) — the caller falls back to an honest self-check (lower trust).
   *
   * Returns: { gradable, correct, kind, expected, got, reason }
   *   gradable=false  → caller MUST self-check (we refuse to guess on prose).
   * ==================================================================== */

  // Map common unicode math/notation to ascii so "6.022×10²³" == "6.022e23" etc.
  var SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+" };
  function asciiMath(s) {
    s = String(s == null ? "" : s);
    // superscripts → ^digits (so 10²³ → 10^23, x² → x^2)
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, function (run) {
      var out = "";
      for (var i = 0; i < run.length; i++) out += SUP[run[i]] || "";
      return "^" + out;
    });
    return s
      .replace(/[×·∙*]/g, "x")        // multiplication signs → x (used only inside number parsing)
      .replace(/[−–—]/g, "-")          // unicode minus/dashes → ascii hyphen
      .replace(/[≈~≃≅]/g, "")          // approximate signs are noise for equivalence
      .replace(/ /g, " ")          // nbsp → space
      .replace(/[,](?=\d{3}\b)/g, "");  // thousands separators: 1,000 → 1000
  }

  // Whitespace + case normalizer for symbolic comparison.
  function normSymbolic(s) {
    return asciiMath(s)
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[.;]+$/, ""); // trailing punctuation
  }

  // Parse a single numeric value (supports 6.022e23, 6.022x10^23, 1.0e-14, fractions a/b,
  // leading +/-). Returns Number or null.
  function parseNumber(tok) {
    if (tok == null) return null;
    var s = asciiMath(String(tok)).trim().toLowerCase();
    if (!s) return null;
    // a x 10^b  →  a e b   (after asciiMath, "×10²³" became "x10^23"; tolerate spaces
    // around the mantissa-x-exponent, e.g. "6.022 x 10^23").
    s = s.replace(/\s*x\s*10\s*\^\s*([+-]?\d+)/g, "e$1");
    // bare "10^b" → "1e b"
    s = s.replace(/(^|[^0-9.])10\s*\^\s*([+-]?\d+)/g, "$11e$2");
    // collapse any leftover internal whitespace inside the number token
    s = s.replace(/\s+/g, "");
    // simple fraction a/b
    var fr = s.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*([+-]?\d+(?:\.\d+)?)$/);
    if (fr) {
      var d = parseFloat(fr[2]);
      if (d === 0) return null;
      return parseFloat(fr[1]) / d;
    }
    // plain or scientific number, optionally with a trailing % handled by caller
    var m = s.match(/^[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/);
    if (m) return parseFloat(s);
    return null;
  }

  // Extract the salient numeric value + unit from a string. We prefer the value that
  // appears after the LAST "=" (the conclusion of a worked answer), else the last
  // standalone number in the string. Returns { value, unit } or null.
  function extractSalientNumber(str) {
    var s = asciiMath(str);
    // candidate region: text after the final "=" if present, else the whole string
    var eq = s.lastIndexOf("=");
    var region = eq >= 0 ? s.slice(eq + 1) : s;
    // a number, optionally scientific (a x 10^b already → a e b inside parseNumber), with
    // an optional unit word/symbol immediately after. Scan all, take the last.
    var re = /([+-]?\d+(?:\.\d+)?(?:\s*[ex]\s*10\s*\^\s*[+-]?\d+|\s*e[+-]?\d+|\s*\^\s*[+-]?\d+)?)\s*(%|[a-zµμ°Ω/·\-]+(?:\^?[+-]?\d+)?)?/gi;
    var matches = [], mm;
    while ((mm = re.exec(region)) !== null) {
      var raw = mm[1];
      var val = parseNumber(raw);
      if (val == null) continue;
      var unit = (mm[2] || "").trim();
      // ignore a stray unit that is actually trailing prose like "so" / "the"
      if (/^(so|the|of|is|a|an|to|and|or|it)$/i.test(unit)) unit = "";
      matches.push({ value: val, unit: normUnit(unit) });
    }
    if (!matches.length) return null;
    return matches[matches.length - 1];
  }

  // Normalize a unit string: lowercase, strip dots/spaces, common aliases.
  function normUnit(u) {
    if (!u) return "";
    u = String(u).toLowerCase().replace(/\s|\./g, "");
    u = u.replace(/µ|μ/g, "u"); // micro
    // "%" stays "%"; otherwise keep as-is (we compare loosely below)
    return u;
  }

  // Are two unit strings compatible? Empty on either side = unit-agnostic (we don't
  // penalize a learner who omitted an obvious unit). Otherwise require a normalized match.
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

  /* The grader. Decide whether the canonical answer is auto-gradable, and if so grade
   * the learner's input against it.
   *
   *   userInput        — the learner's typed answer (string)
   *   canonicalAnswer  — the corpus answer string (prose OR short symbolic)
   *
   * Strategy, in order:
   *   1. If the learner typed nothing → gradable but incorrect (a blank is wrong).
   *   2. If the canonical answer yields a salient NUMBER → numeric tolerance compare
   *      (after pulling the learner's salient number too). Units compared loosely.
   *   3. Else if BOTH sides are SHORT symbolic tokens → normalized string equality.
   *   4. Else → not auto-gradable (gradable=false); caller self-checks.
   */
  function gradeAnswer(userInput, canonicalAnswer, opts) {
    opts = opts || {};
    var raw = userInput == null ? "" : String(userInput).trim();
    var canon = canonicalAnswer == null ? "" : String(canonicalAnswer).trim();

    // 2. numeric path — canonical has an extractable salient number.
    var cNum = extractSalientNumber(canon);
    if (cNum != null) {
      if (!raw) return { gradable: true, correct: false, kind: "numeric", expected: fmtNum(cNum), got: "", reason: "blank" };
      var uNum = extractSalientNumber(raw);
      if (uNum == null) {
        // learner answered but no parseable number — can't auto-confirm; self-check.
        return { gradable: false, kind: "numeric", expected: fmtNum(cNum), got: raw, reason: "no_number_in_input" };
      }
      var ok = numbersClose(uNum.value, cNum.value, opts) && unitsCompatible(uNum.unit, cNum.unit);
      return { gradable: true, correct: ok, kind: "numeric", expected: fmtNum(cNum), got: fmtNum(uNum), reason: ok ? "match" : "value_or_unit_mismatch" };
    }

    // 3. short symbolic path — both sides brief, unambiguous tokens.
    if (canon && canon.length <= ASSESS.SYMBOLIC_MAX_LEN) {
      if (!raw) return { gradable: true, correct: false, kind: "symbolic", expected: canon, got: "", reason: "blank" };
      var nc = normSymbolic(canon);
      var nu = normSymbolic(raw);
      if (!nc) return { gradable: false, kind: "symbolic", expected: canon, got: raw, reason: "empty_canonical" };
      // accept if the learner's normalized token equals the canonical, OR the canonical
      // is the salient half of an "x = y" canonical written as just "y".
      var ncRhs = nc.indexOf("=") >= 0 ? nc.slice(nc.lastIndexOf("=") + 1) : nc;
      var nuRhs = nu.indexOf("=") >= 0 ? nu.slice(nu.lastIndexOf("=") + 1) : nu;
      var ok2 = nu === nc || nuRhs === ncRhs || nu === ncRhs || nuRhs === nc;
      return { gradable: true, correct: ok2, kind: "symbolic", expected: canon, got: raw, reason: ok2 ? "match" : "mismatch" };
    }

    // 4. prose / open answer — refuse to guess. Caller falls back to honest self-check.
    return { gradable: false, kind: "open", expected: canon, got: raw, reason: "not_auto_gradable" };
  }

  function fmtNum(n) {
    if (n == null) return "";
    if (typeof n === "object") return n.value + (n.unit ? " " + n.unit : "");
    return String(n);
  }

  /* ======================================================================
   * (2) BUILD A SEALED RUN
   *
   * Pick a spread of quiz items across the learner's STARTED + DUE concepts and Bloom
   * levels for the current branch (or a passed-in concept set). Each item is a {atomId,
   * level, prompt, answer} drawn from the atom's quiz array. The run is SEALED: the UI
   * must not reveal the answer until the learner has responded.
   *
   *   graph  = { atoms, byId }                 (E.atoms / E.byId)
   *   state  = { cardForId(id) -> card|null }  (a thin view over the engine so this stays
   *                                             pure; pass () => E.cardFor(id) at the call site)
   *   opts   = { size, conceptIds, levels, rng }
   *
   * Selection policy (honest + useful):
   *   • Universe = started concepts (have a card) if any, else all askable concepts —
   *     you can't be tested on what you've never seen, but a fresh learner can still
   *     probe themselves on the foundations.
   *   • Prefer breadth: at most one item per concept until we run out of concepts, then
   *     allow a second pass at a HARDER level on the highest-leverage concepts.
   *   • Spread Bloom levels: round-robin recall→apply→derive→teach across the picks, so a
   *     run measures depth, not just recall.
   *   • DUE concepts (overdue review) are prioritized — testing what's fading is the most
   *     informative use of the learner's time.
   * ==================================================================== */
  function buildRun(graph, state, opts) {
    opts = opts || {};
    var atoms = (graph && graph.atoms) || [];
    var byId = (graph && graph.byId) || {};
    var size = Math.max(ASSESS.MIN_RUN_SIZE, opts.size || ASSESS.DEFAULT_RUN_SIZE);
    var rng = opts.rng || Math.random;
    var cardFor = (state && state.cardForId) || function () { return null; };
    var now = opts.now || Date.now();

    // askable concept atoms (carry a quiz). Language atoms are out of scope for v1 (the
    // self-test targets concept branches; polyglot keeps its own recall drill).
    function askable(a) { return a && a.quiz && a.quiz.length; }

    var pool;
    if (opts.conceptIds && opts.conceptIds.length) {
      pool = opts.conceptIds.map(function (id) { return byId[id]; }).filter(askable);
    } else {
      var started = atoms.filter(function (a) { return askable(a) && cardFor(a.id); });
      pool = started.length ? started : atoms.filter(askable);
    }
    if (!pool.length) return { items: [], conceptCount: 0, branch: (graph && graph.branch) || null };

    // rank concepts: DUE first (most overdue), then higher leverage, with a little jitter
    // so repeated runs aren't identical.
    function dueness(a) {
      var c = cardFor(a.id);
      if (c && c.due != null && c.due <= now) return (now - c.due);
      return -1;
    }
    var ranked = pool.slice().sort(function (a, b) {
      var da = dueness(a), db = dueness(b);
      if ((da >= 0) !== (db >= 0)) return db - da; // due ones first
      return (b.leverage || 0) - (a.leverage || 0) || (rng() - 0.5);
    });

    // round-robin Bloom levels across picks for depth coverage.
    var levelCycle = opts.levels && opts.levels.length ? opts.levels.slice() : ASSESS.LEVELS.slice();
    var items = [];
    var usedConcept = {};
    var li = 0;

    function pickItemFor(atom, preferLevel) {
      var quiz = atom.quiz || [];
      // try the preferred level, then walk down to easier, then anything available.
      var order = [preferLevel].concat(ASSESS.LEVELS.filter(function (l) { return l !== preferLevel; }));
      for (var k = 0; k < order.length; k++) {
        var q = quiz.find(function (x) { return x.level === order[k]; });
        if (q) return { atomId: atom.id, title: atom.title || atom.id, level: q.level, prompt: q.prompt, answer: q.answer, eq: q.eq || null, shell: atom.shell };
      }
      return null;
    }

    // pass 1 — breadth: one item per concept, cycling Bloom levels.
    for (var i = 0; i < ranked.length && items.length < size; i++) {
      var atom = ranked[i];
      var lvl = levelCycle[li % levelCycle.length]; li++;
      var it = pickItemFor(atom, lvl);
      if (it) { items.push(it); usedConcept[atom.id] = (usedConcept[atom.id] || []).concat(it.level); }
    }
    // pass 2 — depth: if still short and we exhausted concepts, revisit the highest-leverage
    // concepts at a level we haven't used yet (a harder probe).
    var di = 0;
    while (items.length < size && ranked.length) {
      var a2 = ranked[di % ranked.length]; di++;
      if (di > ranked.length * ASSESS.LEVELS.length) break; // safety
      var used = usedConcept[a2.id] || [];
      var unused = ASSESS.LEVELS.filter(function (l) { return used.indexOf(l) < 0; });
      if (!unused.length) continue;
      var it2 = pickItemFor(a2, unused[unused.length - 1]); // prefer the HARDER unused level
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

  /* ======================================================================
   * (3) SUMMARIZE A FINISHED RUN
   *
   * results = [ { atomId, level, correct, autoGraded, latencyMs } ]  (one per answered item)
   *
   * Returns an honest summary:
   *   { total, correct, score (0..1),
   *     auto: {total, correct}, self: {total, correct},   ← trust split (firewall)
   *     byLevel: { recall:{t,c}, apply:{t,c}, ... },
   *     weakConcepts: [atomId,...]  (missed, dedup, for "what to review")
   *     trust: 'high'|'mixed'|'self'  (how much of the score is deterministic) }
   * ==================================================================== */
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

  /* Map a graded item to the FSRS rating the engine's grade() path expects. The engine
   * already updates the Elo-lite proficiency (adaptive.js) from this rating at the
   * answered depth — so feeding assessment verdicts through grade() makes masteryDetail()
   * reflect TESTED proficiency. Auto-graded correctness is the trustworthy signal; a
   * self-reported "I got it" is passed through but flagged so the caller can choose to
   * down-weight it (e.g. record it in the assess log with selfGraded=true; the firewall
   * keeps it out of any future credential). */
  function ratingFor(verdict) {
    return verdict ? ASSESS.RATING_CORRECT : ASSESS.RATING_INCORRECT;
  }

  var api = {
    ASSESS: ASSESS,
    gradeAnswer: gradeAnswer,
    buildRun: buildRun,
    summarize: summarize,
    ratingFor: ratingFor,
    // exposed for tests / reuse
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
