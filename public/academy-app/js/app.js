/* Bucket Academy — UI layer. Apple-grade, content-first. Implements the route loop,
 * the atom screen (functional art + 3-depth progressive disclosure + drill + non-punishing
 * feedback), progress, and the curated concentric-shell nucleus map (never force-directed).
 */
(function () {
  "use strict";
  const E = new window.Engine();
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (t, c, h) => {
    const n = document.createElement(t);
    if (c) n.className = c;
    if (h != null) n.innerHTML = h;
    return n;
  };
  const SHELL_RANK = { prereq: 0, nucleus: 1, frontier: 2 };
  const SHELL_LABEL = { prereq: "Prerequisite", nucleus: "Nucleus", frontier: "Frontier" };

  // Available branches (corpora). The overnight loop added the picker UI; these
  // are the definitions it referenced. Each branch keeps independent progress.
  const BRANCH_PREF_KEY = "bucket-academy/branch";
  const DEFAULT_BRANCH = "corpus/biophysics.json";
  const BRANCHES = [
    { file: "corpus/01-mathematics.json", pill: "I · Mathematics", sub: "The foundations of reasoning" },
    { file: "corpus/02-physics.json", pill: "II · Physics", sub: "Matter, energy & spacetime" },
    { file: "corpus/03-chemistry.json", pill: "III · Chemistry", sub: "Matter, bonds & transformation" },
    { file: "corpus/04-information.json", pill: "IV · Information", sub: "Entropy, computation & complexity" },
    { file: "corpus/biophysics.json", pill: "V · Biophysics", sub: "Energy, matter & life" },
    { file: "corpus/06-cosmology.json", pill: "VI · Cosmology", sub: "The universe at large" },
    { file: "corpus/07-mind.json", pill: "VII · Mind", sub: "Brains, computation & cognition" },
    { file: "corpus/lang-core.json", pill: "✺ · Languages", sub: "Learn a language through the ones you know" },
  ];
  // canon branch slug per corpus → links into bucket.foundation/canon/<slug>
  const CANON_SLUG = {
    "01-mathematics": "mathematics", "02-physics": "physics", "03-chemistry": "chemistry",
    "04-information": "information", "05-biophysics": "biophysics", "06-cosmology": "cosmology",
    "07-mind": "mind",
  };
  const LANG_NAMES = {
    en: "English", es: "Spanish", fr: "French", it: "Italian",
    pt: "Portuguese", de: "German", la: "Latin",
  };
  const LANG_PREF_KEY = "bucket-academy/lang";
  let currentBranchFile = (function () {
    try {
      return localStorage.getItem(BRANCH_PREF_KEY) || DEFAULT_BRANCH;
    } catch (e) {
      return DEFAULT_BRANCH;
    }
  })();

  let session = null; // {queue:[{id,kind}], i, current, level, revealed}

  function katex(root) {
    if (window.renderMathInElement)
      try {
        window.renderMathInElement(root, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
          ],
          throwOnError: false,
        });
      } catch (e) {}
  }

  function artCard(atom) {
    // Functional placeholder "concept card": equation hero on a shell-tinted gradient.
    // Real generated art (load-bearing-art contract) is rendered by the overnight loop.
    const card = el("div", "art shell-" + atom.shell);
    card.innerHTML =
      '<div class="art-badge">' + SHELL_LABEL[atom.shell] + "</div>" +
      '<div class="art-eq">' + (atom.equation ? "$$" + atom.equation + "$$" : escapeHtml(atom.title)) + "</div>" +
      '<div class="art-title">' + escapeHtml(atom.title) + "</div>";
    return card;
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  /* ---------- screens ---------- */
  function screenHome() {
    const s = E.summary();
    const route = E.route();
    const wrap = el("div", "screen home");
    wrap.appendChild(header());

    const hero = el("div", "hero");
    const curBranch = BRANCHES.find((b) => b.file === currentBranchFile) || BRANCHES[0];
    hero.appendChild(el("div", "kicker", curBranch.pill.replace(/^\S+ · /, "") + " · today's route"));
    hero.appendChild(el("h1", null, route.length ? "Ready when you are." : "All caught up. 🎉"));
    const sub = route.length
      ? route.filter((r) => r.kind === "review").length + " reviews · " + route.filter((r) => r.kind === "new").length + " new concepts"
      : "Nothing due. Explore the map or come back tomorrow.";
    hero.appendChild(el("p", "sub", sub));
    const cta = el("button", "btn primary", route.length ? "Start route →" : "Explore the map");
    cta.onclick = () => (route.length ? startSession(route) : go("map"));
    hero.appendChild(cta);
    const studyBtn = el("button", "btn ghost hero-study", "📖 Study — read the material");
    studyBtn.onclick = () => go("study");
    hero.appendChild(studyBtn);
    wrap.appendChild(hero);

    const stats = el("div", "stats");
    stats.appendChild(stat("🔥", s.streak, "day streak"));
    stats.appendChild(stat("✦", s.xp, "XP"));
    stats.appendChild(stat("◎", s.introduced + "/" + s.total, "concepts seen"));
    stats.appendChild(stat("★", s.mastered, "mastered"));
    wrap.appendChild(stats);

    // route preview
    if (route.length) {
      const list = el("div", "route-list");
      list.appendChild(el("div", "section-label", "Up next"));
      route.slice(0, 8).forEach((r) => {
        const a = E.byId[r.id];
        const row = el("div", "route-row");
        row.appendChild(el("span", "dot shell-dot-" + a.shell));
        row.appendChild(el("span", "rtitle", escapeHtml(a.title)));
        row.appendChild(el("span", "rtag " + r.kind, r.kind === "new" ? "new" : "review"));
        row.onclick = () => openAtom(a.id, true);
        list.appendChild(row);
      });
      wrap.appendChild(list);
    }
    wrap.appendChild(nav("home"));
    katex(wrap);
    return wrap;
  }

  function stat(icon, val, label) {
    const d = el("div", "stat");
    d.innerHTML = '<div class="sicon">' + icon + '</div><div class="sval">' + val + '</div><div class="slabel">' + label + "</div>";
    return d;
  }

  function header() {
    const h = el("div", "topbar");
    const cur = BRANCHES.find((b) => b.file === currentBranchFile) || BRANCHES[0];
    h.innerHTML =
      '<div class="brand">Bucket <span>Academy</span></div>' +
      '<button class="branch-pill" id="branchPill" title="Switch branch">' +
      cur.pill +
      ' <span class="branch-caret">▾</span></button>';
    h.querySelector("#branchPill").onclick = openBranchPicker;
    // Optional sign-in control (no-op when auth is disabled / not configured).
    if (window.BucketAuthUI) window.BucketAuthUI.mountInto(h);
    return h;
  }

  function openBranchPicker() {
    const back = el("div", "sheet-back");
    const sheet = el("div", "sheet");
    sheet.innerHTML = '<div class="sheet-title">Choose a branch</div>';
    BRANCHES.forEach((b) => {
      const on = b.file === currentBranchFile;
      const row = el(
        "button",
        "branch-row" + (on ? " on" : ""),
        '<span class="branch-row-name">' + b.pill + "</span>" +
          '<span class="branch-row-sub">' + b.sub + "</span>"
      );
      row.onclick = () => {
        back.remove();
        if (b.file !== currentBranchFile) switchBranch(b.file);
      };
      sheet.appendChild(row);
    });
    back.appendChild(sheet);
    back.onclick = (e) => {
      if (e.target === back) back.remove();
    };
    document.body.appendChild(back);
  }

  async function switchBranch(file) {
    currentBranchFile = file;
    try {
      localStorage.setItem(BRANCH_PREF_KEY, file);
    } catch (e) {}
    session = null;
    try {
      await E.load(file);
      normalizeAtoms();
    } catch (e) {
      $("#app").innerHTML =
        '<div class="screen"><div class="hero"><h1>Corpus failed to load</h1><p class="sub">Run via a local server: <code>./serve.sh</code></p></div></div>';
      return;
    }
    go("home");
  }

  function nav(active) {
    const n = el("div", "tabbar tabbar-4");
    [["home", "◎", "Today"], ["study", "▤", "Study"], ["map", "✸", "Map"], ["progress", "▰", "Progress"]].forEach(([k, i, l]) => {
      const b = el("button", "tab" + (k === active ? " on" : ""), '<span>' + i + "</span>" + l);
      b.onclick = () => go(k);
      n.appendChild(b);
    });
    return n;
  }

  /* ---------- atom (study) ---------- */
  function openAtom(id, peek) {
    session = session || { queue: [{ id, kind: E.cardFor(id) ? "review" : "new" }], i: 0 };
    renderAtom(id, peek);
  }

  function pickLevel(id) {
    // start coarse (one card/atom). Rotate question depth by mastery (DECISIONS.md#2).
    const m = E.masteryFor(id);
    const a = E.byId[id];
    const have = (a.quiz || []).map((q) => q.level);
    const order = ["recall", "apply", "derive", "teach"];
    const target = m < 0.25 ? "recall" : m < 0.5 ? "apply" : m < 0.75 ? "derive" : "teach";
    for (let k = order.indexOf(target); k >= 0; k--) if (have.includes(order[k])) return order[k];
    return have[0] || "recall";
  }

  function isLang() {
    return !!(E.meta && E.meta.kind === "language");
  }
  function normalizeAtoms() {
    // language atoms use `gloss`; give them a display title so shared UI works.
    E.atoms.forEach((a) => { if (!a.title) a.title = a.gloss || a.id; });
  }
  function langSettings() {
    const langs = (E.meta && E.meta.languages) || ["en"];
    let p = {};
    try { p = JSON.parse(localStorage.getItem(LANG_PREF_KEY)) || {}; } catch (e) {}
    let target = p.target && langs.includes(p.target) ? p.target : (langs.find((l) => l !== "en") || langs[0]);
    let known = (p.known || ["en"]).filter((l) => langs.includes(l) && l !== target);
    if (!known.length) known = langs.filter((l) => l !== target).slice(0, 1);
    return { target, known, langs };
  }
  function setLangPref(target, known) {
    try { localStorage.setItem(LANG_PREF_KEY, JSON.stringify({ target, known })); } catch (e) {}
  }

  // "Go deeper" (external resources) + "Related in Bucket" (canon links) for any atom.
  function deeperSection(a) {
    const wrap = el("div", "deeper");
    if (a.resources && a.resources.length) {
      wrap.appendChild(el("div", "section-label", "Go deeper"));
      const list = el("div", "link-list");
      a.resources.forEach((r) => {
        if (!r || !r.url) return;
        const lk = el("a", "ext-link", '<span class="lk-ico">↗</span>' + escapeHtml(r.label || r.url));
        lk.href = r.url; lk.target = "_blank"; lk.rel = "noopener noreferrer";
        list.appendChild(lk);
      });
      wrap.appendChild(list);
    }
    const slug = CANON_SLUG[E.meta && E.meta.branch];
    if (slug) {
      wrap.appendChild(el("div", "section-label", "Related in Bucket"));
      const list = el("div", "link-list");
      const mk = (href, label, ico) => {
        const l = el("a", "int-link", '<span class="lk-ico">' + ico + "</span>" + label);
        l.href = href; l.target = "_blank"; l.rel = "noopener"; return l;
      };
      const nice = slug.charAt(0).toUpperCase() + slug.slice(1);
      list.appendChild(mk("/canon/" + slug, "Canon · " + nice, "❖"));
      list.appendChild(mk("/canon/search?q=" + encodeURIComponent(a.title || ""), "Find claims: " + escapeHtml(a.title || ""), "🔍"));
      list.appendChild(mk("/canon/graph", "Knowledge graph", "✸"));
      wrap.appendChild(list);
    }
    return wrap;
  }

  /* ---------- language (polyglot) atom ---------- */
  function renderLangAtom(id, peek) {
    const a = E.byId[id];
    const { target, known } = langSettings();
    const tf = a.forms[target] || {};
    const wrap = el("div", "screen atom lang");
    wrap.appendChild(header());
    const top = el("div", "atom-top");
    const back = el("button", "ghost", "‹ Route"); back.onclick = () => go("home");
    top.appendChild(back);
    top.appendChild(el("span", "prog", session ? session.i + 1 + " / " + session.queue.length : ""));
    wrap.appendChild(top);

    const card = el("div", "art lang-card shell-" + a.shell);
    card.innerHTML =
      '<div class="art-badge">' + escapeHtml(LANG_NAMES[target] || target) + "</div>" +
      '<div class="lang-word">' + escapeHtml(tf.word || "—") + "</div>" +
      (tf.ipa ? '<div class="lang-ipa">/' + escapeHtml(tf.ipa) + "/</div>" : "") +
      '<div class="art-title">' + escapeHtml(a.gloss || a.title || "") +
        (a.pos ? " · " + escapeHtml(a.pos) : "") + (tf.gender ? " · " + escapeHtml(tf.gender) : "") + "</div>";
    wrap.appendChild(card);

    const body = el("div", "atom-body");
    const ref = el("div", "lang-ref");
    ref.appendChild(el("div", "section-label", "In the languages you know"));
    known.forEach((l) => {
      const f = a.forms[l]; if (!f) return;
      ref.appendChild(el("div", "lang-row",
        '<span class="lang-name">' + escapeHtml(LANG_NAMES[l] || l) + "</span>" +
        '<span class="lang-w">' + escapeHtml(f.word) + (f.ipa ? ' <i>/' + escapeHtml(f.ipa) + "/</i>" : "") + "</span>"));
    });
    body.appendChild(ref);
    if (a.note) body.appendChild(el("div", "lang-note", escapeHtml(a.note)));
    if (a.example) {
      const ex = el("div", "lang-ex");
      ex.appendChild(el("div", "section-label", "Example"));
      [target].concat(known).forEach((l) => {
        if (!a.example[l]) return;
        ex.appendChild(el("div", "ex-row",
          '<span class="lang-name">' + escapeHtml(LANG_NAMES[l] || l) + "</span> " + escapeHtml(a.example[l])));
      });
      body.appendChild(ex);
    }
    wrap.appendChild(body);

    if (!peek) wrap.appendChild(langDrill(a, target, known));
    else { const cont = el("button", "btn primary wide", "Got it →"); cont.onclick = () => go("home"); wrap.appendChild(cont); }
    wrap.appendChild(deeperSection(a));
    mount(wrap);
  }

  function langDrill(a, target, known) {
    const box = el("div", "drill");
    box.appendChild(el("div", "drill-label", "Recall · " + (LANG_NAMES[target] || target)));
    const hintLang = known[0];
    const hint = hintLang && a.forms[hintLang];
    box.appendChild(el("div", "q",
      "How do you say <b>“" + escapeHtml(a.gloss || a.title || "") + "”</b>" +
      (hint ? " (" + escapeHtml(LANG_NAMES[hintLang] || hintLang) + ": " + escapeHtml(hint.word) + ")" : "") +
      " in " + escapeHtml(LANG_NAMES[target] || target) + "?"));
    const tf = a.forms[target] || {};
    const answer = el("div", "answer hidden");
    answer.innerHTML = "<div class='a-label'>Answer</div><div class='a-text lang-ans'>" +
      escapeHtml(tf.word || "") + (tf.ipa ? " <i>/" + escapeHtml(tf.ipa) + "/</i>" : "") + "</div>";
    const reveal = el("button", "btn wide", "Show answer");
    const rate = el("div", "rate hidden");
    reveal.onclick = () => { answer.classList.remove("hidden"); reveal.classList.add("hidden"); rate.classList.remove("hidden"); };
    [[1, "Again", "again"], [2, "Hard", "hard"], [3, "Good", "good"], [4, "Easy", "easy"]].forEach(([g, lbl, cls]) => {
      const b = el("button", "rbtn " + cls, lbl);
      b.onclick = () => { E.grade(a.id, g, "recall"); next(); };
      rate.appendChild(b);
    });
    box.appendChild(reveal); box.appendChild(answer); box.appendChild(rate);
    return box;
  }

  function renderAtom(id, peek) {
    if (isLang()) return renderLangAtom(id, peek);
    const a = E.byId[id];
    const level = pickLevel(id);
    const wrap = el("div", "screen atom");
    wrap.appendChild(header());

    const top = el("div", "atom-top");
    const back = el("button", "ghost", "‹ Route");
    back.onclick = () => go("home");
    top.appendChild(back);
    top.appendChild(el("span", "prog", session ? session.i + 1 + " / " + session.queue.length : ""));
    wrap.appendChild(top);

    wrap.appendChild(artCard(a));

    // 3-depth progressive disclosure
    const body = el("div", "atom-body");
    body.appendChild(el("h2", null, escapeHtml(a.title)));
    const depthTabs = el("div", "depth-tabs");
    const depths = [["eli5", "Plain"], ["core", "Core"], ["deep", "Deep"]];
    const content = el("div", "depth-content");
    function showDepth(k) {
      depthTabs.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.k === k));
      content.innerHTML = "<p>" + escapeHtml(a.depths && a.depths[k] ? a.depths[k] : a.summary || "") + "</p>";
      if (k === "deep" && a.equation) content.innerHTML += '<div class="eqbox">$$' + a.equation + "$$</div>";
      if (k === "deep" && a.note) content.innerHTML += '<p class="note">' + escapeHtml(a.note) + "</p>";
      katex(content);
    }
    depths.forEach(([k, lbl]) => {
      const b = el("button", null, lbl);
      b.dataset.k = k;
      b.onclick = () => showDepth(k);
      depthTabs.appendChild(b);
    });
    body.appendChild(depthTabs);
    body.appendChild(content);
    showDepth("core");

    // source citation
    if (a.sources) body.appendChild(el("div", "cite", "Learn from: " + escapeHtml((a.sources || []).join(" · "))));
    wrap.appendChild(body);

    // drill
    const q = (a.quiz || []).find((x) => x.level === level) || (a.quiz || [])[0];
    if (q && !peek) wrap.appendChild(drill(a, q, level));
    else {
      const cont = el("button", "btn primary wide", "Got it →");
      cont.onclick = () => go("home");
      wrap.appendChild(cont);
    }

    // unlocks line (make leverage visible)
    if (a.unlocks && a.unlocks.length) {
      const u = el("div", "unlocks", "Unlocks → " + a.unlocks.map((x) => (E.byId[x] ? E.byId[x].title : x)).join(", "));
      wrap.appendChild(u);
    }

    wrap.appendChild(deeperSection(a));
    mount(wrap);
    katex(wrap);
  }

  function drill(atom, q, level) {
    const box = el("div", "drill");
    box.appendChild(el("div", "drill-label", "Retrieve · " + level));
    box.appendChild(el("div", "q", q.prompt));
    const answer = el("div", "answer hidden");
    answer.innerHTML = "<div class='a-label'>Answer</div><div class='a-text'>" + q.answer + "</div>";
    const reveal = el("button", "btn wide", "Show answer");
    reveal.onclick = () => {
      answer.classList.remove("hidden");
      reveal.classList.add("hidden");
      rate.classList.remove("hidden");
      katex(answer);
    };
    const rate = el("div", "rate hidden");
    [[1, "Again", "again"], [2, "Hard", "hard"], [3, "Good", "good"], [4, "Easy", "easy"]].forEach(([g, lbl, cls]) => {
      const b = el("button", "rbtn " + cls, lbl);
      b.onclick = () => {
        E.grade(atom.id, g, level);
        // If signed in, push this branch's updated blob to the server (fire-and-forget).
        if (window.BucketAuth && window.BucketAuth.enabled && E.meta && E.meta.branch)
          window.BucketAuth.pushActive(E.meta.branch);
        next();
      };
      rate.appendChild(b);
    });
    box.appendChild(el("div", "q-eq", q.eq ? "$$" + q.eq + "$$" : ""));
    box.appendChild(reveal);
    box.appendChild(answer);
    box.appendChild(rate);
    return box;
  }

  function startSession(route) {
    session = { queue: route.slice(), i: 0 };
    renderAtom(session.queue[0].id, false);
  }
  function next() {
    if (!session) return go("home");
    session.i++;
    if (session.i >= session.queue.length) {
      session = null;
      return mount(screenDone());
    }
    renderAtom(session.queue[session.i].id, false);
    window.scrollTo(0, 0);
  }

  function screenDone() {
    const s = E.summary();
    const wrap = el("div", "screen done");
    wrap.appendChild(header());
    const c = el("div", "celebrate");
    c.innerHTML =
      '<div class="big">✦</div><h1>Route complete.</h1>' +
      '<p class="sub">+XP banked. Streak ' + s.streak + " · " + s.mastered + " mastered.</p>";
    const b = el("button", "btn primary", "Back to today");
    b.onclick = () => go("home");
    c.appendChild(b);
    const map = el("button", "btn ghost wide", "See what you unlocked on the map");
    map.onclick = () => go("map");
    c.appendChild(map);
    wrap.appendChild(c);
    wrap.appendChild(nav("home"));
    return wrap;
  }

  /* ---------- study / read mode (learn the material in order) ---------- */
  let studyDepth = "core";

  // Topological learning order (prerequisites first), foundations-weighted.
  function studyOrder() {
    const atoms = E.atoms;
    const shellRank = { prereq: 0, nucleus: 1, frontier: 2 };
    const indeg = {}, adj = {};
    atoms.forEach((a) => { indeg[a.id] = (a.requires || []).filter((r) => E.byId[r]).length; });
    atoms.forEach((a) => (a.requires || []).forEach((r) => { if (E.byId[r]) (adj[r] = adj[r] || []).push(a.id); }));
    let q = atoms.filter((a) => indeg[a.id] === 0).map((a) => a.id);
    const out = [], seen = new Set();
    const order = (x, y) => (shellRank[E.byId[x].shell] - shellRank[E.byId[y].shell]) || ((E.byId[y].leverage || 0) - (E.byId[x].leverage || 0));
    while (q.length) {
      q.sort(order);
      const id = q.shift();
      if (seen.has(id)) continue;
      seen.add(id); out.push(id);
      (adj[id] || []).forEach((n) => { indeg[n]--; if (indeg[n] === 0) q.push(n); });
    }
    atoms.forEach((a) => { if (!seen.has(a.id)) out.push(a.id); }); // any leftovers (cycles)
    return out;
  }

  function screenStudy() {
    if (isLang()) return screenStudyLang();
    const wrap = el("div", "screen study");
    wrap.appendChild(header());
    const cur = BRANCHES.find((b) => b.file === currentBranchFile) || BRANCHES[0];
    wrap.appendChild(el("h1", "study-h1", cur.pill.replace(/^\S+ · /, "")));
    wrap.appendChild(el("p", "study-sub", "Read straight through — foundations first. Switch depth any time; tap a concept to drill it."));

    // global depth toggle
    const tabs = el("div", "depth-tabs study-depth");
    [["eli5", "Plain"], ["core", "Core"], ["deep", "Deep"]].forEach(([k, lbl]) => {
      const b = el("button", studyDepth === k ? "on" : null, lbl);
      b.onclick = () => { studyDepth = k; go("study"); };
      tabs.appendChild(b);
    });
    wrap.appendChild(tabs);

    const order = studyOrder();
    let lastShell = null;
    const SHELL_H = { prereq: "Prerequisites", nucleus: "Core", frontier: "Frontier" };
    order.forEach((id, i) => {
      const a = E.byId[id];
      if (a.shell !== lastShell) {
        wrap.appendChild(el("div", "study-section", SHELL_H[a.shell] || a.shell));
        lastShell = a.shell;
      }
      const blk = el("div", "study-block shell-edge-" + a.shell);
      const head = el("div", "sb-head");
      head.innerHTML = '<span class="sb-num">' + (i + 1) + "</span><span class=\"sb-title\">" + escapeHtml(a.title) + "</span>";
      const m = E.masteryFor(id);
      if (E.cardFor(id)) head.appendChild(el("span", "sb-mastery" + (m >= 0.7 ? " on" : ""), m >= 0.7 ? "✓ known" : "seen"));
      blk.appendChild(head);
      const txt = (a.depths && a.depths[studyDepth]) || a.summary || "";
      blk.appendChild(el("p", "sb-text", escapeHtml(txt)));
      if (a.equation) { const eq = el("div", "eqbox", "$$" + a.equation + "$$"); blk.appendChild(eq); }
      if (a.note && studyDepth !== "eli5") blk.appendChild(el("p", "sb-note", escapeHtml(a.note)));
      // compact references
      const det = el("details", "sb-more");
      det.appendChild(el("summary", null, "Sources & links"));
      const ll = el("div", "link-list");
      (a.resources || []).slice(0, 8).forEach((r) => {
        if (!r || !r.url) return;
        const lk = el("a", "ext-link", '<span class="lk-ico">↗</span>' + escapeHtml(r.label || r.url));
        lk.href = r.url; lk.target = "_blank"; lk.rel = "noopener noreferrer"; ll.appendChild(lk);
      });
      const slug = CANON_SLUG[E.meta && E.meta.branch];
      if (slug) { const lk = el("a", "int-link", '<span class="lk-ico">❖</span>Canon · ' + (slug.charAt(0).toUpperCase() + slug.slice(1))); lk.href = "/canon/" + slug; lk.target = "_blank"; lk.rel = "noopener"; ll.appendChild(lk); }
      det.appendChild(ll);
      blk.appendChild(det);
      const drill = el("button", "sb-drill", "Drill this →");
      drill.onclick = () => openAtom(id, false);
      blk.appendChild(drill);
      wrap.appendChild(blk);
    });

    wrap.appendChild(nav("study"));
    mount(wrap);
    katex(wrap);
  }

  function screenStudyLang() {
    const wrap = el("div", "screen study");
    wrap.appendChild(header());
    const { target, known } = langSettings();
    wrap.appendChild(el("h1", "study-h1", (LANG_NAMES[target] || target) + " — vocabulary"));
    wrap.appendChild(el("p", "study-sub", "Study the words grouped by topic. Your known languages are shown to anchor each one. Tap to drill."));
    const cats = {};
    studyOrder().forEach((id) => { const a = E.byId[id]; const c = a.category || "other"; (cats[c] = cats[c] || []).push(a); });
    Object.keys(cats).forEach((c) => {
      wrap.appendChild(el("div", "study-section", c.charAt(0).toUpperCase() + c.slice(1)));
      cats[c].forEach((a) => {
        const tf = a.forms[target] || {};
        const blk = el("div", "study-block lang-study");
        const head = el("div", "sb-head");
        head.innerHTML = '<span class="sb-title">' + escapeHtml(tf.word || "—") + "</span>" +
          (tf.ipa ? '<span class="sb-ipa">/' + escapeHtml(tf.ipa) + "/</span>" : "") +
          '<span class="sb-gloss">' + escapeHtml(a.gloss || "") + "</span>";
        blk.appendChild(head);
        known.forEach((l) => { const f = a.forms[l]; if (f) blk.appendChild(el("div", "lang-row", '<span class="lang-name">' + escapeHtml(LANG_NAMES[l] || l) + "</span><span class=\"lang-w\">" + escapeHtml(f.word) + "</span>")); });
        if (a.note) blk.appendChild(el("p", "sb-note", escapeHtml(a.note)));
        const drill = el("button", "sb-drill", "Drill this →");
        drill.onclick = () => openAtom(a.id, false);
        blk.appendChild(drill);
        wrap.appendChild(blk);
      });
    });
    wrap.appendChild(nav("study"));
    mount(wrap);
  }

  /* ---------- nucleus map (concentric shells) ---------- */
  function screenMap() {
    const wrap = el("div", "screen map");
    wrap.appendChild(header());
    wrap.appendChild(el("div", "map-help", "The nucleus. Ring = shell · size = leverage · fill = your mastery. Tap a concept."));
    const W = Math.min(window.innerWidth - 24, 680);
    const H = Math.min(W, 560);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("class", "graph");
    const cx = W / 2, cy = H / 2;
    const radii = { prereq: Math.min(W, H) * 0.42, nucleus: Math.min(W, H) * 0.27, frontier: Math.min(W, H) * 0.12 };
    const pos = {};
    ["prereq", "nucleus", "frontier"].forEach((shell) => {
      const items = E.atoms.filter((a) => a.shell === shell).sort((a, b) => b.leverage - a.leverage);
      items.forEach((a, k) => {
        const ang = (k / items.length) * Math.PI * 2 - Math.PI / 2;
        pos[a.id] = { x: cx + Math.cos(ang) * radii[shell], y: cy + Math.sin(ang) * radii[shell] };
      });
    });
    // edges
    E.atoms.forEach((a) => {
      (a.requires || []).forEach((r) => {
        if (pos[a.id] && pos[r]) {
          const line = document.createElementNS(svg.namespaceURI, "line");
          line.setAttribute("x1", pos[r].x); line.setAttribute("y1", pos[r].y);
          line.setAttribute("x2", pos[a.id].x); line.setAttribute("y2", pos[a.id].y);
          line.setAttribute("class", "edge");
          svg.appendChild(line);
        }
      });
    });
    // nodes
    E.atoms.forEach((a) => {
      if (!pos[a.id]) return;
      const m = E.masteryFor(a.id);
      const g = document.createElementNS(svg.namespaceURI, "g");
      g.setAttribute("class", "node shell-" + a.shell + (E.cardFor(a.id) ? " seen" : ""));
      g.setAttribute("transform", "translate(" + pos[a.id].x + "," + pos[a.id].y + ")");
      const rr = 6 + a.leverage * 16;
      const base = document.createElementNS(svg.namespaceURI, "circle");
      base.setAttribute("r", rr); base.setAttribute("class", "node-base");
      const fill = document.createElementNS(svg.namespaceURI, "circle");
      fill.setAttribute("r", rr * Math.max(0.15, m)); fill.setAttribute("class", "node-fill");
      g.appendChild(base); g.appendChild(fill);
      g.onclick = () => openAtom(a.id, true);
      svg.appendChild(g);
    });
    const holder = el("div", "graph-holder");
    holder.appendChild(svg);
    wrap.appendChild(holder);
    wrap.appendChild(nav("map"));
    return wrap;
  }

  /* ---------- progress ---------- */
  function screenProgress() {
    const s = E.summary();
    const wrap = el("div", "screen progress");
    wrap.appendChild(header());
    wrap.appendChild(el("h1", "ph", "Your progress"));
    const grid = el("div", "stats big");
    grid.appendChild(stat("🔥", s.streak, "day streak"));
    grid.appendChild(stat("✦", s.xp, "XP"));
    grid.appendChild(stat("◎", s.introduced + "/" + s.total, "seen"));
    grid.appendChild(stat("★", s.mastered, "mastered"));
    wrap.appendChild(grid);

    // per-shell mastery bars
    ["prereq", "nucleus", "frontier"].forEach((shell) => {
      const items = E.atoms.filter((a) => a.shell === shell);
      if (!items.length) return;
      const m = items.reduce((s, a) => s + E.masteryFor(a.id), 0) / items.length;
      const row = el("div", "bar-row");
      row.innerHTML = '<div class="bar-label">' + SHELL_LABEL[shell] + "</div>";
      const bar = el("div", "bar");
      bar.appendChild(el("div", "fill shell-bar-" + shell, "")).style.width = Math.round(m * 100) + "%";
      row.appendChild(bar);
      row.appendChild(el("div", "bar-pct", Math.round(m * 100) + "%"));
      wrap.appendChild(row);
    });

    // mastery list
    const list = el("div", "mastery-list");
    list.appendChild(el("div", "section-label", "Concepts"));
    E.atoms.slice().sort((a, b) => b.leverage - a.leverage).forEach((a) => {
      const m = E.masteryFor(a.id);
      const row = el("div", "mrow");
      row.innerHTML =
        '<span class="dot shell-dot-' + a.shell + '"></span><span class="mt">' + escapeHtml(a.title) +
        '</span><span class="mbar"><i style="width:' + Math.round(m * 100) + '%"></i></span>';
      row.onclick = () => openAtom(a.id, true);
      list.appendChild(row);
    });
    wrap.appendChild(list);

    const settings = el("div", "settings");
    settings.appendChild(el("div", "section-label", "Settings"));
    const npd = el("label", "set-row", "New concepts / day");
    const inp = el("input"); inp.type = "number"; inp.min = 1; inp.max = 20; inp.value = E.state.settings.newPerDay;
    inp.onchange = () => { E.state.settings.newPerDay = Math.max(1, Math.min(20, +inp.value || 4)); E.save(); };
    npd.appendChild(inp);
    settings.appendChild(npd);
    const rr = el("label", "set-row", "Exam-sprint (90%→95% retention)");
    const sw = el("input"); sw.type = "checkbox"; sw.checked = (E.state.settings.requestRetention || 0.9) >= 0.95;
    sw.onchange = () => { E.state.settings.requestRetention = sw.checked ? 0.95 : 0.9; E.save(); };
    rr.appendChild(sw); settings.appendChild(rr);

    // language branch: choose target + known languages
    if (isLang()) {
      const { target, known, langs } = langSettings();
      const tRow = el("label", "set-row", "Language I'm learning");
      const tSel = el("select", "lang-sel");
      langs.forEach((l) => {
        const o = el("option", null, LANG_NAMES[l] || l); o.value = l; if (l === target) o.selected = true; tSel.appendChild(o);
      });
      tSel.onchange = () => {
        const nt = tSel.value;
        const nk = (langSettings().known || []).filter((l) => l !== nt);
        setLangPref(nt, nk.length ? nk : langs.filter((l) => l !== nt).slice(0, 1));
        go("progress");
      };
      tRow.appendChild(tSel); settings.appendChild(tRow);

      settings.appendChild(el("div", "set-hint", "Languages I already know (used as hints + reinforcement):"));
      const kWrap = el("div", "lang-known");
      langs.filter((l) => l !== target).forEach((l) => {
        const on = known.includes(l);
        const chip = el("button", "lang-chip" + (on ? " on" : ""), escapeHtml(LANG_NAMES[l] || l));
        chip.onclick = () => {
          let nk = (langSettings().known || []).slice();
          nk = nk.includes(l) ? nk.filter((x) => x !== l) : nk.concat(l);
          if (!nk.length) nk = [l];
          setLangPref(target, nk);
          go("progress");
        };
        kWrap.appendChild(chip);
      });
      settings.appendChild(kWrap);
    }

    const reset = el("button", "btn ghost wide danger", "Reset all progress");
    reset.onclick = () => { if (confirm("Erase all learning progress?")) { E.reset(); go("home"); } };
    settings.appendChild(reset);
    wrap.appendChild(settings);

    wrap.appendChild(nav("progress"));
    return wrap;
  }

  /* ---------- router ---------- */
  function mount(node) {
    const root = $("#app");
    root.innerHTML = "";
    root.appendChild(node);
  }
  let currentScreen = "home";
  function go(where) {
    currentScreen = where;
    if (where === "home") mount(screenHome());
    else if (where === "study") screenStudy();
    else if (where === "map") mount(screenMap());
    else if (where === "progress") mount(screenProgress());
    window.scrollTo(0, 0);
  }

  // Called by auth-ui after a sign-in/sync merges server progress into
  // localStorage. Reload the engine's in-memory state from the merged blob and
  // re-render the current screen so streak/XP/schedule reflect the merge.
  // Only refresh when we are NOT mid-study-session (don't yank a card away).
  window.__BA_onAuthSync = function () {
    if (session) return;
    if (!E || !E.lsKey) return;
    try { E._loadState(); } catch (e) {}
    if (currentScreen === "home" || currentScreen === "map" || currentScreen === "progress")
      go(currentScreen);
  };

  async function boot() {
    // optional deep link: ?branch=<id>&atom=<id>
    let params = null;
    try { params = new URLSearchParams(location.search); } catch (e) {}
    if (params) {
      const bParam = params.get("branch");
      if (bParam) { const m = BRANCHES.find((b) => b.file.includes(bParam)); if (m) currentBranchFile = m.file; }
    }
    try {
      await E.load(currentBranchFile);
      normalizeAtoms();
    } catch (e) {
      $("#app").innerHTML = '<div class="screen"><div class="hero"><h1>Corpus failed to load</h1><p class="sub">Run via a local server: <code>./serve.sh</code></p></div></div>';
      return;
    }
    window.__BA = E; // debug handle
    go("home");
    if (params) {
      if (params.get("view") === "study") go("study");
      const aParam = params.get("atom");
      if (aParam && E.byId[aParam]) openAtom(aParam, true);
    }
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
