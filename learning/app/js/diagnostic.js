/* Bucket Academy — adaptive placement diagnostic (ALEKS-style).
 *
 * Goal: in ~10–20 open-ended questions, figure out what a learner ALREADY knows so
 * experts start mid-graph and beginners start at foundations. This is the
 * "binary-search-over-knowledge-states" design from ADAPTIVE-SOTA.md §a.3
 * (ALEKS / Cosyn, Uzun, Doble & Matayoshi 2021), adapted to our small pilot graphs.
 *
 * We do NOT enumerate the 2^N knowledge-state space. Instead — exploiting the fact
 * that Knowledge-Space-Theory's prerequisite closure collapses the feasible space —
 * we keep a per-atom log-odds belief P(known) and:
 *   • each step, ASK the atom whose P(known) is closest to 0.5 (the item that halves
 *     the remaining uncertainty), tie-broken toward high-leverage / high-betweenness
 *     atoms (they split the graph most, so they are maximally informative);
 *   • CORRECT ("I knew it")  → raise this atom AND propagate belief DOWN its transitive
 *     `requires` chain (if you can do B you can do its prerequisites);
 *   • INCORRECT ("I didn't") → lower this atom AND propagate belief UP its transitive
 *     `unlocks` chain (if you can't do B you can't do what B unlocks);
 *   • bound the number of questions (default 18) and early-stop once no atom remains
 *     in the uncertain band (the posterior has concentrated).
 *
 * Output: the set of atoms to mark already-known (the learner's "known frontier"),
 * which app.js seeds into honest engine state — a modest initial stability + a
 * low-but-present proficiency. This is a STARTING ESTIMATE, never a certified rating
 * (public ratings are gated on bkt-4at). Uncertain atoms are excluded from the known
 * set (we deliberately underestimate) and self-correct in normal study.
 *
 * Dependency-free and node-testable: takes a plain {atoms, byId} graph view.
 */
(function (global) {
  "use strict";

  // ---- belief update weights (ADAPTIVE-SOTA.md §a.3, Falmagne & Doignon 35/5/50) ----
  // Expressed as log-odds increments. Open-ended entry keeps lucky-guess prob tiny, so
  // a CORRECT answer updates aggressively; an "I didn't know it" supplies clean negative
  // evidence. We normalize the 35/5/50 reported weights into log-odds nudges.
  const W_CORRECT = 1.55;   // ~ strong positive (open-ended correct ≈ 35)
  const W_INCORRECT = 1.35; // clean "didn't know it" negative (≈ 50)
  const W_SLOW = 0.55;      // correct-but-slow gets diminished weight (timing first-class)
  const PROP_DECAY = 0.62;  // belief propagated one prereq/unlock hop away is attenuated
  const PROP_FLOOR = 0.18;  // stop propagating once the nudge falls below this
  // KST prerequisite-closure inference: a CONFIDENT (non-slow) correct answer is strong
  // evidence the learner already holds EVERY transitive prerequisite (Falmagne–Doignon
  // closure). Rather than a single decayed nudge that lands prereqs barely over threshold
  // (P≈0.63 — still inside the ask-band, so the diagnostic wastes budget re-probing them),
  // we floor the whole requires-closure to a confident-known log-odds. This is what makes
  // an expert place MANY concepts from FEW questions (the headline ALEKS property): one
  // correct answer high in the graph settles its entire foundation in a single step.
  const INFER_FLOOR = 1.40; // log-odds ≈ P 0.80 — above UNCERTAIN_HI, so closure leaves the ask-band
  const CLOSURE_BIAS = 0.15; // selection bias toward high requires-closure atoms once knowledge is proven
  const UNCERTAIN_LO = 0.32; // band [LO,HI] = still-informative atoms worth asking
  const UNCERTAIN_HI = 0.68;
  const MAX_Q_DEFAULT = 18;  // hard cap (ALEKS caps ~30; small graphs converge faster)
  const KNOWN_THRESHOLD = 0.62; // final P(known) above which we PLACE the atom as known

  function clamp01(x) { return x < 1e-4 ? 1e-4 : x > 1 - 1e-4 ? 1 - 1e-4 : x; }
  function logit(p) { p = clamp01(p); return Math.log(p / (1 - p)); }
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

  /* Build the transitive prerequisite/unlock closures once per corpus.
   * requiresClosure[id] = every atom transitively required by id (its foundations).
   * unlocksClosure[id]  = every atom that transitively depends on id (its consequences).
   * Also compute a cheap betweenness/centrality proxy = how many atoms a node sits
   * "between" (size of its requires-closure × unlocks-closure), used to break ties
   * toward maximally-informative questions. */
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
      // centrality ≈ foundations below × consequences above; a node in the "middle"
      // of a long chain scores highest, which is exactly where a question is most
      // informative (it splits the graph). Leverage (engine-computed) is folded in.
      const b = (reqC[a.id].size + 1) * (unlC[a.id].size + 1) + (a.leverage || 0) * 3;
      between[a.id] = b;
      if (b > maxB) maxB = b;
    });
    atoms.forEach((a) => (between[a.id] = between[a.id] / maxB)); // normalize 0..1
    return { reqC, unlC, between };
  }

  /* Diagnostic session. Construct with the loaded graph view, then loop:
   *   const d = new Diagnostic({ atoms: E.atoms, byId: E.byId });
   *   d.start();
   *   while (!d.done()) {
   *     const item = d.next();          // {id, atom, level, prompt, answer, qIndex, total}
   *     // ...show prompt, reveal answer...
   *     d.answer(item.id, true|false, { slow });  // "I knew it" / "I didn't"
   *   }
   *   const placement = d.result();     // {known:[ids], detail, asked, ...}
   */
  function Diagnostic(graph, opts) {
    opts = opts || {};
    this.atoms = (graph.atoms || []).filter((a) => this._askable(a));
    this.byId = graph.byId || {};
    this.maxQ = opts.maxQuestions || MAX_Q_DEFAULT;
    this.isLang = !!opts.isLang; // language corpus uses forms, not quiz
    const view = buildClosures(graph.atoms || [], this.byId);
    this.reqC = view.reqC;
    this.unlC = view.unlC;
    this.between = view.between;
    this.reset();
  }

  // An atom is askable in the diagnostic if it carries a gradeable question.
  Diagnostic.prototype._askable = function (a) {
    if (!a) return false;
    if (a.quiz && a.quiz.length) return true;
    if (a.forms && (a.gloss || a.title)) return true; // language atom
    return false;
  };

  Diagnostic.prototype.reset = function () {
    // Prior: nobody is assumed to know anything (slightly below 0.5 so the first pick
    // is driven by centrality, and an untouched atom never gets auto-placed).
    this.logodds = {};
    const prior = logit(0.4);
    this.atoms.forEach((a) => (this.logodds[a.id] = prior));
    this.asked = [];      // [{id, correct, slow}]
    this.askedSet = new Set();
    this._started = false;
  };

  Diagnostic.prototype.start = function () {
    this.reset();
    this._started = true;
    return this;
  };

  Diagnostic.prototype.p = function (id) { return sigmoid(this.logodds[id]); };

  // Is the diagnostic finished? (hit cap, ran out of atoms, or posterior concentrated)
  Diagnostic.prototype.done = function () {
    if (!this._started) return false;
    if (this.asked.length >= this.maxQ) return true;
    if (this.askedSet.size >= this.atoms.length) return true;
    // early-stop: no remaining unasked atom is still in the uncertain band
    return !this.atoms.some((a) => {
      if (this.askedSet.has(a.id)) return false;
      const p = this.p(a.id);
      return p >= UNCERTAIN_LO && p <= UNCERTAIN_HI;
    });
  };

  /* Pick the next most-informative question: the unasked atom whose P(known) is
   * closest to 0.5 (it halves the remaining state distribution), tie-broken toward
   * higher graph betweenness/leverage. Returns the question payload, or null if done. */
  Diagnostic.prototype.next = function () {
    if (this.done()) return null;
    // Closure-payoff bias: once the learner has demonstrated SOME knowledge, prefer asking
    // atoms high in the graph — a correct answer there floods a large requires-closure in one
    // step (the headline ALEKS efficiency: place many from few). We GATE this on a prior
    // correct answer so a beginner (zero correct) stays on pure binary search and early-stops
    // instead of being marched through deep, uninformative questions.
    const proven = this.asked.some((a) => a.correct);
    let maxReqC = 1;
    if (proven) this.atoms.forEach((a) => { if (this.reqC[a.id].size > maxReqC) maxReqC = this.reqC[a.id].size; });
    let best = null, bestScore = Infinity;
    this.atoms.forEach((a) => {
      if (this.askedSet.has(a.id)) return;
      const p = this.p(a.id);
      // primary: distance from 0.5 (smaller = better). secondary: prefer central atoms
      // (subtract a small centrality bonus so high-betweenness wins ties).
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
      // language atom: ask the target word for a gloss (filled in by the UI layer,
      // which knows the chosen target/known languages). We pass enough to render.
      return {
        id: a.id, atom: a, level: "recall", isLang: true,
        prompt: a.gloss || a.title || a.id, answer: null,
        qIndex: this.asked.length + 1, total: total,
      };
    }
    // concept atom: start with a recall-level question (cheapest, least slip-prone).
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

  /* Record an answer and propagate belief through the prerequisite graph.
   *   correct === true  → "I knew it"   (raise this atom + its foundations)
   *   correct === false → "I didn't"    (lower this atom + its consequences)
   *   meta.slow         → diminished positive weight (timing). */
  Diagnostic.prototype.answer = function (id, correct, meta) {
    meta = meta || {};
    if (this.askedSet.has(id)) return; // idempotent per atom
    this.askedSet.add(id);
    this.asked.push({ id: id, correct: !!correct, slow: !!meta.slow });

    if (correct) {
      const base = meta.slow ? W_SLOW : W_CORRECT;
      this.logodds[id] += base;
      // propagate DOWN: knowing B raises belief you know B's prerequisites.
      // A confident (non-slow) correct triggers full KST closure inference — flood every
      // transitive prerequisite to a confident-known floor so it places and exits the
      // ask-band. A slow correct is weaker evidence, so it only gets the decayed nudge.
      if (meta.slow) this._propagate(this.reqC[id], +1, base);
      else this._inferKnown(this.reqC[id]);
    } else {
      this.logodds[id] -= W_INCORRECT;
      // propagate UP (symmetric KST): if you don't know B you cannot know anything that
      // REQUIRES B — flood B's full unlocks-closure to a confident-unknown floor so those
      // consequences leave the ask-band. This is what lets the diagnostic EARLY-STOP for a
      // beginner (one missed foundation collapses everything above it) instead of grinding
      // to the question cap. We deliberately underestimate; a slip self-corrects in study.
      this._inferUnknown(this.unlC[id]);
    }
  };

  // Distribute an attenuated nudge across a closure set, weighted by graph distance
  // (we already have the transitive set; apply a single decayed nudge to each member,
  // skipping atoms the learner already answered directly — direct evidence wins).
  Diagnostic.prototype._propagate = function (closure, sign, base) {
    if (!closure) return;
    const nudge = base * PROP_DECAY;
    if (nudge < PROP_FLOOR) return;
    closure.forEach((cid) => {
      if (this.askedSet.has(cid)) return; // don't override direct measurement
      this.logodds[cid] += sign * nudge;
    });
  };

  /* KST prerequisite-closure inference (down direction, confident-correct only).
   * Raise every transitive prerequisite to at least the confident-known floor — a
   * monotone floor, not an additive nudge, so it neither runs away on repeated corrects
   * nor overrides a stronger existing belief. Atoms answered directly are skipped (direct
   * measurement always wins, which also protects against a later up-propagation conflict). */
  Diagnostic.prototype._inferKnown = function (closure) {
    if (!closure) return;
    closure.forEach((cid) => {
      if (this.askedSet.has(cid)) return; // direct evidence wins
      if (this.logodds[cid] < INFER_FLOOR) this.logodds[cid] = INFER_FLOOR;
    });
  };

  /* KST consequence-closure inference (up direction, on an incorrect answer): lower every
   * atom that transitively REQUIRES the missed atom to a confident-unknown floor — you
   * cannot hold a concept whose prerequisite you just failed. Monotone floor (min), direct
   * answers skipped. Mirror image of _inferKnown; together they implement the full
   * prerequisite-closure collapse that makes placement efficient in both directions. */
  Diagnostic.prototype._inferUnknown = function (closure) {
    if (!closure) return;
    closure.forEach((cid) => {
      if (this.askedSet.has(cid)) return; // direct evidence wins
      if (this.logodds[cid] > -INFER_FLOOR) this.logodds[cid] = -INFER_FLOOR;
    });
  };

  /* Final placement. Returns the set of atoms to mark already-known (P ≥ threshold),
   * plus diagnostics for the UX summary. Atoms left uncertain are intentionally
   * EXCLUDED (we underestimate; normal study self-corrects). */
  Diagnostic.prototype.result = function (threshold) {
    const t = threshold == null ? KNOWN_THRESHOLD : threshold;
    const known = [];
    const detail = {};
    this.atoms.forEach((a) => {
      const p = this.p(a.id);
      detail[a.id] = +p.toFixed(3);
      if (p >= t) known.push(a.id);
    });
    // Sort known by study order proxy: foundations (fewer prereqs) first.
    known.sort((x, y) => this.reqC[x].size - this.reqC[y].size);
    // The "frontier" = known atoms that unlock at least one not-yet-known atom; this is
    // where the learner should resume. Reported for the result summary.
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

  // Convenience: run a full diagnostic against a synthetic responder (for tests /
  // simulation). responder(item) → { correct:Boolean, slow?:Boolean }.
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
  global.BucketDiagnostic = Diagnostic; // namespaced alias
})(typeof window !== "undefined" ? window : globalThis);
