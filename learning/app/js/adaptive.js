(function (global) {
  "use strict";

  var ADAPTIVE = {
    ENCOMPASS_BASE: 0.6,
    ENCOMPASS_DECAY: 0.5,
    ENCOMPASS_MIN: 0.05,
    ENCOMPASS_MAX_HOPS: 4,

    FIRE_MAX_CREDIT: 0.5,
    FIRE_MAX_STABILITY_GAIN: 0.15,
    FIRE_MIN_RETRIEVABILITY: 0.6,
    FIRE_MIN_RATING: 3,

    PROF_INIT: 0.0,
    PROF_K_A: 1.0,
    PROF_K_B: 0.05,
    PROF_DEPTH_B: { recall: -0.8, apply: -0.2, derive: 0.6, teach: 1.2 },
    PROF_RATING_SCORE: { 1: 0.0, 2: 0.6, 3: 1.0, 4: 1.0 },
    PROF_SLOPE: 1.0,

    MASTERY_ALPHA: 1.0,
    MASTERY_BETA: 1.0,
    RETENTION_HORIZON_DAYS: 90,
  };

  var DAY = 86400000;
  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

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
      var best = {};
      var frontier = (a.requires || []).map(function (r) { return { id: r, d: 1 }; });
      while (frontier.length) {
        var next = [];
        for (var i = 0; i < frontier.length; i++) {
          var node = frontier[i];
          if (node.id === a.id) continue;
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
        if (!byId[pid]) return;
        var d = best[pid];
        var w = BASE * Math.pow(DECAY, d - 1);
        if (w >= MIN) edges.push({ id: pid, weight: +w.toFixed(4), dist: d });
      });
      edges.sort(function (x, y) { return y.weight - x.weight; });
      map[a.id] = edges;
    });
    return map;
  }

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
      if (!card || card.stability == null || card.state === "new") return;
      var elapsed = Math.max(0, (now - (card.lastReview || now)) / DAY);
      var R = fsrs.retrievability(elapsed, card.stability);
      if (R < MIN_R) return;
      var credit = Math.min(MAX_CREDIT, e.weight * MAX_CREDIT) * ratingScore;
      if (credit <= 0) return;
      var gain = Math.min(MAX_GAIN, credit * MAX_GAIN);
      var newS = card.stability * (1 + gain);
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

  function proficiencyScore(prof, opts) {
    opts = opts || {};
    var slope = opts.slope != null ? opts.slope : ADAPTIVE.PROF_SLOPE;
    var refB = opts.refB != null ? opts.refB : ADAPTIVE.PROF_DEPTH_B.apply;
    if (!prof || typeof prof.theta !== "number" || prof.n === 0) return 0;
    return clamp01(sigmoid(slope * (prof.theta - refB)));
  }

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

  function confidenceBand(profN, retention) {
    if (profN >= 6 && retention >= 0.7) {
      return { band: "established", note: "Re-demonstrated several times and still well-retained." };
    }
    if (profN >= 2 && retention >= 0.4) {
      return { band: "developing", note: "A growing record — still accumulating spaced re-demonstrations." };
    }
    return { band: "emerging", note: "Early signal — limited practice so far; provisional, not proven." };
  }

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
      retention: +R.toFixed(3),
      retrievabilityNow: liveR,
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
