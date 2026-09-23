(function (global) {
  "use strict";

  const LS_BASE = "bucket-academy/v1";
  const DAY = 86400000;
  const AD = global.Adaptive ||
    (typeof require !== "undefined" ? (function () { try { return require("./adaptive.js"); } catch (e) { return null; } })() : null);

  function Engine() {
    this.atoms = [];
    this.byId = {};
    this.fsrs = new global.FSRS();
    this.encompassing = {};
    this.state = null;
  }

  Engine.prototype.load = async function (corpusUrl) {
    const res = await fetch(corpusUrl, { cache: "no-store" });
    const data = await res.json();
    return this.loadData(data);
  };

  Engine.prototype.loadData = function (data, keyOverride) {
    this.atoms = (data && data.atoms) || [];
    this.meta = (data && data.meta) || {};
    this.lsKey = LS_BASE + "/" + (keyOverride || this.meta.branch || "default");
    this.byId = {};
    this.atoms.forEach((a) => (this.byId[a.id] = a));
    this._computeLeverage();
    this._buildEncompassing();
    this._loadState();
    return this;
  };

  Engine.prototype.useNamespace = function (keyOverride) {
    if (!keyOverride) return this;
    var next = LS_BASE + "/" + keyOverride;
    if (this.lsKey === next) return this;
    if (this.state) this.save();
    this.lsKey = next;
    this._loadState();
    return this;
  };

  Engine.prototype.peekNamespace = function (keyOverride) {
    if (!keyOverride) return null;
    try { return JSON.parse(localStorage.getItem(LS_BASE + "/" + keyOverride)); }
    catch (e) { return null; }
  };

  Engine.prototype._buildEncompassing = function () {
    this.encompassing = AD
      ? AD.buildEncompassingMap(this.atoms, this.byId)
      : {};
  };

  Engine.prototype.encompassingFor = function (id) {
    return this.encompassing[id] || [];
  };

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
      s = JSON.parse(localStorage.getItem(this.lsKey || LS_BASE));
    } catch (e) {}
    if (!s) {
      s = {
        cards: {},
        prof: {},
        settings: { newPerDay: 4, requestRetention: 0.9 },
        stats: { xp: 0, streak: 0, lastStudyDay: null, history: {} },
      };
    }
    s.settings = s.settings || { newPerDay: 4, requestRetention: 0.9 };
    s.stats = s.stats || { xp: 0, streak: 0, lastStudyDay: null, history: {} };
    s.cards = s.cards || {};
    s.prof = s.prof || {};
    this.fsrs.requestRetention = s.settings.requestRetention || 0.9;
    this.state = s;
  };

  Engine.prototype.save = function () {
    try {
      localStorage.setItem(this.lsKey || LS_BASE, JSON.stringify(this.state));
    } catch (e) {}
  };

  Engine.prototype.reset = function () {
    localStorage.removeItem(this.lsKey || LS_BASE);
    this._loadState();
  };

  Engine.prototype._unlocked = function (atom) {
    return (atom.requires || []).every((r) => this.state.cards[r]);
  };

  Engine.prototype.cardFor = function (id) {
    return this.state.cards[id] || null;
  };

  Engine.prototype.masteryFor = function (id, now) {
    const card = this.state.cards[id];
    if (!card) return 0;
    if (!AD) return this.fsrs.mastery(card);
    const prof = this.state.prof[id];
    if (!prof || !prof.n) return this.fsrs.mastery(card);
    return AD.masteryDetail(prof, this.fsrs, card, now || Date.now()).mastery;
  };

  Engine.prototype.masteryDetail = function (id, now) {
    const card = this.state.cards[id];
    if (!card) return null;
    if (!AD) {
      const m = this.fsrs.mastery(card);
      return {
        mastery: +m.toFixed(3), proficiency: null, retention: null,
        retrievabilityNow: null, daysSinceReview: null, theta: null,
        attempts: 0, confidence: "emerging",
        confidenceNote: "Legacy signal (adaptive core not loaded).",
      };
    }
    return AD.masteryDetail(this.state.prof[id], this.fsrs, card, now || Date.now());
  };

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

  Engine.prototype.grade = function (id, rating, level, now) {
    now = now || Date.now();
    const prev = this.state.cards[id] || { state: "new" };
    const wasNew = prev.state === "new";
    this.fsrs.requestRetention = this.state.settings.requestRetention || 0.9;
    this.state.cards[id] = this.fsrs.review(prev, rating, now);

    if (AD) {
      const score = AD.ADAPTIVE.PROF_RATING_SCORE[rating];
      const s = score == null ? (rating > 1 ? 1 : 0) : score;
      this.state.prof[id] = AD.updateProficiency(this.state.prof[id], level || "recall", s);

      if (rating >= AD.ADAPTIVE.FIRE_MIN_RATING) {
        this._applyFire(id, rating, now);
      }
    }

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

  Engine.prototype._applyFire = function (triggerId, rating, now) {
    if (!AD) return [];
    const edges = this.encompassing[triggerId];
    if (!edges || !edges.length) return [];
    const ratingScore = AD.ADAPTIVE.PROF_RATING_SCORE[rating];
    const strength = ratingScore == null ? 1 : ratingScore;
    const patches = AD.fireCredits(
      triggerId, edges, this.state.cards, this.fsrs, now, strength
    );
    patches.forEach((p) => {
      const c = this.state.cards[p.id];
      if (!c) return;
      c.stability = p.stability;
      c.due = p.due;
      c.firedCredit = +((c.firedCredit || 0) + p.credit).toFixed(4);
    });
    return patches;
  };

  Engine.prototype._updateStreak = function (now) {
    const dk = this._dayKey(now);
    const last = this.state.stats.lastStudyDay;
    if (last === dk) return;
    const y = this._dayKey(now - DAY);
    this.state.stats.streak = last === y ? (this.state.stats.streak || 0) + 1 : 1;
    this.state.stats.lastStudyDay = dk;
  };

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
        if (this.masteryFor(a.id, now) >= 0.7) mastered++;
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
