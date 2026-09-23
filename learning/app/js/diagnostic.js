(function (global) {
  "use strict";

  const W_CORRECT = 1.55;
  const W_INCORRECT = 1.35;
  const W_SLOW = 0.55;
  const PROP_DECAY = 0.62;
  const PROP_FLOOR = 0.18;
  const INFER_FLOOR = 1.40;
  const CLOSURE_BIAS = 0.15;
  const UNCERTAIN_LO = 0.32;
  const UNCERTAIN_HI = 0.68;
  const MAX_Q_DEFAULT = 18;
  const KNOWN_THRESHOLD = 0.62;

  function clamp01(x) { return x < 1e-4 ? 1e-4 : x > 1 - 1e-4 ? 1 - 1e-4 : x; }
  function logit(p) { p = clamp01(p); return Math.log(p / (1 - p)); }
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

  function buildClosures(atoms, byId) {
    const reqC = {}, unlC = {};
    function reqOf(id, seen) {
      seen = seen || new Set();
      const a = byId[id];
      if (!a) return seen;
      (a.requires || []).forEach((r) => {
        if (byId[r] && !seen.has(r)) { seen.add(r); reqOf(r, seen); }
      });
      return seen;
    }
    function unlOf(id, seen) {
      seen = seen || new Set();
      const a = byId[id];
      if (!a) return seen;
      (a.unlocks || []).forEach((u) => {
        if (byId[u] && !seen.has(u)) { seen.add(u); unlOf(u, seen); }
      });
      return seen;
    }
    atoms.forEach((a) => {
      reqC[a.id] = reqOf(a.id);
      unlC[a.id] = unlOf(a.id);
    });
    const between = {};
    let maxB = 1;
    atoms.forEach((a) => {
      const b = (reqC[a.id].size + 1) * (unlC[a.id].size + 1) + (a.leverage || 0) * 3;
      between[a.id] = b;
      if (b > maxB) maxB = b;
    });
    atoms.forEach((a) => (between[a.id] = between[a.id] / maxB));
    return { reqC, unlC, between };
  }

  function Diagnostic(graph, opts) {
    opts = opts || {};
    this.atoms = (graph.atoms || []).filter((a) => this._askable(a));
    this.byId = graph.byId || {};
    this.maxQ = opts.maxQuestions || MAX_Q_DEFAULT;
    this.isLang = !!opts.isLang;
    const view = buildClosures(graph.atoms || [], this.byId);
    this.reqC = view.reqC;
    this.unlC = view.unlC;
    this.between = view.between;
    this.reset();
  }

  Diagnostic.prototype._askable = function (a) {
    if (!a) return false;
    if (a.quiz && a.quiz.length) return true;
    if (a.forms && (a.gloss || a.title)) return true;
    return false;
  };

  Diagnostic.prototype.reset = function () {
    this.logodds = {};
    const prior = logit(0.4);
    this.atoms.forEach((a) => (this.logodds[a.id] = prior));
    this.asked = [];
    this.askedSet = new Set();
    this._started = false;
  };

  Diagnostic.prototype.start = function () {
    this.reset();
    this._started = true;
    return this;
  };

  Diagnostic.prototype.p = function (id) { return sigmoid(this.logodds[id]); };

  Diagnostic.prototype.done = function () {
    if (!this._started) return false;
    if (this.asked.length >= this.maxQ) return true;
    if (this.askedSet.size >= this.atoms.length) return true;
    return !this.atoms.some((a) => {
      if (this.askedSet.has(a.id)) return false;
      const p = this.p(a.id);
      return p >= UNCERTAIN_LO && p <= UNCERTAIN_HI;
    });
  };

  Diagnostic.prototype.next = function () {
    if (this.done()) return null;
    const proven = this.asked.some((a) => a.correct);
    let maxReqC = 1;
    if (proven) this.atoms.forEach((a) => { if (this.reqC[a.id].size > maxReqC) maxReqC = this.reqC[a.id].size; });
    let best = null, bestScore = Infinity;
    this.atoms.forEach((a) => {
      if (this.askedSet.has(a.id)) return;
      const p = this.p(a.id);
      let score = Math.abs(p - 0.5) - this.between[a.id] * 0.12;
      if (proven) score -= (this.reqC[a.id].size / maxReqC) * CLOSURE_BIAS;
      if (score < bestScore) { bestScore = score; best = a; }
    });
    if (!best) return null;
    return this._payload(best);
  };

  Diagnostic.prototype._payload = function (a) {
    const total = Math.min(this.maxQ, this.atoms.length);
    if (a.forms) {
      return {
        id: a.id, atom: a, level: "recall", isLang: true,
        prompt: a.gloss || a.title || a.id, answer: null,
        qIndex: this.asked.length + 1, total: total,
      };
    }
    const order = ["recall", "apply", "derive", "teach"];
    let q = null;
    for (const lvl of order) {
      q = (a.quiz || []).find((x) => x.level === lvl);
      if (q) break;
    }
    q = q || (a.quiz || [])[0];
    return {
      id: a.id, atom: a, level: q ? q.level : "recall", isLang: false,
      prompt: q ? q.prompt : a.title, answer: q ? q.answer : "",
      qIndex: this.asked.length + 1, total: total,
    };
  };

  Diagnostic.prototype.answer = function (id, correct, meta) {
    meta = meta || {};
    if (this.askedSet.has(id)) return;
    this.askedSet.add(id);
    this.asked.push({ id: id, correct: !!correct, slow: !!meta.slow });

    if (correct) {
      const base = meta.slow ? W_SLOW : W_CORRECT;
      this.logodds[id] += base;
      if (meta.slow) this._propagate(this.reqC[id], +1, base);
      else this._inferKnown(this.reqC[id]);
    } else {
      this.logodds[id] -= W_INCORRECT;
      this._inferUnknown(this.unlC[id]);
    }
  };

  Diagnostic.prototype._propagate = function (closure, sign, base) {
    if (!closure) return;
    const nudge = base * PROP_DECAY;
    if (nudge < PROP_FLOOR) return;
    closure.forEach((cid) => {
      if (this.askedSet.has(cid)) return;
      this.logodds[cid] += sign * nudge;
    });
  };

  Diagnostic.prototype._inferKnown = function (closure) {
    if (!closure) return;
    closure.forEach((cid) => {
      if (this.askedSet.has(cid)) return;
      if (this.logodds[cid] < INFER_FLOOR) this.logodds[cid] = INFER_FLOOR;
    });
  };

  Diagnostic.prototype._inferUnknown = function (closure) {
    if (!closure) return;
    closure.forEach((cid) => {
      if (this.askedSet.has(cid)) return;
      if (this.logodds[cid] > -INFER_FLOOR) this.logodds[cid] = -INFER_FLOOR;
    });
  };

  Diagnostic.prototype.result = function (threshold) {
    const t = threshold == null ? KNOWN_THRESHOLD : threshold;
    const known = [];
    const detail = {};
    this.atoms.forEach((a) => {
      const p = this.p(a.id);
      detail[a.id] = +p.toFixed(3);
      if (p >= t) known.push(a.id);
    });
    known.sort((x, y) => this.reqC[x].size - this.reqC[y].size);
    const knownSet = new Set(known);
    const frontier = known.filter((id) =>
      (this.byId[id].unlocks || []).some((u) => this.byId[u] && !knownSet.has(u))
    );
    return {
      known: known,
      frontier: frontier,
      detail: detail,
      asked: this.asked.slice(),
      questionsAsked: this.asked.length,
      placedCount: known.length,
      total: this.atoms.length,
    };
  };

  Diagnostic.prototype.simulate = function (responder) {
    this.start();
    while (!this.done()) {
      const item = this.next();
      if (!item) break;
      const r = responder(item) || {};
      this.answer(item.id, !!r.correct, { slow: !!r.slow });
    }
    return this.result();
  };

  global.Diagnostic = Diagnostic;
  global.BucketDiagnostic = Diagnostic;
})(typeof window !== "undefined" ? window : globalThis);
