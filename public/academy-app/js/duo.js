/* Bucket Academy — the "Languages" Duolingo-style experience (epic bkt-w0t).
 *
 * A DEDICATED language UI: a do-first onboarding, a winding PATH of lesson nodes
 * grouped into units, a full-screen LESSON PLAYER with five exercise types, and an
 * animated REWARD screen. Faithful to the captured Duolingo screenshots while staying
 * on the Bucket substrate: FSRS scheduling underneath, on-device TTS, the accent/typo
 * grader, the honesty banner, and CC-BY-SA attribution.
 *
 * This module owns the language SCREENS; it borrows the engine + grader + settings
 * from app.js via window.__DuoBridge (set up at the bottom of app.js). Keeping it a
 * separate module means the canon "atom/study" screens are untouched.
 *
 * Public: window.DuoLang
 *   .available()            -> bridge wired + on a language deck
 *   .shouldOnboard()        -> learner hasn't picked a language yet
 *   .onboarding()           -> render the do-first onboarding flow (returns screen node)
 *   .path()                 -> render the PATH home (returns screen node)
 *   .startLesson(unit,node) -> open the full-screen lesson player
 */
(function (root) {
  "use strict";

  /* ---- tiny DOM helpers (self-contained; do not depend on app.js internals) ---- */
  function el(t, c, h) {
    var n = document.createElement(t);
    if (c) n.className = c;
    if (h != null) n.innerHTML = h;
    return n;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function reducedMotion() {
    try { return root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  /* ---- bridge accessors (everything we need from app.js) ---- */
  function B() { return root.__DuoBridge || null; }
  function available() {
    var b = B();
    return !!(b && b.E && b.isLang && b.isLang());
  }

  /* ---- flag emoji per language (regional-indicator pairs; degrade to a glyph) ---- */
  var FLAG = {
    en: "🇬🇧", es: "🇪🇸", fr: "🇫🇷", it: "🇮🇹", pt: "🇵🇹", de: "🇩🇪",
    nl: "🇳🇱", sv: "🇸🇪", ru: "🇷🇺", ja: "🇯🇵", zh: "🇨🇳", el: "🇬🇷",
    fi: "🇫🇮", pl: "🇵🇱", ko: "🇰🇷", hi: "🇮🇳", ar: "🇸🇦", la: "🏛️",
  };
  function flag(l) { return FLAG[l] || "🌐"; }
  function langName(l) {
    var b = B();
    return (b && b.LANG_NAMES && b.LANG_NAMES[l]) || l;
  }

  /* ---- a friendly mascot (a stylized bucket-drop, NOT the Duolingo owl) ---- */
  function mascot(cls) {
    var d = el("div", "duo-mascot " + (cls || ""));
    d.innerHTML =
      '<svg viewBox="0 0 96 110" width="76" height="86" role="img" aria-label="Bucket Academy guide">' +
      '<defs><linearGradient id="dmg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#3a8d8d"/><stop offset="1" stop-color="#235a5a"/></linearGradient></defs>' +
      '<path d="M48 6 C70 30 86 50 86 72 a38 38 0 0 1 -76 0 C10 50 26 30 48 6 Z" fill="url(#dmg)"/>' +
      '<ellipse cx="34" cy="64" rx="11" ry="13" fill="#fff"/>' +
      '<ellipse cx="62" cy="64" rx="11" ry="13" fill="#fff"/>' +
      '<circle cx="36" cy="66" r="5" fill="#1F1C16"/><circle cx="60" cy="66" r="5" fill="#1F1C16"/>' +
      '<circle cx="37.5" cy="64.5" r="1.7" fill="#fff"/><circle cx="61.5" cy="64.5" r="1.7" fill="#fff"/>' +
      '<path d="M40 86 Q48 92 56 86" stroke="#1F1C16" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="48" cy="30" rx="9" ry="13" fill="#ffffff" opacity=".22"/>' +
      "</svg>";
    return d;
  }
  // a speech bubble next to the mascot (Duo onboarding pattern)
  function speech(text) {
    var s = el("div", "duo-speech");
    s.appendChild(mascot());
    s.appendChild(el("div", "duo-bubble", esc(text)));
    return s;
  }

  /* ---- engine / settings shorthands ---- */
  function E() { return B().E; }
  function settings() { return B().langSettings(); }
  function setPref(target, known, opts) { return B().setLangPref(target, known, opts); }
  function grade(id, rating, level, now) { return B().grade(id, rating, level, now); }
  /* ---- bkt-h9k multi-course helpers (independent per-language state) ---- */
  // Re-point the live engine at the active target's per-language namespace. MUST be
  // called after setPref(target,…) and before buildUnits()/startLesson() so the path
  // and lesson read/write THAT language's own FSRS state — not a shared one.
  function syncNamespace() { var b = B(); if (b && b.syncLangNamespace) b.syncLangNamespace(); }
  function startedCourses() { var b = B(); return (b && b.startedCourses) ? b.startedCourses() : []; }
  function markCourseStarted(t) { var b = B(); if (b && b.markCourseStarted) b.markCourseStarted(t); }
  function courseStats(t) { var b = B(); return (b && b.courseStats) ? b.courseStats(t) : null; }
  function check(typed, target, lang) { return B().checkLangAnswer(typed, target, lang); }
  function audioBtn(word, lang, opt) {
    if (root.LangAudio && root.LangAudio.supported()) return root.LangAudio.button(word, lang, opt);
    return null;
  }
  function emojiFor(id) { return root.LangEmoji ? root.LangEmoji.emojiFor(id) : null; }

  /* ---- has the learner picked a language yet? (drives onboarding) ---- */
  function shouldOnboard() {
    var b = B();
    if (!b) return false;
    return !b.langPrefChosen();
  }

  /* ===================================================================== *
   *  UNITS — group the deck's topo study order by the deck's category
   *  order (numbers→colors→family→animals→body→food→nature→objects→
   *  verbs→abstract). Each unit is a winding run of lesson NODES (~4 words
   *  each). Node/unit state derives from FSRS cards. (Surface #2 model)
   * ===================================================================== */
  var WORDS_PER_NODE = 4;
  // canonical category display order (matches deck tiers / the prompt)
  var CAT_ORDER = ["number", "color", "family", "animal", "body", "food",
                   "nature", "object", "time", "adjective", "verb", "abstract"];
  var CAT_LABEL = {
    number: "Numbers", color: "Colors", family: "Family", animal: "Animals",
    body: "The Body", food: "Food & Drink", nature: "Nature", object: "Objects",
    time: "Time", adjective: "Describing", verb: "Actions", abstract: "Ideas",
  };
  var CAT_ICON = {
    number: "🔢", color: "🎨", family: "👪", animal: "🐾", body: "🫀", food: "🍞",
    nature: "🌿", object: "🏠", time: "🕰️", adjective: "✨", verb: "🏃", abstract: "💭",
  };

  // The ordered, target-coverable atom ids for the current target language.
  function targetOrder() {
    var b = B();
    var order = b.studyOrder(); // already filtered to atoms with a form in target
    return order;
  }

  // Build the unit/node tree from the current target order.
  function buildUnits() {
    var b = B(), e = E();
    var target = settings().target;
    var ids = targetOrder();
    // bucket ids by category, preserving topo order within each category
    var byCat = {};
    ids.forEach(function (id) {
      var a = e.byId[id]; if (!a) return;
      var c = a.category || "object";
      (byCat[c] = byCat[c] || []).push(id);
    });
    // order categories by CAT_ORDER, then any leftovers
    var cats = CAT_ORDER.filter(function (c) { return byCat[c] && byCat[c].length; });
    Object.keys(byCat).forEach(function (c) { if (cats.indexOf(c) < 0) cats.push(c); });

    var units = [];
    cats.forEach(function (cat, ui) {
      var catIds = byCat[cat];
      var nodes = [];
      for (var i = 0; i < catIds.length; i += WORDS_PER_NODE) {
        nodes.push({ ids: catIds.slice(i, i + WORDS_PER_NODE), n: nodes.length + 1 });
      }
      units.push({
        cat: cat, label: CAT_LABEL[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1)),
        icon: CAT_ICON[cat] || "✦", n: ui + 1, nodes: nodes,
      });
    });
    // annotate node state: done (all cards introduced & all mastery>=.6), or count
    units.forEach(function (u) {
      u.nodes.forEach(function (nd) {
        var introduced = nd.ids.filter(function (id) { return e.cardFor(id); }).length;
        var learned = nd.ids.filter(function (id) { return e.cardFor(id) && e.masteryFor(id) >= 0.55; }).length;
        nd.introduced = introduced;
        nd.learned = learned;
        nd.total = nd.ids.length;
        nd.done = learned >= nd.total; // a node is "done" when its words are learned
      });
    });
    return units;
  }

  // Flatten nodes into a linear list (unitIdx,nodeIdx) for prev/next lock logic.
  function flattenNodes(units) {
    var flat = [];
    units.forEach(function (u, ui) {
      u.nodes.forEach(function (nd, ni) { flat.push({ u: u, nd: nd, ui: ui, ni: ni }); });
    });
    return flat;
  }

  // The first not-done node = the "current" node. Everything after the current is locked.
  function currentNodeIndex(flat) {
    for (var i = 0; i < flat.length; i++) if (!flat[i].nd.done) return i;
    return flat.length - 1; // all done → last node stays open for review
  }

  /* ===================================================================== *
   *  SURFACE #1 — DO-FIRST ONBOARDING
   *  landing → "I want to learn ___" → why → placement → daily goal → lesson
   * ===================================================================== */
  var REASONS = [
    { k: "career", ico: "💼", t: "Boost my work" },
    { k: "travel", ico: "✈️", t: "Prepare for travel" },
    { k: "brain", ico: "🧠", t: "Keep my mind sharp" },
    { k: "fun", ico: "🎉", t: "Just for fun" },
    { k: "people", ico: "🫂", t: "Connect with people" },
    { k: "study", ico: "📚", t: "Support my studies" },
  ];
  var PLACEMENT = [
    { k: "new",   t: "I'm new to ", bars: 1, skip: 0 },
    { k: "some",  t: "I know some common words", bars: 2, skip: 1 },
    { k: "basic", t: "I can have basic conversations", bars: 3, skip: 3 },
    { k: "lots",  t: "I can talk about many topics", bars: 4, skip: 6 },
  ];
  var GOALS = [
    { k: 1, t: "1 lesson / day", tag: "Casual" },
    { k: 3, t: "3 lessons / day", tag: "Regular" },
    { k: 5, t: "5 lessons / day", tag: "Serious" },
    { k: 8, t: "8 lessons / day", tag: "Intense" },
  ];
  var DUO_PREFS_KEY = "bucket-academy/duo-prefs";
  function saveDuoPrefs(p) {
    try {
      var prev = loadDuoPrefs();
      localStorage.setItem(DUO_PREFS_KEY, JSON.stringify(Object.assign(prev, p)));
    } catch (e) {}
  }
  function loadDuoPrefs() {
    try { return JSON.parse(localStorage.getItem(DUO_PREFS_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function onboarding(onFinish) {
    var b = B(), e = E();
    // available target languages: coverage filter, sorted by name (full breadth)
    var COVER_MIN = 60;
    var deckLangs = b.langDeckLangs();
    var targets = deckLangs.filter(function (l) {
      return l !== "en" && b.langCoverage(l) >= COVER_MIN;
    }).sort(function (x, y) { return langName(x).localeCompare(langName(y)); });
    // known/source langs MUST be guaranteed meta languages (every atom anchors them),
    // sorted by display name; English first if present so it's the natural default.
    var metaLangs = (e.meta && e.meta.languages) || ["en"];
    var knownLangs = metaLangs.slice().sort(function (x, y) {
      return langName(x).localeCompare(langName(y));
    });
    // bkt-4vq: BOTH sections are multi-select. `known` = ordered array of source langs
    // (first = primaryKnown); `learn` = ordered array of target langs (first = active).
    var state = {
      step: 0,
      known: metaLangs.indexOf("en") >= 0 ? ["en"] : (metaLangs.length ? [metaLangs[0]] : ["en"]),
      learn: [],
      reason: null,
      placement: null,
      goal: 3,
    };
    var STEPS = ["pick", "reason", "placement", "goal"];
    // the active (first-chosen) target — the course the reason/placement/goal apply to,
    // and the one we drop into after onboarding. Other targets seed at 0 progress.
    function activeTarget() { return state.learn[0] || null; }

    var wrap = el("div", "screen duo duo-onboard");
    var bar = el("div", "duo-ob-bar");
    var barFill = el("i");
    bar.appendChild(barFill);
    var topRow = el("div", "duo-ob-top");
    var backBtn = el("button", "duo-ob-back", "‹");
    backBtn.setAttribute("aria-label", "Back");
    topRow.appendChild(backBtn);
    topRow.appendChild(bar);
    wrap.appendChild(topRow);
    var body = el("div", "duo-ob-body");
    wrap.appendChild(body);
    var foot = el("div", "duo-ob-foot");
    var contBtn = el("button", "duo-cont disabled", "CONTINUE");
    foot.appendChild(contBtn);
    wrap.appendChild(foot);

    function progress() {
      var pct = ((state.step) / STEPS.length) * 100;
      barFill.style.width = pct + "%";
      backBtn.style.visibility = state.step === 0 ? "hidden" : "visible";
    }
    backBtn.onclick = function () { if (state.step > 0) { state.step--; render(); } };

    function setCont(enabled, label, fn) {
      contBtn.textContent = label || "CONTINUE";
      contBtn.classList.toggle("disabled", !enabled);
      contBtn.onclick = enabled ? fn : null;
    }

    function render() {
      progress();
      body.innerHTML = "";
      var step = STEPS[state.step];
      if (step === "pick") return renderPick();
      if (step === "reason") return renderReason();
      if (step === "placement") return renderPlacement();
      if (step === "goal") return renderGoal();
    }

    /* step 0 — multi-select BOTH sections (bkt-4vq):
     *   "I already know ___"  → toggle several source langs (first = primaryKnown)
     *   "I want to learn ___" → toggle several target langs (each seeds a course)
     * A language can't be in both lists at once: picking it on one side removes it from
     * the other (and known-side languages are greyed/disabled on the learn side that
     * already know them, since you can't learn the language you anchor from). */
    function pickContLabel() {
      var n = state.learn.length;
      if (n <= 1) return "CONTINUE";
      return "START " + n + " COURSES →";
    }
    function pickReady() { return state.known.length > 0 && state.learn.length > 0; }
    function refreshPickCont() {
      // when exactly one target → flow continues to reason/placement/goal (CONTINUE);
      // the label still reflects the count once >1 are chosen.
      setCont(pickReady(), pickContLabel(), goNext);
    }
    function toggleIn(arr, l) {
      var i = arr.indexOf(l);
      if (i >= 0) arr.splice(i, 1); else arr.push(l);
    }
    function renderPick() {
      body.appendChild(el("h1", "duo-ob-h1", "Set up your languages"));
      body.appendChild(el("p", "duo-ob-lede",
        "Pick the languages you know and the ones you want to learn — you can learn several at once."));

      // -- "I already know" (source / multi-select) --
      body.appendChild(el("h2", "duo-ob-h2", "I already know…"));
      var knownGrid = el("div", "duo-lang-grid");
      // -- "I want to learn" (target / multi-select) --
      var learnGrid = el("div", "duo-lang-grid");

      function paint() {
        knownGrid.querySelectorAll(".duo-lang-card").forEach(function (c) {
          var l = c.dataset.l;
          c.classList.toggle("on", state.known.indexOf(l) >= 0);
        });
        learnGrid.querySelectorAll(".duo-lang-card").forEach(function (c) {
          var l = c.dataset.l;
          var conflict = state.known.indexOf(l) >= 0; // can't learn a language you know-anchor from
          c.classList.toggle("on", state.learn.indexOf(l) >= 0);
          c.classList.toggle("conflict", conflict);
          c.disabled = conflict;
          c.setAttribute("aria-disabled", conflict ? "true" : "false");
        });
        refreshPickCont();
      }

      knownLangs.forEach(function (l) {
        var card = el("button", "duo-lang-card");
        card.type = "button";
        card.dataset.l = l;
        card.setAttribute("aria-pressed", state.known.indexOf(l) >= 0 ? "true" : "false");
        card.innerHTML =
          '<span class="dlc-flag">' + flag(l) + "</span>" +
          '<span class="dlc-name">' + esc(langName(l)) + "</span>" +
          '<span class="dlc-check" aria-hidden="true">✓</span>';
        card.onclick = function () {
          toggleIn(state.known, l);
          // a language you now "know" can't also be a learn target — drop the conflict
          var li = state.learn.indexOf(l);
          if (li >= 0) state.learn.splice(li, 1);
          card.setAttribute("aria-pressed", state.known.indexOf(l) >= 0 ? "true" : "false");
          paint();
        };
        knownGrid.appendChild(card);
      });
      body.appendChild(knownGrid);

      body.appendChild(el("h2", "duo-ob-h2", "I want to learn…"));
      targets.forEach(function (l) {
        var card = el("button", "duo-lang-card");
        card.type = "button";
        card.dataset.l = l;
        card.setAttribute("aria-pressed", state.learn.indexOf(l) >= 0 ? "true" : "false");
        card.innerHTML =
          '<span class="dlc-flag">' + flag(l) + "</span>" +
          '<span class="dlc-name">' + esc(langName(l)) + "</span>" +
          '<span class="dlc-sub">' + esc(b.langCoverage(l)) + " words</span>" +
          '<span class="dlc-check" aria-hidden="true">✓</span>';
        card.onclick = function () {
          if (state.known.indexOf(l) >= 0) return; // disabled conflict — ignore
          toggleIn(state.learn, l);
          card.setAttribute("aria-pressed", state.learn.indexOf(l) >= 0 ? "true" : "false");
          paint();
        };
        learnGrid.appendChild(card);
      });
      body.appendChild(learnGrid);

      // CC-BY-SA attribution lives on the first screen of the flow
      body.appendChild(attribution());
      paint();
    }

    /* step 1 — why are you learning <lang>? (applies to the active/first course) */
    function renderReason() {
      body.appendChild(speech("Why are you learning " + langName(activeTarget()) + "?"));
      var grid = el("div", "duo-opt-grid two");
      REASONS.forEach(function (r) {
        var o = el("button", "duo-opt" + (state.reason === r.k ? " on" : ""));
        o.innerHTML = '<span class="do-ico">' + r.ico + '</span><span class="do-t">' + esc(r.t) + "</span>";
        o.onclick = function () {
          state.reason = r.k;
          grid.querySelectorAll(".duo-opt").forEach(function (c) { c.classList.remove("on"); });
          o.classList.add("on");
          setCont(true, "CONTINUE", goNext);
        };
        grid.appendChild(o);
      });
      body.appendChild(grid);
      setCont(!!state.reason, "CONTINUE", goNext);
    }

    /* step 2 — placement: How much <lang> do you know? (sets path start) */
    function renderPlacement() {
      body.appendChild(speech("How much " + langName(activeTarget()) + " do you know?"));
      var list = el("div", "duo-opt-grid one");
      PLACEMENT.forEach(function (p) {
        var label = p.k === "new" ? (p.t + langName(activeTarget())) : p.t;
        var o = el("button", "duo-opt place" + (state.placement === p.k ? " on" : ""));
        var bars = "";
        for (var i = 1; i <= 4; i++) bars += '<i class="' + (i <= p.bars ? "on" : "") + '"></i>';
        o.innerHTML = '<span class="place-bars">' + bars + "</span>" +
          '<span class="do-t">' + esc(label) + "</span>";
        o.onclick = function () {
          state.placement = p.k;
          state.skip = p.skip;
          list.querySelectorAll(".duo-opt").forEach(function (c) { c.classList.remove("on"); });
          o.classList.add("on");
          setCont(true, "CONTINUE", goNext);
        };
        list.appendChild(o);
      });
      body.appendChild(list);
      setCont(!!state.placement, "CONTINUE", goNext);
    }

    /* step 3 — daily goal */
    function renderGoal() {
      body.appendChild(speech("What's your daily goal?"));
      var list = el("div", "duo-opt-grid one");
      GOALS.forEach(function (g) {
        var o = el("button", "duo-opt goal" + (state.goal === g.k ? " on" : ""));
        o.innerHTML = '<span class="do-t">' + esc(g.t) + "</span>" +
          '<span class="goal-tag">' + esc(g.tag) + "</span>";
        o.onclick = function () {
          state.goal = g.k;
          list.querySelectorAll(".duo-opt").forEach(function (c) { c.classList.remove("on"); });
          o.classList.add("on");
          setCont(true, "START LEARNING →", finish);
        };
        list.appendChild(o);
      });
      body.appendChild(list);
      setCont(true, "START LEARNING →", finish);
    }

    function goNext() { if (state.step < STEPS.length - 1) { state.step++; render(); } }

    function finish() {
      var known = state.known.slice();
      var primaryKnown = known[0] || "en";
      var first = activeTarget();
      // bkt-4vq: seed a course per selected target so they ALL appear in My Languages.
      // The first selected target becomes the ACTIVE course; the rest start at 0 progress,
      // ready to begin when the learner switches to them. Each keeps its own per-language
      // FSRS namespace ("lang:<target>"), so they're fully independent.
      state.learn.forEach(function (t) { markCourseStarted(t); });
      // persist the ACTIVE language choice via the SHARED pref so the rest of the app
      // agrees; `known` is the FULL multi-select array, first = primaryKnown.
      setPref(first, known, { primaryKnown: primaryKnown, polyglot: false, chosen: true });
      saveDuoPrefs({ reason: state.reason, placement: state.placement, goal: state.goal });
      // bkt-h9k: switch the engine to the ACTIVE language's own state BEFORE we grade any
      // placement words or build the path, so a new course starts truly fresh and an
      // existing course resumes its own progress.
      syncNamespace();
      // PLACEMENT: pre-introduce the first <skip> words so the learner starts further
      // along the active course's path (a real, honest head start — marked seen, not mastered).
      if (state.skip) {
        var ids = targetOrder().slice(0, state.skip);
        ids.forEach(function (id) { if (!e.cardFor(id)) grade(id, 3, "recall"); });
      }
      // go straight into the first lesson (do-first — no long preamble)
      var units = buildUnits();
      var flat = flattenNodes(units);
      var ci = currentNodeIndex(flat);
      var cur = flat[ci];
      if (cur) startLesson(cur.u, cur.nd, function () { onFinish && onFinish(); });
      else onFinish && onFinish();
    }

    render();
    return wrap;
  }

  function attribution() {
    return el("div", "duo-attrib",
      'Vocabulary glosses & IPA cross-checked against <b>Wiktionary</b> (CC-BY-SA, via Kaikki). ' +
      "Spoken aloud by your device — an early experiment, growing honestly.");
  }

  /* ===================================================================== *
   *  SURFACE #2 — THE PATH HOME (winding path of nodes grouped into units)
   * ===================================================================== */
  function path(go) {
    var b = B(), e = E();
    var ls = settings();
    var s = e.summary();
    var prefs = loadDuoPrefs();
    var units = buildUnits();
    var flat = flattenNodes(units);
    var ci = currentNodeIndex(flat);

    var wrap = el("div", "screen duo duo-path");

    /* --- top chrome: streak flame, hearts, XP, daily goal --- */
    var chrome = el("div", "duo-chrome");
    var langPill = el("button", "duo-lang-pill",
      '<span class="dlp-flag">' + flag(ls.target) + '</span>');
    langPill.title = "Learning " + langName(ls.target) + " · my languages";
    langPill.setAttribute("aria-label", "My languages — switch or add a course");
    langPill.onclick = function () { go("languages"); };
    chrome.appendChild(langPill);
    var hearts = duoHearts();
    chrome.appendChild(chromeStat("🔥", s.streak, "duo-streak", (s.streak || 0) + " day streak"));
    chrome.appendChild(chromeStat("❤️", hearts, "duo-hearts", hearts + " hearts"));
    chrome.appendChild(chromeStat("✦", s.xp, "duo-xp", (s.xp || 0) + " XP"));
    var goalDone = lessonsToday();
    chrome.appendChild(chromeStat("🎯", goalDone + "/" + (prefs.goal || 3), "duo-goal",
      "Daily goal: " + goalDone + " of " + (prefs.goal || 3) + " lessons"));
    wrap.appendChild(chrome);

    /* --- the winding path, unit by unit --- */
    var scroller = el("div", "duo-path-scroll");
    var nodeSeq = 0; // global node index for lock logic
    units.forEach(function (u) {
      // unit header banner
      var banner = el("div", "duo-unit-banner cat-" + u.cat);
      banner.innerHTML =
        '<div class="dub-meta"><span class="dub-kicker">Unit ' + u.n + "</span>" +
        '<span class="dub-title">' + esc(u.label) + "</span></div>" +
        '<span class="dub-ico">' + u.icon + "</span>";
      scroller.appendChild(banner);

      var lane = el("div", "duo-lane");
      u.nodes.forEach(function (nd, ni) {
        var gi = nodeSeq++;
        var locked = gi > ci;
        var done = nd.done;
        var current = gi === ci;
        // winding offset: alternate left/center/right like Duolingo's snake path
        var pos = ni % 4;
        var off = pos === 0 ? "c" : pos === 1 ? "r" : pos === 2 ? "c" : "l";
        var holder = el("div", "duo-node-holder off-" + off);
        var btn = el("button", "duo-node " +
          (done ? "done" : current ? "current" : locked ? "locked" : "open"));
        btn.setAttribute("aria-label",
          "Unit " + u.n + ", lesson " + nd.n + " — " +
          (done ? "completed" : current ? "current lesson, start" : locked ? "locked" : "available"));
        var inner = done ? "✓" : locked ? "🔒" : "★";
        btn.innerHTML = '<span class="dn-ring"></span><span class="dn-core">' + inner + "</span>";
        if (current) {
          var bub = el("div", "duo-node-start", "START");
          holder.appendChild(bub);
        }
        if (!locked) {
          btn.onclick = function () {
            startLesson(u, nd, function () { go("home"); });
          };
        } else {
          btn.onclick = function () {
            btn.classList.remove("nudge"); void btn.offsetWidth; btn.classList.add("nudge");
            toast("Finish the lesson above to unlock this one.");
          };
        }
        holder.appendChild(btn);
        // a small word-preview caption under each node
        var first = e.byId[nd.ids[0]];
        holder.appendChild(el("div", "duo-node-cap",
          esc((first && (first.forms[ls.target] || {}).word) || "")));
        lane.appendChild(holder);
      });
      scroller.appendChild(lane);
    });
    wrap.appendChild(scroller);

    // honesty banner stays present, footer of the path
    wrap.appendChild(honesty());

    // bottom tab bar (reuse app's nav style via bridge so it matches Academy)
    if (b.nav) wrap.appendChild(b.nav("home"));
    return wrap;
  }

  function chromeStat(icon, val, cls, label) {
    var d = el("div", "duo-cstat " + cls);
    d.setAttribute("title", label || "");
    d.setAttribute("aria-label", label || "");
    d.innerHTML = '<span class="dcs-i">' + icon + '</span><span class="dcs-v">' + esc(val) + "</span>";
    return d;
  }

  // hearts: gentle + generous. Refills daily; never blocks the lesson (Bucket is not punitive).
  var HEARTS_KEY = "bucket-academy/duo-hearts";
  var MAX_HEARTS = 5;
  function todayKey() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function duoHearts() {
    try {
      var h = JSON.parse(localStorage.getItem(HEARTS_KEY)) || {};
      if (h.day !== todayKey()) { h = { day: todayKey(), n: MAX_HEARTS }; localStorage.setItem(HEARTS_KEY, JSON.stringify(h)); }
      return typeof h.n === "number" ? h.n : MAX_HEARTS;
    } catch (e) { return MAX_HEARTS; }
  }
  function setHearts(n) {
    try { localStorage.setItem(HEARTS_KEY, JSON.stringify({ day: todayKey(), n: Math.max(0, Math.min(MAX_HEARTS, n)) })); } catch (e) {}
  }

  // count lessons completed today (for the daily-goal chip)
  var LESSON_LOG_KEY = "bucket-academy/duo-lessons";
  function lessonsToday() {
    try { var l = JSON.parse(localStorage.getItem(LESSON_LOG_KEY)) || {}; return l[todayKey()] || 0; }
    catch (e) { return 0; }
  }
  function bumpLessonsToday() {
    try {
      var l = JSON.parse(localStorage.getItem(LESSON_LOG_KEY)) || {};
      l[todayKey()] = (l[todayKey()] || 0) + 1;
      localStorage.setItem(LESSON_LOG_KEY, JSON.stringify(l));
    } catch (e) {}
  }

  function honesty() {
    return el("div", "duo-honesty lang-honesty",
      '<span class="lh-ico">⚗</span>' +
      '<span class="lh-txt"><b>Languages is an early experiment</b>, not a finished course — ' +
      "a small starter deck, spoken aloud by your device (not studio audio). " +
      "We're sharing it honestly while it grows.</span>");
  }

  function toast(msg) {
    var t = el("div", "duo-toast", esc(msg));
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("in"); });
    setTimeout(function () { t.classList.remove("in"); setTimeout(function () { t.remove(); }, 250); }, 1900);
  }

  /* ===================================================================== *
   *  SURFACE #2b — "MY LANGUAGES" (the Duo course switcher / dropdown)
   *  Lists every language the learner has STARTED (has progress), each row
   *  showing flag + name, words-learned signal, streak and XP for THAT course.
   *  Tapping a course switches to it (loads its own state → path). A prominent
   *  "+ Add a language" opens the onboarding picker to start a new course.
   *  Reachable from the flag pill on the path AND from the Progress tab.
   * ===================================================================== */
  function myLanguages(go) {
    var b = B();
    var cur = settings();
    var started = startedCourses();
    // Always include the active target even if it somehow wasn't registered yet, so a
    // freshly-switched course still appears at the top of its own list.
    if (cur.target && started.indexOf(cur.target) < 0) started = [cur.target].concat(started);

    var wrap = el("div", "screen duo duo-courses");

    var head = el("div", "duo-courses-head");
    head.appendChild(el("h1", "duo-courses-h1", "My Languages"));
    head.appendChild(el("p", "duo-courses-sub",
      "Each course keeps its own progress, streak and XP. Pick up where you left off, or start a new one."));
    wrap.appendChild(head);

    var list = el("div", "duo-courses-list");
    started.forEach(function (l) {
      var st = courseStats(l) || { learned: 0, total: b.langCoverage(l), xp: 0, streak: 0 };
      var isCur = l === cur.target;
      var row = el("button", "duo-course-row" + (isCur ? " current" : ""));
      row.setAttribute("aria-label",
        langName(l) + " course — " + st.learned + " of " + st.total + " words, " +
        (st.streak || 0) + " day streak, " + (st.xp || 0) + " XP" + (isCur ? " (current)" : ""));
      var pct = st.total ? Math.round((st.learned / st.total) * 100) : 0;
      row.innerHTML =
        '<span class="dcr-flag">' + flag(l) + "</span>" +
        '<span class="dcr-main">' +
          '<span class="dcr-name">' + esc(langName(l)) +
            (isCur ? ' <span class="dcr-badge">Learning</span>' : "") + "</span>" +
          '<span class="dcr-bar"><i style="width:' + pct + '%"></i></span>' +
          '<span class="dcr-meta">' + esc(st.learned) + " / " + esc(st.total) + " words</span>" +
        "</span>" +
        '<span class="dcr-stats">' +
          '<span class="dcr-stat">🔥 ' + esc(st.streak || 0) + "</span>" +
          '<span class="dcr-stat">✦ ' + esc(st.xp || 0) + "</span>" +
        "</span>";
      row.onclick = function () {
        if (l === cur.target) { go("home"); return; }
        // switch course: persist the new target, then let go("home") re-namespace the
        // engine to THIS language's own state before rendering its (independent) path.
        setPref(l, cur.known, { primaryKnown: cur.primaryKnown, chosen: true });
        go("home");
      };
      list.appendChild(row);
    });
    wrap.appendChild(list);

    // prominent "+ Add a language" → forces the onboarding picker to start a NEW course
    var add = el("button", "duo-add-lang", '<span class="dal-plus">+</span> Add a language');
    add.setAttribute("aria-label", "Add a new language course");
    add.onclick = function () { go("add-language"); };
    wrap.appendChild(add);

    wrap.appendChild(honesty());
    if (b.nav) wrap.appendChild(b.nav("progress"));
    return wrap;
  }

  /* ===================================================================== *
   *  SURFACE #3 — THE LESSON PLAYER (full-screen, progress bar + hearts,
   *  ~8-12 exercises with VARIETY, gentle green/amber feedback, combo)
   * ===================================================================== */
  function startLesson(unit, node, onExit) {
    var b = B(), e = E();
    var ls = settings();
    var target = ls.target, known = ls.known, shown = ls.shown;

    // Build the exercise sequence. Each WORD in the node gets 1-2 exercises of varying
    // type; we also add a "match" round and a "listen" round spanning the node's words.
    var words = node.ids.map(function (id) { return e.byId[id]; }).filter(Boolean);
    var seq = buildExerciseSequence(words, target, known, shown);
    if (!seq.length) { onExit && onExit(); return; }

    var i = 0;
    var combo = 0;       // current correct-in-a-row
    var bestCombo = 0;
    var correctCount = 0;
    var xpStart = e.summary().xp;
    var startedAt = Date.now();
    var hearts = duoHearts();
    var wrongQueue = []; // exercises to repeat at the end (rescheduled-sooner words)

    var screen = el("div", "screen duo duo-lesson");

    /* lesson chrome: X close, progress bar (+ combo flag), hearts */
    var top = el("div", "duo-lesson-top");
    var closeBtn = el("button", "duo-close", "✕");
    closeBtn.setAttribute("aria-label", "Quit lesson");
    closeBtn.onclick = function () { confirmQuit(); };
    var progWrap = el("div", "duo-prog-wrap");
    var progBar = el("div", "duo-prog");
    var progFill = el("i");
    progBar.appendChild(progFill);
    var comboFlag = el("div", "duo-combo-flag hidden");
    progWrap.appendChild(comboFlag);
    progWrap.appendChild(progBar);
    var heartChip = el("div", "duo-heart-chip", '<span>❤️</span><b>' + hearts + "</b>");
    top.appendChild(closeBtn);
    top.appendChild(progWrap);
    top.appendChild(heartChip);
    screen.appendChild(top);

    var stage = el("div", "duo-stage");
    screen.appendChild(stage);

    function setProgress() {
      var pct = (i / seq.length) * 100;
      progFill.style.width = pct + "%";
      if (combo >= 2) {
        comboFlag.classList.remove("hidden");
        comboFlag.textContent = combo + " IN A ROW!";
        progBar.classList.add("combo");
      } else {
        comboFlag.classList.add("hidden");
        progBar.classList.remove("combo");
      }
    }
    function setHeartChip() { heartChip.querySelector("b").textContent = hearts; }

    function confirmQuit() {
      var back = el("div", "sheet-back");
      var sheet = el("div", "sheet duo-quit");
      sheet.innerHTML = '<div class="sheet-title">Quit this lesson?</div>' +
        '<p class="duo-quit-sub">Your finished answers are saved. You can pick up where you left off.</p>';
      var keep = el("button", "duo-cont", "KEEP GOING");
      keep.onclick = function () { back.remove(); };
      var quit = el("button", "btn ghost wide", "Quit");
      quit.onclick = function () { back.remove(); onExit && onExit(); };
      sheet.appendChild(keep); sheet.appendChild(quit);
      back.appendChild(sheet);
      back.onclick = function (ev) { if (ev.target === back) back.remove(); };
      document.body.appendChild(back);
    }

    // record an answer: drive combo, hearts, FSRS grade, and the green/amber bar
    function onAnswer(opts) {
      // opts: { correct, atom, level, rating, reveal, target }
      var correct = opts.correct;
      if (correct) {
        combo++; bestCombo = Math.max(bestCombo, combo); correctCount++;
        if (root.haptic) try { root.haptic("correct"); } catch (e) {}
      } else {
        combo = 0;
        hearts = Math.max(0, hearts - 1); setHearts(hearts); setHeartChip();
        if (root.haptic) try { root.haptic("wrong"); } catch (e) {}
      }
      // FSRS grade: the scheduling signal. Wrong → Again (reschedule sooner), correct →
      // Good/Easy per the exercise's rating. Only graded exercises pass an atom+rating.
      if (opts.atom) {
        var rating = correct ? (opts.rating || 3) : 1;
        grade(opts.atom.id, rating, opts.level || "recall");
        if (!correct) wrongQueue.push(opts.repeat); // repeat this word at the end
      }
      showFeedback(correct, opts);
    }

    // the green "Correct!" / amber "Not quite" bottom bar with Continue
    function showFeedback(correct, opts) {
      var fb = el("div", "duo-feedback " + (correct ? "good" : "soft"));
      var icon = el("div", "duo-fb-icon", correct ? "✓" : "↻");
      var txt = el("div", "duo-fb-txt");
      txt.appendChild(el("div", "duo-fb-head", correct ?
        (opts.close ? "Close enough!" : "Correct!") : "Not quite — here's the answer"));
      if (opts.reveal) {
        var rev = el("div", "duo-fb-ans");
        rev.innerHTML = '<b>' + esc(opts.reveal.word) + "</b>" +
          (opts.reveal.ipa ? ' <i>/' + esc(opts.reveal.ipa) + "/</i>" : "") +
          (opts.reveal.gloss ? ' — ' + esc(opts.reveal.gloss) : "");
        var ab = audioBtn(opts.reveal.word, opts.target || target, { label: "Hear it", cls: "inline" });
        if (ab) rev.appendChild(ab);
        txt.appendChild(rev);
      }
      var cont = el("button", "duo-cont " + (correct ? "" : "soft"), "CONTINUE");
      cont.onclick = function () { fb.remove(); i++; nextEx(); };
      fb.appendChild(icon); fb.appendChild(txt); fb.appendChild(cont);
      screen.appendChild(fb);
      requestAnimationFrame(function () { fb.classList.add("in"); });
      try { cont.focus(); } catch (e) {}
    }

    function nextEx() {
      setProgress();
      stage.innerHTML = "";
      // when the planned sequence is exhausted, drain the wrong-answer repeat queue
      if (i >= seq.length) {
        if (wrongQueue.length) {
          var rep = wrongQueue.shift();
          seq.push(rep); // append; i now points at it
        } else {
          return finishLesson();
        }
      }
      var ex = seq[i];
      var node2 = renderExercise(ex, { target: target, known: known, shown: shown, onAnswer: onAnswer });
      if (!node2) { i++; return nextEx(); }
      stage.appendChild(node2);
      try { stage.scrollTop = 0; } catch (e) {}
      window.scrollTo(0, 0);
    }

    function finishLesson() {
      // mark the node done by ensuring each word has a card (lightly), bump logs
      node.ids.forEach(function (id) { if (!e.cardFor(id)) grade(id, 3, "recall"); });
      bumpLessonsToday();
      markCourseStarted(target); // bkt-h9k: this language now has progress → list it
      var xpEarned = Math.max(0, e.summary().xp - xpStart) + correctCount * 2; // ensure a visible reward
      var stats = {
        xp: xpEarned,
        combo: bestCombo,
        accuracy: seq.length ? Math.round((correctCount / Math.max(1, correctCount + wrongQueue.length + countWrong())) * 100) : 100,
        streak: e.summary().streak,
        seconds: Math.round((Date.now() - startedAt) / 1000),
        target: target,
        unit: unit, node: node,
      };
      reward(stats, onExit);
    }
    var _wrongTally = 0;
    function countWrong() { return _wrongTally; }

    // patch onAnswer to also tally wrongs for accuracy
    var _origAnswer = onAnswer;
    onAnswer = function (opts) { if (!opts.correct) _wrongTally++; _origAnswer(opts); };

    setProgress();
    nextEx();
    // mount through the bridge so the app's #app root is replaced
    b.mount(screen);
    return screen;
  }

  /* ---- build a varied exercise sequence for a node's words ---- */
  function buildExerciseSequence(words, target, known, shown) {
    var e = E();
    var seq = [];
    // 1) for each word: an introduction-flavored exercise, rotating the type
    var types = ["mc", "listen", "bank", "typed"];
    words.forEach(function (a, idx) {
      var word = (a.forms[target] || {}).word || "";
      if (!word) return;
      var t = types[idx % types.length];
      // first exposure of a brand-new word is always recognition (can't-fail)
      var brandNew = !e.cardFor(a.id);
      if (brandNew && (t === "typed")) t = "mc";
      // listen needs TTS; if unsupported, fall back to MC
      if (t === "listen" && !(root.LangAudio && root.LangAudio.supported())) t = "mc";
      seq.push({ type: t, atom: a });
    });
    // 2) a MATCH round in the middle (pairs target ↔ known gloss), 4-5 pairs
    if (words.length >= 3) {
      var matchPool = words.filter(function (a) { return (a.forms[target] || {}).word; }).slice(0, 5);
      if (matchPool.length >= 3) seq.splice(Math.ceil(seq.length / 2), 0, { type: "match", atoms: matchPool });
    }
    // 3) one extra recall pass on the highest-leverage word at the end (typed if not brand new)
    var last = words.slice().sort(function (a, b) { return (b.leverage || 0) - (a.leverage || 0); })[0];
    if (last && (last.forms[target] || {}).word) {
      seq.push({ type: (root.LangAudio && root.LangAudio.supported()) ? "listen" : "typed", atom: last });
    }
    return seq;
  }

  /* ---- siblings for distractors (same category, real coverage) ---- */
  function siblings(a, target, n) {
    var e = E();
    var want = (a.forms[target] || {}).word || "";
    var same = e.atoms.filter(function (x) {
      return x.id !== a.id && x.category === a.category && x.forms && x.forms[target] &&
        x.forms[target].word && x.forms[target].word !== want;
    });
    if (same.length < n) {
      var more = e.atoms.filter(function (x) {
        return x.id !== a.id && x.forms && x.forms[target] && x.forms[target].word &&
          x.forms[target].word !== want && same.indexOf(x) < 0;
      });
      same = same.concat(more);
    }
    return shuffle(same).slice(0, n);
  }

  /* ---- exercise dispatcher ---- */
  function renderExercise(ex, ctx) {
    if (ex.type === "mc") return exPictureMC(ex.atom, ctx);
    if (ex.type === "bank") return exWordBank(ex.atom, ctx);
    if (ex.type === "typed") return exTyped(ex.atom, ctx);
    if (ex.type === "match") return exMatch(ex.atoms, ctx);
    if (ex.type === "listen") return exListen(ex.atom, ctx);
    return null;
  }

  function exHeader(kicker, q) {
    var h = el("div", "duo-ex-head");
    if (kicker) h.appendChild(el("div", "duo-ex-kicker", kicker));
    h.appendChild(el("div", "duo-ex-q", q));
    return h;
  }
  function hintFor(a, ctx) {
    var hl = ctx.shown[0] || ctx.known[0];
    var hf = hl && a.forms[hl];
    return hf ? { lang: hl, word: hf.word } : null;
  }
  function revealOf(a, ctx) {
    var tf = a.forms[ctx.target] || {};
    return { word: tf.word, ipa: tf.ipa, gloss: a.gloss || a.title || "" };
  }

  /* (a) PICTURE multiple-choice — emoji prompt → word options (Duo "Which one is X?") */
  function exPictureMC(a, ctx) {
    var tf = a.forms[ctx.target] || {};
    var correct = tf.word || "";
    if (!correct) return null;
    var distractors = siblings(a, ctx.target, 2).map(function (x) { return x.forms[ctx.target].word; });
    if (distractors.length < 1) return exTyped(a, ctx); // not enough decoys → fall back
    var options = shuffle([correct].concat(distractors));
    var emoji = emojiFor(a.id);
    var hint = hintFor(a, ctx);

    var box = el("div", "duo-ex duo-ex-mc");
    box.appendChild(exHeader("NEW WORD",
      emoji ? ("Which one is this?") :
        ('Which one means <b>"' + esc(a.gloss || a.title || "") + '"</b>?')));
    if (emoji) {
      var pic = el("div", "duo-mc-pic");
      pic.innerHTML = '<span role="img" aria-label="' + esc(a.gloss || a.id) + '">' + emoji + "</span>";
      box.appendChild(pic);
    } else if (hint) {
      box.appendChild(el("div", "duo-mc-hint", esc(langName(hint.lang)) + ": " + esc(hint.word)));
    }
    var opts = el("div", "duo-mc-opts");
    var answered = false;
    options.forEach(function (w, k) {
      var o = el("button", "duo-mc-card");
      o.innerHTML = '<span class="dmc-num">' + (k + 1) + "</span>" +
        '<span class="dmc-word">' + esc(w) + "</span>";
      var ab = audioBtn(w, ctx.target, { label: "Hear " + w, cls: "inline" });
      if (ab) o.appendChild(ab);
      o.onclick = function () {
        if (answered) return;
        var right = w === correct;
        if (!right) {
          o.classList.add("wrong"); o.disabled = true;
          box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake");
          // generous: a wrong tap costs a heart + marks the answer, then resolves
          answered = true;
          box.querySelectorAll(".duo-mc-card").forEach(function (c) { c.disabled = true; });
          var rc = box.querySelector('[data-correct="1"]'); if (rc) rc.classList.add("right");
          ctx.onAnswer({ correct: false, atom: a, level: "recall", reveal: revealOf(a, ctx), target: ctx.target,
            repeat: { type: "mc", atom: a } });
          return;
        }
        answered = true;
        o.classList.add("right");
        box.querySelectorAll(".duo-mc-card").forEach(function (c) { c.disabled = true; });
        ctx.onAnswer({ correct: true, atom: a, level: "recall", rating: 3, reveal: revealOf(a, ctx), target: ctx.target });
      };
      if (w === correct) o.dataset.correct = "1";
      opts.appendChild(o);
    });
    box.appendChild(opts);
    return box;
  }

  /* (b) WORD-BANK tile assembly — build the target word from letter/syllable tiles */
  function exWordBank(a, ctx) {
    var tf = a.forms[ctx.target] || {};
    var correct = tf.word || "";
    if (Array.from(correct).length < 3) return exPictureMC(a, ctx);
    var hint = hintFor(a, ctx);
    var box = el("div", "duo-ex duo-ex-bank");
    box.appendChild(exHeader("BUILD IT",
      'Spell <b>"' + esc(a.gloss || a.title || "") + '"</b>' +
      (hint ? ' (' + esc(langName(hint.lang)) + ": " + esc(hint.word) + ")" : "") +
      " in " + esc(langName(ctx.target))));
    var letters = Array.from(correct);
    var sib = siblings(a, ctx.target, 1)[0];
    var decoySrc = sib ? Array.from(sib.forms[ctx.target].word) : [];
    var decoys = shuffle(decoySrc).filter(function (c) { return c.trim(); })
      .slice(0, Math.min(3, Math.max(1, Math.round(letters.length / 3))));
    var tiles = shuffle(letters.concat(decoys));

    var assembled = el("div", "duo-bank-line");
    var tray = el("div", "duo-bank-tray");
    var built = [];
    var answered = false;
    function refresh() {
      assembled.innerHTML = "";
      built.forEach(function (bd, idx) {
        var chip = el("button", "duo-bank-chip", esc(bd.ch === " " ? "␣" : bd.ch));
        chip.onclick = function () { if (answered) return; bd.tile.disabled = false; bd.tile.classList.remove("used"); built.splice(idx, 1); refresh(); checkBtnState(); };
        assembled.appendChild(chip);
      });
    }
    tiles.forEach(function (ch) {
      var t = el("button", "duo-bank-tile", esc(ch === " " ? "␣" : ch));
      t.onclick = function () { if (answered || t.disabled) return; t.disabled = true; t.classList.add("used"); built.push({ ch: ch, tile: t }); refresh(); checkBtnState(); };
      tray.appendChild(t);
    });
    box.appendChild(assembled);
    box.appendChild(tray);
    var check = el("button", "duo-check disabled", "CHECK");
    function checkBtnState() { check.classList.toggle("disabled", built.length === 0); }
    check.onclick = function () {
      if (answered || !built.length) return;
      answered = true;
      var typed = built.map(function (b) { return b.ch; }).join("");
      var res = check2(typed, correct, ctx.target);
      var ok = res.verdict !== "wrong";
      ctx.onAnswer({ correct: ok, close: res.verdict === "close", atom: a, level: "recall",
        rating: res.verdict === "close" ? 2 : 3, reveal: revealOf(a, ctx), target: ctx.target,
        repeat: { type: "bank", atom: a } });
    };
    box.appendChild(check);
    return box;
  }
  function check2(typed, correct, lang) {
    var b = B();
    try { return b.checkLangAnswer(typed, correct, lang); }
    catch (e) { return { verdict: typed === correct ? "correct" : "wrong" }; }
  }

  /* (c) TYPED recall — type the target word; accent/typo-tolerant grader */
  function exTyped(a, ctx) {
    var tf = a.forms[ctx.target] || {};
    var correct = tf.word || "";
    if (!correct) return null;
    var hint = hintFor(a, ctx);
    var box = el("div", "duo-ex duo-ex-typed");
    box.appendChild(exHeader("TYPE IT",
      'Write <b>"' + esc(a.gloss || a.title || "") + '"</b>' +
      (hint ? ' (' + esc(langName(hint.lang)) + ": " + esc(hint.word) + ")" : "") +
      " in " + esc(langName(ctx.target))));
    var input = el("input", "duo-input");
    input.type = "text"; input.autocapitalize = "off"; input.autocomplete = "off";
    input.spellcheck = false; input.setAttribute("aria-label", "Type the word in " + langName(ctx.target));
    box.appendChild(input);
    var check = el("button", "duo-check", "CHECK");
    var answered = false;
    function go() {
      if (answered) return;
      answered = true;
      var res = check2(input.value, correct, ctx.target);
      var ok = res.verdict !== "wrong";
      ctx.onAnswer({ correct: ok, close: res.verdict === "close", atom: a, level: "recall",
        rating: res.verdict === "close" ? 2 : (res.verdict === "correct" ? 4 : 3),
        reveal: revealOf(a, ctx), target: ctx.target, repeat: { type: "typed", atom: a } });
    }
    check.onclick = go;
    input.addEventListener("keydown", function (ev) { if (ev.key === "Enter") go(); });
    box.appendChild(check);
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 30);
    return box;
  }

  /* (d) MATCH / tap-the-pairs — match target words ↔ known glosses (NEW) */
  function exMatch(atoms, ctx) {
    var e = E();
    var pairs = atoms.map(function (a) {
      return { id: a.id, target: (a.forms[ctx.target] || {}).word || "", gloss: a.gloss || a.title || "", atom: a };
    }).filter(function (p) { return p.target && p.gloss; }).slice(0, 5);
    if (pairs.length < 3) return exPictureMC(atoms[0], ctx);

    var box = el("div", "duo-ex duo-ex-match");
    box.appendChild(exHeader("TAP THE PAIRS", "Match each word to its meaning"));
    var cols = el("div", "duo-match-cols");
    var leftCol = el("div", "duo-match-col");   // target words
    var rightCol = el("div", "duo-match-col");  // glosses
    var lefts = shuffle(pairs.slice());
    var rights = shuffle(pairs.slice());

    var selLeft = null, selRight = null, matched = 0, wrongTaps = 0;
    function tileBtn(p, side, label) {
      var t = el("button", "duo-match-tile");
      t.dataset.id = p.id; t.dataset.side = side;
      t.innerHTML = esc(label);
      if (side === "L") {
        var ab = audioBtn(p.target, ctx.target, { label: "Hear " + p.target, cls: "inline" });
        if (ab) t.appendChild(ab);
      }
      t.onclick = function () { onTap(t, p, side); };
      return t;
    }
    lefts.forEach(function (p) { leftCol.appendChild(tileBtn(p, "L", p.target)); });
    rights.forEach(function (p) { rightCol.appendChild(tileBtn(p, "R", p.gloss)); });
    cols.appendChild(leftCol); cols.appendChild(rightCol);
    box.appendChild(cols);

    function clearSel() {
      if (selLeft) selLeft.el.classList.remove("sel");
      if (selRight) selRight.el.classList.remove("sel");
      selLeft = selRight = null;
    }
    function onTap(t, p, side) {
      if (t.classList.contains("done")) return;
      if (side === "L") { if (selLeft) selLeft.el.classList.remove("sel"); selLeft = { el: t, p: p }; }
      else { if (selRight) selRight.el.classList.remove("sel"); selRight = { el: t, p: p }; }
      t.classList.add("sel");
      if (selLeft && selRight) resolvePair();
    }
    function resolvePair() {
      var ok = selLeft.p.id === selRight.p.id;
      if (ok) {
        selLeft.el.classList.add("done"); selRight.el.classList.add("done");
        selLeft.el.classList.remove("sel"); selRight.el.classList.remove("sel");
        selLeft.el.disabled = true; selRight.el.disabled = true;
        selLeft = selRight = null;
        matched++;
        if (root.haptic) try { root.haptic("tap"); } catch (e) {}
        if (matched >= pairs.length) finish();
      } else {
        wrongTaps++;
        var a = selLeft.el, c = selRight.el;
        a.classList.add("miss"); c.classList.add("miss");
        setTimeout(function () { a.classList.remove("miss", "sel"); c.classList.remove("miss", "sel"); }, 450);
        selLeft = selRight = null;
        if (root.haptic) try { root.haptic("wrong"); } catch (e) {}
      }
    }
    function finish() {
      // grade every matched word; the whole round is "correct" if no wrong taps,
      // else still counts as completed but credits each atom Good (not Easy).
      var clean = wrongTaps === 0;
      pairs.forEach(function (p) { grade(p.id, clean ? 4 : 3, "recall"); });
      ctx.onAnswer({ correct: true, close: !clean, target: ctx.target,
        reveal: null /* match has no single reveal */ });
    }
    return box;
  }

  /* (e) LISTEN — "Tap what you hear": TTS plays the word, learner picks/assembles it (NEW) */
  function exListen(a, ctx) {
    var tf = a.forms[ctx.target] || {};
    var correct = tf.word || "";
    if (!correct) return null;
    if (!(root.LangAudio && root.LangAudio.supported())) return exPictureMC(a, ctx); // no TTS → fall back
    var distractors = siblings(a, ctx.target, 2).map(function (x) { return x.forms[ctx.target].word; });
    if (distractors.length < 1) return exTyped(a, ctx);
    var options = shuffle([correct].concat(distractors));

    var box = el("div", "duo-ex duo-ex-listen");
    box.appendChild(exHeader("LISTEN", "Tap what you hear"));
    // big speaker button (auto-plays once on mount via a user-gesture-free attempt;
    // if blocked, the learner taps it — the button always works on tap)
    var playWrap = el("div", "duo-listen-play");
    var big = el("button", "duo-listen-big", "🔊");
    big.setAttribute("aria-label", "Play the word again");
    big.onclick = function () { root.LangAudio.speak(correct, ctx.target); big.classList.remove("pulse"); void big.offsetWidth; big.classList.add("pulse"); };
    playWrap.appendChild(big);
    var slow = el("button", "duo-listen-slow", "🐢 slower");
    slow.onclick = function () { root.LangAudio.speak(correct, ctx.target, { rate: 0.55 }); };
    playWrap.appendChild(slow);
    box.appendChild(playWrap);

    var opts = el("div", "duo-mc-opts listen");
    var answered = false;
    options.forEach(function (w) {
      var o = el("button", "duo-mc-card listen-card", '<span class="dmc-word">' + esc(w) + "</span>");
      o.onclick = function () {
        if (answered) return;
        var right = w === correct;
        answered = true;
        box.querySelectorAll(".duo-mc-card").forEach(function (c) { c.disabled = true; });
        if (right) o.classList.add("right");
        else { o.classList.add("wrong"); var rc = box.querySelector('[data-correct="1"]'); if (rc) rc.classList.add("right"); box.classList.add("shake"); }
        ctx.onAnswer({ correct: right, atom: a, level: "recall", rating: 3,
          reveal: revealOf(a, ctx), target: ctx.target, repeat: { type: "listen", atom: a } });
      };
      if (w === correct) o.dataset.correct = "1";
      opts.appendChild(o);
    });
    box.appendChild(opts);
    // attempt an autoplay (most browsers allow speechSynthesis after prior gestures in-session)
    setTimeout(function () { try { root.LangAudio.speak(correct, ctx.target); } catch (e) {} }, 250);
    return box;
  }

  /* ===================================================================== *
   *  SURFACE #4 — THE REWARD SCREEN (animated XP + streak + combo summary)
   * ===================================================================== */
  function reward(stats, onExit) {
    var b = B();
    var screen = el("div", "screen duo duo-reward");
    var burst = el("div", "duo-reward-burst");
    burst.appendChild(mascot("big"));
    screen.appendChild(burst);
    screen.appendChild(el("h1", "duo-reward-h1", "Lesson complete!"));
    var sub = el("div", "duo-reward-sub",
      flag(stats.target) + " " + esc(langName(stats.target)) +
      " · Unit " + stats.unit.n + " · Lesson " + stats.node.n);
    screen.appendChild(sub);

    var cards = el("div", "duo-reward-stats");
    cards.appendChild(rewardCard("✦", "TOTAL XP", "+" + stats.xp, "xp"));
    cards.appendChild(rewardCard("⚡", "TOP COMBO", stats.combo + "×", "combo"));
    cards.appendChild(rewardCard("🎯", "ACCURACY", stats.accuracy + "%", "acc"));
    cards.appendChild(rewardCard("🔥", "STREAK", stats.streak + (stats.streak === 1 ? " day" : " days"), "streak"));
    screen.appendChild(cards);

    var cont = el("button", "duo-cont", "CONTINUE");
    cont.onclick = function () { onExit && onExit(); };
    screen.appendChild(cont);

    b.mount(screen);
    if (root.haptic) try { root.haptic("celebrate"); } catch (e) {}
    // animate the numbers up (respect reduced motion)
    if (!reducedMotion()) {
      animateCount(cards.querySelector(".xp .drc-val"), stats.xp, "+");
    }
    return screen;
  }
  function rewardCard(icon, label, val, cls) {
    var d = el("div", "duo-reward-card " + cls);
    d.innerHTML = '<span class="drc-i">' + icon + '</span>' +
      '<span class="drc-label">' + esc(label) + "</span>" +
      '<span class="drc-val">' + esc(val) + "</span>";
    return d;
  }
  function animateCount(node, to, prefix) {
    if (!node) return;
    var start = 0, dur = 700, t0 = performance.now();
    function tick(t) {
      var p = Math.min(1, (t - t0) / dur);
      var v = Math.round(start + (to - start) * (1 - Math.pow(1 - p, 3)));
      node.textContent = (prefix || "") + v;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---- public API ---- */
  root.DuoLang = {
    available: available,
    shouldOnboard: shouldOnboard,
    onboarding: onboarding,
    path: path,
    myLanguages: myLanguages,
    startLesson: startLesson,
    _buildUnits: buildUnits, // for tests
  };
})(typeof window !== "undefined" ? window : globalThis);
