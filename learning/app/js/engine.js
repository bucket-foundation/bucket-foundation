/* Bucket Academy — learning engine.
 * Loads the atom corpus, computes the "nucleus" leverage score (DECISIONS.md#9),
 * generates the daily ROUTE (a leverage-weighted walk over the learnable frontier,
 * never teaching an atom before its prerequisites — Knowledge Space Theory, #10),
 * tracks per-user FSRS state + mastery, and persists to localStorage.
 */
(function (global) {
  "use strict";

  const LS_KEY = "bucket-academy/v1";
  const DAY = 86400000;

  function Engine() {
    this.atoms = [];
    this.byId = {};
    this.fsrs = new global.FSRS();
    this.state = null; // { cards:{id:card}, settings, stats }
  }

  Engine.prototype.load = async function (corpusUrl) {
    const res = await fetch(corpusUrl, { cache: "no-store" });
    const data = await res.json();
    this.atoms = data.atoms || [];
    this.meta = data.meta || {};
    this.byId = {};
    this.atoms.forEach((a) => (this.byId[a.id] = a));
    this._computeLeverage();
    this._loadState();
    return this;
  };

  // Leverage = normalized count of everything an atom transitively unlocks,
  // blended with out-degree. A cheap, interpretable stand-in for personalized
  // PageRank over the prerequisite graph (the nucleus = high leverage).
  Engine.prototype._computeLeverage = function () {
    const reach = {};
    const self = this;
    function descendants(id, seen) {
      seen = seen || new Set();
      const a = self.byId[id];
      if (!a) return seen;
      (a.unlocks || []).forEach((u) => {
        if (!seen.has(u)) {
          seen.add(u);
          descendants(u, seen);
        }
      });
      return seen;
    }
    // derive unlocks from requires if not given
    this.atoms.forEach((a) => (a.unlocks = a.unlocks || []));
    this.atoms.forEach((a) => {
      (a.requires || []).forEach((r) => {
        const p = this.byId[r];
        if (p && !p.unlocks.includes(a.id)) p.unlocks.push(a.id);
      });
    });
    let max = 1;
    this.atoms.forEach((a) => {
      reach[a.id] = descendants(a.id).size + (a.unlocks.length || 0) * 0.5;
      max = Math.max(max, reach[a.id]);
    });
    this.atoms.forEach((a) => {
      a.leverage = +(reach[a.id] / max).toFixed(3);
    });
  };

  Engine.prototype._loadState = function () {
    let s = null;
    try {
      s = JSON.parse(localStorage.getItem(LS_KEY));
    } catch (e) {}
    if (!s) {
      s = {
        cards: {},
        settings: { newPerDay: 4, requestRetention: 0.9 },
        stats: { xp: 0, streak: 0, lastStudyDay: null, history: {} },
      };
    }
    s.settings = s.settings || { newPerDay: 4, requestRetention: 0.9 };
    s.stats = s.stats || { xp: 0, streak: 0, lastStudyDay: null, history: {} };
    s.cards = s.cards || {};
    this.fsrs.requestRetention = s.settings.requestRetention || 0.9;
    this.state = s;
  };

  Engine.prototype.save = function () {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this.state));
    } catch (e) {}
  };

  Engine.prototype.reset = function () {
    localStorage.removeItem(LS_KEY);
    this._loadState();
  };

  // Is every prerequisite of atom "introduced" (has a card)?
  Engine.prototype._unlocked = function (atom) {
    return (atom.requires || []).every((r) => this.state.cards[r]);
  };

  Engine.prototype.cardFor = function (id) {
    return this.state.cards[id] || null;
  };
  Engine.prototype.masteryFor = function (id) {
    return this.fsrs.mastery(this.state.cards[id]);
  };

  /* The daily ROUTE: due reviews first (most overdue first), then up to newPerDay
   * frontier atoms (prereqs satisfied, not yet introduced) ranked by leverage. */
  Engine.prototype.route = function (now) {
    now = now || Date.now();
    const due = [];
    const cards = this.state.cards;
    Object.keys(cards).forEach((id) => {
      const c = cards[id];
      if (c && c.due != null && c.due <= now && this.byId[id]) {
        due.push({ id, kind: "review", due: c.due });
      }
    });
    due.sort((a, b) => a.due - b.due);

    const introducedToday = (this.state.stats.history[this._dayKey(now)] || {}).new || 0;
    const budget = Math.max(0, (this.state.settings.newPerDay || 4) - introducedToday);
    const shellRank = { prereq: 0, nucleus: 1, frontier: 2 };
    const frontier = this.atoms
      .filter((a) => !cards[a.id] && this._unlocked(a))
      .sort(
        (a, b) =>
          (shellRank[a.shell] - shellRank[b.shell]) || (b.leverage - a.leverage)
      )
      .slice(0, budget)
      .map((a) => ({ id: a.id, kind: "new" }));

    return due.concat(frontier);
  };

  Engine.prototype._dayKey = function (now) {
    const d = new Date(now || Date.now());
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  };

  // Record a graded answer; update FSRS, XP (mastery-weighted), streak.
  Engine.prototype.grade = function (id, rating, level, now) {
    now = now || Date.now();
    const prev = this.state.cards[id] || { state: "new" };
    const wasNew = prev.state === "new";
    this.fsrs.requestRetention = this.state.settings.requestRetention || 0.9;
    this.state.cards[id] = this.fsrs.review(prev, rating, now);

    // mastery-weighted XP: depth matters more than streak (DECISIONS.md#20)
    const depthXp = { recall: 5, apply: 8, derive: 14, teach: 20 };
    if (rating > 1) this.state.stats.xp += depthXp[level] || 5;

    const dk = this._dayKey(now);
    const h = (this.state.stats.history[dk] = this.state.stats.history[dk] || { new: 0, reviews: 0 });
    if (wasNew) h.new += 1;
    else h.reviews += 1;

    this._updateStreak(now);
    this.save();
    return this.state.cards[id];
  };

  Engine.prototype._updateStreak = function (now) {
    const dk = this._dayKey(now);
    const last = this.state.stats.lastStudyDay;
    if (last === dk) return;
    const y = this._dayKey(now - DAY);
    this.state.stats.streak = last === y ? (this.state.stats.streak || 0) + 1 : 1;
    this.state.stats.lastStudyDay = dk;
  };

  // Summary counts for the home screen.
  Engine.prototype.summary = function (now) {
    now = now || Date.now();
    const total = this.atoms.length;
    let introduced = 0,
      mastered = 0,
      dueCount = 0;
    this.atoms.forEach((a) => {
      const c = this.state.cards[a.id];
      if (c) {
        introduced++;
        if (this.fsrs.mastery(c) >= 0.7) mastered++;
        if (c.due != null && c.due <= now) dueCount++;
      }
    });
    return {
      total,
      introduced,
      mastered,
      dueCount,
      xp: this.state.stats.xp || 0,
      streak: this.state.stats.streak || 0,
    };
  };

  global.Engine = Engine;
})(typeof window !== "undefined" ? window : globalThis);
