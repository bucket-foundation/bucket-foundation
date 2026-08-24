/* Bucket Academy, adaptive core (P1, bkt-jh0).
 *
 * Pure, dependency-free building blocks for the three P1 upgrades, factored out
 * of engine.js so they are unit-testable in isolation and shared verbatim with
 * the server-side port (src/lib/academy/mastery.ts MUST mirror the math here):
 *
 * 1. Two-layer graph (bkt-ecr): derive ENCOMPASSING relations + weights from
 * the `requires` DAG. An atom encompasses each of its (transitive)
 * prerequisites with a weight that DECAYS by graph distance, the
 * "probability a random problem in the advanced atom exercises a random
 * problem in the simpler one" (Math Academy's framing). This is the layer
 * FIRe propagates over.
 *
 * 2. FIRe (bkt-buk): Fractional Implicit Repetition. A successful review of an
 * advanced atom credits its prerequisites a *small, bounded, principled*
 * fraction of a repetition, nudging their FSRS stability up and pushing
 * their due date out, scaled by the encompassing weight. Bounded +
 * idempotent so it can never dishonestly inflate mastery.
 *
 * 3. Mastery model (bkt-uzx): replace stability-only mastery with
 * proficiency x retention. Proficiency is an Elo-lite per-concept ability
 * estimate (online IRT, Pelanek 2016) updated from graded reviews;
 * retention is FSRS retrievability at a fixed horizon T. Fuse
 * multiplicatively M = P^alpha * R^beta and surface an confidence
 * band (emerging / developing / established), never a fake-precise score.
 *
 * HONESTY GUARDRAIL (EPIC.md §5): this is the client-side APPROXIMATION of the
 * SOTA stack (ADAPTIVE-SOTA.md §b). Real IRT calibration (>=200 responses/item),
 * the ALEKS diagnostic, the practice/credential firewall and exam-validation are
 * LATER beads (P2+). Nothing here certifies mastery; it produces an
 * uncertainty-visible learning signal only.
 *
 * UMD-ish: attaches to window in the browser, module.exports under node (tests).
 */
(function (global) {
  "use strict";

  /* ======================================================================
 * Tunable constants, documented, conservative, all in one place.
 * ==================================================================== */
  var ADAPTIVE = {
    /* --- (1) Encompassing graph --- */
    // Weight an atom assigns to a DIRECT prerequisite (graph distance 1).
    ENCOMPASS_BASE: 0.6,
    // Multiplicative decay per extra hop of graph distance. weight(d)=BASE*DECAY^(d-1).
    ENCOMPASS_DECAY: 0.5,
    // Floor: edges below this propagated weight are dropped (sparse layer, per
    // ADAPTIVE-SOTA.md "modest encompassing density captures most of the benefit").
    ENCOMPASS_MIN: 0.05,
    // Safety cap on transitive distance explored (keeps it O(atoms) on big graphs).
    ENCOMPASS_MAX_HOPS: 4,

    /* --- (2) FIRe --- */
    // A full successful repetition credits 1.0 "implicit rep". FIRe gives a
    // prerequisite at most this fraction of one, scaled further by encompassing
    // weight and the trigger's own success. Small on purpose.
    FIRE_MAX_CREDIT: 0.5,
    // Hard ceiling on the stability multiplier a single FIRe event may apply, so
    // implicit credit can NEVER exceed what a real explicit review would give.
    FIRE_MAX_STABILITY_GAIN: 0.15, // <= +15% stability per event
    // Only prerequisites the learner has already STARTED and currently retain
    // reasonably well get credit (you can't implicitly reinforce what you never
    // learned, and crediting a near-forgotten card would be dishonest).
    FIRE_MIN_RETRIEVABILITY: 0.6,
    // Rating threshold (FSRS 1=Again..4=Easy). Credit only on >= Good.
    FIRE_MIN_RATING: 3,

    /* --- (3) Proficiency (Elo-lite / online IRT) --- */
    PROF_INIT: 0.0, // initial ability (logit scale; 0 == at item-baseline difficulty)
    // Uncertainty-scaled learning rate U(n)=a/(1+b*n): fast then auto-stabilizes
    // (Pelanek 2016). n = number of graded attempts on this concept.
    PROF_K_A: 1.0,
    PROF_K_B: 0.05,
    // Per-depth item difficulty on the logit scale (Recall easiest .. Teach hardest).
    // A correct answer at a harder depth moves ability more, this is the IRT b term.
    PROF_DEPTH_B: { recall: -0.8, apply: -0.2, derive: 0.6, teach: 1.2 },
    // Map a 1..4 FSRS rating to a graded correctness in [0,1] (partial credit):
    // Again=0 (wrong), Hard=0.6, Good=1.0, Easy=1.0. Hard is a struggled-but-correct.
    PROF_RATING_SCORE: { 1: 0.0, 2: 0.6, 3: 1.0, 4: 1.0 },
    // Logistic slope for turning ability-minus-difficulty into P(correct) and back.
    PROF_SLOPE: 1.0,

    /* --- (3) Mastery fusion M = P^alpha * R^beta --- */
    MASTERY_ALPHA: 1.0, // proficiency exponent
    MASTERY_BETA: 1.0, // retention exponent (geometric mean at 1,1)
    RETENTION_HORIZON_DAYS: 90, // T: "will they still have it in 90 days?"
  };

  var DAY = 86400000;
  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  /* ======================================================================
 * (1) TWO-LAYER GRAPH, encompassing map derived from the requires DAG.
 *
 * For each atom A, walk its prerequisite closure (A.requires, then THEIR
 * requires...). A prerequisite P reached at graph distance d gets weight
 * w(P) = ENCOMPASS_BASE * ENCOMPASS_DECAY^(d-1)
 * (the shortest distance wins if P is reachable by several paths). Weights
 * below ENCOMPASS_MIN are dropped. Result:
 * { atomId: [ {id, weight, dist}... ] } // sorted weight desc
 *
 * Interpretation (Math Academy): w ≈ fraction of skill P implicitly exercised
 * when you solve a problem in A.
 * ==================================================================== */
  function buildEncompassingMap(atoms, byId, opts) {
    opts = opts || {};
    var BASE = opts.base != null ? opts.base : ADAPTIVE.ENCOMPASS_BASE;
    var DECAY = opts.decay != null ? opts.decay : ADAPTIVE.ENCOMPASS_DECAY;
    var MIN = opts.min != null ? opts.min : ADAPTIVE.ENCOMPASS_MIN;
    var MAX_HOPS = opts.maxHops != null ? opts.maxHops : ADAPTIVE.ENCOMPASS_MAX_HOPS;
    byId = byId || {};
    if (!byId || !Object.keys(byId).length) {
      atoms.forEach(function (a) { byId[a.id] = a; });
    }
    var map = {};
    atoms.forEach(function (a) {
      // BFS over prerequisites; shortest distance to each ancestor.
      var best = {}; // ancestorId -> shortest dist
      var frontier = (a.requires || []).map(function (r) { return { id: r, d: 1 }; });
      while (frontier.length) {
        var next = [];
        for (var i = 0; i < frontier.length; i++) {
          var node = frontier[i];
          if (node.id === a.id) continue; // no self-edges (cycle guard)
          if (best[node.id] != null && best[node.id] <= node.d) continue;
          best[node.id] = node.d;
          if (node.d >= MAX_HOPS) continue;
          var p = byId[node.id];
          if (!p) continue;
          (p.requires || []).forEach(function (r2) {
            next.push({ id: r2, d: node.d + 1 });
          });
        }
        frontier = next;
      }
      var edges = [];
      Object.keys(best).forEach(function (pid) {
        if (!byId[pid]) return; // dangling requires reference, skip
        var d = best[pid];
        var w = BASE * Math.pow(DECAY, d - 1);
        if (w >= MIN) edges.push({ id: pid, weight: +w.toFixed(4), dist: d });
      });
      edges.sort(function (x, y) { return y.weight - x.weight; });
      map[a.id] = edges;
    });
    return map;
  }

  /* ======================================================================
 * (2) FIRe, fractional implicit repetition.
 *
 * Given a successful review of `triggerId` (rating >= Good) and the
 * encompassing edges of that atom, compute the bounded FSRS adjustment for
 * each prerequisite card. Returns a list of patches the engine applies:
 * [ { id, stability:newS, due:newDue, credit }... ]
 *
 * Properties:
 * - BOUNDED: stability gain per event <= FIRE_MAX_STABILITY_GAIN (+15%), and
 * the credit fraction <= FIRE_MAX_CREDIT * weight. Implicit credit can never
 * exceed a real explicit review.
 * - IDEMPOTENT-ISH: credit scales the EXISTING stability multiplicatively and
 * only pushes `due` further out (never pulls it in), so re-applying a weaker
 * event is a no-op and the schedule is monotone. We also gate on current
 * retrievability so a card already deep in its interval isn't repeatedly
 * juiced.
 * -: only STARTED prerequisites that are still reasonably retained get
 * credit; we never resurrect a forgotten card or create cards implicitly.
 *
 * `fsrs` is the FSRS instance (for retrievability + interval). `cards` is the
 * engine card map. `ratingScore` in [0,1] is how strong the trigger success was.
 * ==================================================================== */
  function fireCredits(triggerId, encEdges, cards, fsrs, now, ratingScore, opts) {
    opts = opts || {};
    var MAX_CREDIT = opts.maxCredit != null ? opts.maxCredit : ADAPTIVE.FIRE_MAX_CREDIT;
    var MAX_GAIN = opts.maxGain != null ? opts.maxGain : ADAPTIVE.FIRE_MAX_STABILITY_GAIN;
    var MIN_R = opts.minR != null ? opts.minR : ADAPTIVE.FIRE_MIN_RETRIEVABILITY;
    now = now || Date.now();
    if (ratingScore == null) ratingScore = 1;
    var patches = [];
    (encEdges || []).forEach(function (e) {
      var card = cards[e.id];
      if (!card || card.stability == null || card.state === "new") return; // must be started
      var elapsed = Math.max(0, (now - (card.lastReview || now)) / DAY);
      var R = fsrs.retrievability(elapsed, card.stability);
      if (R < MIN_R) return; // don't juice a near-forgotten card (dishonest)
      // credit fraction in [0,1]: encompassing weight * success strength * cap.
      var credit = Math.min(MAX_CREDIT, e.weight * MAX_CREDIT) * ratingScore;
      if (credit <= 0) return;
      // Stability gain proportional to credit, hard-capped at MAX_GAIN.
      var gain = Math.min(MAX_GAIN, credit * MAX_GAIN);
      var newS = card.stability * (1 + gain);
      // Recompute a due date from the boosted stability, but NEVER pull due in.
      var ivl = fsrs.interval(newS);
      var newDue = Math.max(card.due || 0, (card.lastReview || now) + ivl * DAY);
      patches.push({
        id: e.id,
        stability: +newS.toFixed(4),
        due: newDue,
        credit: +credit.toFixed(4),
        weight: e.weight,
      });
    });
    return patches;
  }

  /* ======================================================================
 * (3a) PROFICIENCY, Elo-lite online IRT per concept.
 *
 * State per concept: { theta, n } (ability on logit scale, #graded attempts).
 * Item difficulty b comes from the answered DEPTH (recall < apply < derive <
 * teach). Update from a graded score s in [0,1]:
 * P = sigmoid(slope * (theta - b))
 * K = a / (1 + b_k * n) // uncertainty fn: fast then settles
 * theta = theta + K * (s - P) // single-pass SGD on the IRT log-lik
 * Returns the NEW proficiency state. Interpretable, online, no calibration.
 * ==================================================================== */
  function initProficiency() {
    return { theta: ADAPTIVE.PROF_INIT, n: 0 };
  }
  function updateProficiency(prof, depth, ratingScore, opts) {
    opts = opts || {};
    var A = opts.a != null ? opts.a : ADAPTIVE.PROF_K_A;
    var B = opts.b != null ? opts.b : ADAPTIVE.PROF_K_B;
    var slope = opts.slope != null ? opts.slope : ADAPTIVE.PROF_SLOPE;
    var diffTable = opts.depthB || ADAPTIVE.PROF_DEPTH_B;
    prof = prof && typeof prof.theta === "number" ? { theta: prof.theta, n: prof.n || 0 } : initProficiency();
    var b = diffTable[depth];
    if (b == null) b = 0;
    var P = sigmoid(slope * (prof.theta - b));
    var K = A / (1 + B * prof.n);
    prof.theta = prof.theta + K * (ratingScore - P);
    prof.n = prof.n + 1;
    return prof;
  }

  /* Proficiency as a 0..1 readout, evaluated at a reference difficulty (default
 * the `apply` depth = "can you use it").: brand-new concepts
 * (n small) sit near 0.5 by construction (no evidence yet => not confident). */
  function proficiencyScore(prof, opts) {
    opts = opts || {};
    var slope = opts.slope != null ? opts.slope : ADAPTIVE.PROF_SLOPE;
    var refB = opts.refB != null ? opts.refB : ADAPTIVE.PROF_DEPTH_B.apply;
    if (!prof || typeof prof.theta !== "number" || prof.n === 0) return 0;
    return clamp01(sigmoid(slope * (prof.theta - refB)));
  }

  /* ======================================================================
 * (3b) MASTERY FUSION, M = P^alpha * R^beta.
 *
 * Proficiency P = proficiencyScore(prof). Retention R = FSRS retrievability at
 * the credential horizon T (90d) given current stability. Multiplicative so a
 * zero in either collapses M (a credential needs BOTH "can do it" AND "kept
 * it"). Returns a 0..1 number; richer detail via masteryDetail().
 * ==================================================================== */
  function retentionAtHorizon(fsrs, card, opts) {
    opts = opts || {};
    var T = opts.horizon != null ? opts.horizon : ADAPTIVE.RETENTION_HORIZON_DAYS;
    if (!card || card.stability == null) return 0;
    return clamp01(fsrs.retrievability(T, card.stability));
  }

  function fuseMastery(P, R, opts) {
    opts = opts || {};
    var alpha = opts.alpha != null ? opts.alpha : ADAPTIVE.MASTERY_ALPHA;
    var beta = opts.beta != null ? opts.beta : ADAPTIVE.MASTERY_BETA;
    P = clamp01(P); R = clamp01(R);
    if (P <= 0 || R <= 0) return 0;
    return clamp01(Math.pow(P, alpha) * Math.pow(R, beta));
  }

  /* Confidence band: qualitative uncertainty (mirrors mastery.ts).
 * Driven by evidence VOLUME (graded attempts n) + current retention R.
 * Never a fake-precise RD number; that's a later validated bead. */
  function confidenceBand(profN, retention) {
    if (profN >= 6 && retention >= 0.7) {
      return { band: "established", note: "Re-demonstrated several times and still well-retained." };
    }
    if (profN >= 2 && retention >= 0.4) {
      return { band: "developing", note: "A growing record — still accumulating spaced re-demonstrations." };
    }
    return { band: "emerging", note: "Early signal — limited practice so far; provisional, not proven." };
  }

  /* Full per-concept detail object (for the profile + future UI). */
  function masteryDetail(prof, fsrs, card, now, opts) {
    opts = opts || {};
    now = now || Date.now();
    var P = proficiencyScore(prof, opts);
    var R = retentionAtHorizon(fsrs, card, opts);
    var M = fuseMastery(P, R, opts);
    var liveR = null, daysSince = null;
    if (card && card.stability != null && card.lastReview != null) {
      var elapsed = Math.max(0, (now - card.lastReview) / DAY);
      daysSince = +elapsed.toFixed(1);
      liveR = +fsrs.retrievability(elapsed, card.stability).toFixed(3);
    }
    var n = (prof && prof.n) || 0;
    var conf = confidenceBand(n, R);
    return {
      mastery: +M.toFixed(3),
      proficiency: +P.toFixed(3),
      retention: +R.toFixed(3), // retention at horizon T
      retrievabilityNow: liveR, // live forgetting-curve readout
      daysSinceReview: daysSince,
      theta: prof && typeof prof.theta === "number" ? +prof.theta.toFixed(3) : null,
      attempts: n,
      confidence: conf.band,
      confidenceNote: conf.note,
    };
  }

  var api = {
    ADAPTIVE: ADAPTIVE,
    sigmoid: sigmoid,
    clamp01: clamp01,
    buildEncompassingMap: buildEncompassingMap,
    fireCredits: fireCredits,
    initProficiency: initProficiency,
    updateProficiency: updateProficiency,
    proficiencyScore: proficiencyScore,
    retentionAtHorizon: retentionAtHorizon,
    fuseMastery: fuseMastery,
    confidenceBand: confidenceBand,
    masteryDetail: masteryDetail,
  };

  global.Adaptive = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
