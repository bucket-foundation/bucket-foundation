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

  // Available branches (corpora). The picker is now data-driven: built-in decks are
  // LOADED from corpus/index.json at boot (see loadManifest()), and user-created decks
  // (any topic / any language, generated on demand) are merged in from BucketLibrary.
  // Adding a built-in deck = drop a corpus file + a manifest entry. BRANCHES is mutable
  // and rebuilt by refreshBranches(); BUILTIN_FALLBACK is used only if the fetch fails.
  const BRANCH_PREF_KEY = "bucket-academy/branch";
  const DEFAULT_BRANCH = "corpus/biophysics.json";
  const BUILTIN_FALLBACK = [
    { id: "01-mathematics", file: "corpus/01-mathematics.json", pill: "I · Mathematics", sub: "The foundations of reasoning" },
    { id: "02-physics", file: "corpus/02-physics.json", pill: "II · Physics", sub: "Matter, energy & spacetime" },
    { id: "03-chemistry", file: "corpus/03-chemistry.json", pill: "III · Chemistry", sub: "Matter, bonds & transformation" },
    { id: "04-information", file: "corpus/04-information.json", pill: "IV · Information", sub: "Entropy, computation & complexity" },
    { id: "05-biophysics", file: "corpus/biophysics.json", pill: "V · Biophysics", sub: "Energy, matter & life" },
    { id: "06-cosmology", file: "corpus/06-cosmology.json", pill: "VI · Cosmology", sub: "The universe at large" },
    { id: "07-mind", file: "corpus/07-mind.json", pill: "VII · Mind", sub: "Brains, computation & cognition" },
    { id: "lang-core", file: "corpus/lang-core.json", pill: "✺ · Languages", sub: "Learn a language through the ones you know", kind: "language", languages: ["en", "es", "fr", "it", "pt", "de", "la"] },
  ];
  let BUILTINS = BUILTIN_FALLBACK.slice(); // populated from manifest at boot
  let BRANCHES = BUILTIN_FALLBACK.slice(); // built-ins + user decks; rebuilt by refreshBranches()

  // Load the built-in deck manifest. Falls back to the baked-in list on any failure
  // so the app always boots even offline / if corpus/index.json is missing.
  async function loadManifest() {
    try {
      const res = await fetch("corpus/index.json", { cache: "no-store" });
      const data = await res.json();
      const decks = (data && data.decks) || [];
      if (decks.length) BUILTINS = decks.map((d) => Object.assign({}, d));
    } catch (e) {
      BUILTINS = BUILTIN_FALLBACK.slice();
    }
    refreshBranches();
  }

  // Rebuild BRANCHES = built-ins + the user's custom decks (each given a synthetic
  // `file`-less record carrying its in-memory corpus `data`). Custom decks render in
  // the picker with a delete control.
  function refreshBranches() {
    const custom = (window.BucketLibrary ? window.BucketLibrary.list() : []).map((d) => ({
      id: d.id,
      file: null,
      data: d.data,
      pill: d.pill,
      sub: d.sub,
      kind: d.kind,
      languages: d.languages,
      generated: true,
    }));
    BRANCHES = BUILTINS.concat(custom);
  }

  // Find a branch record by its current selection key (file for built-ins, id for customs).
  function findBranch(key) {
    return BRANCHES.find((b) => (b.file ? b.file === key : b.id === key));
  }
  function branchKey(b) {
    return b.file || b.id;
  }
  function currentBranch() {
    return findBranch(currentBranchFile) || BRANCHES[0];
  }
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
  let diag = null;    // active placement-diagnostic session ({d, item, revealed})
  let currentScreen = "home"; // last routed screen (for post-sync re-render)

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

  // Render a markdown lesson to HTML (marked if loaded; minimal fallback otherwise).
  function mdToHtml(src) {
    src = String(src || "");
    if (window.marked && window.marked.parse) {
      try { return window.marked.parse(src, { breaks: false, mangle: false, headerIds: false }); } catch (e) {}
    }
    // fallback: headings, bold, lists, paragraphs (math left for KaTeX)
    return src.split(/\n{2,}/).map((blk) => {
      const t = blk.trim();
      const h = t.match(/^#{1,6}\s+(.*)$/);
      if (h) return "<h3>" + escapeHtml(h[1]) + "</h3>";
      if (/^[-*]\s+/m.test(t)) return "<ul>" + t.split(/\n/).map((li) => "<li>" + escapeHtml(li.replace(/^[-*]\s+/, "")) + "</li>").join("") + "</ul>";
      return "<p>" + escapeHtml(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") + "</p>";
    }).join("");
  }

  // Build-time procedural-art cache (art/cache/<branch>.json), loaded per branch.
  // Deterministic SVG keyed on hash(atomId) — the load-bearing-art anchor. We prefer
  // the cached bytes (inspectable, SVGO'd at build) and fall back to live generation.
  let artCache = {};
  async function loadArtCache() {
    artCache = {};
    const branch = (E.meta && E.meta.branch) || "default";
    try {
      const res = await fetch("art/cache/" + branch + ".json", { cache: "force-cache" });
      if (res.ok) artCache = await res.json();
    } catch (e) {}
  }

  function artFor(atom) {
    const c = artCache[atom.id];
    if (c && c.svg) return c;
    if (window.BucketArt) return window.BucketArt.svgFor(atom);
    return null;
  }

  function artCard(atom) {
    // Load-bearing concept anchor: a deterministic, build-time-generated procedural SVG
    // that DEPICTS the concept (equation → real plotted curve; mechanism/concept →
    // constrained on-brand schematic). Crisp, tiny, offline, alt-texted. No diffusion.
    const card = el("div", "art has-fig shell-" + atom.shell);
    const fig = artFor(atom);
    let figHtml = "";
    if (fig && fig.svg) figHtml = '<div class="art-fig">' + fig.svg + "</div>";
    else if (atom.equation) figHtml = '<div class="art-eq">$$' + atom.equation + "$$</div>";
    card.innerHTML =
      '<div class="art-badge">' + SHELL_LABEL[atom.shell] + "</div>" +
      figHtml +
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
    const dueReviews = route.filter((r) => r.kind === "review");
    const next = studyOrder().filter((id) => !E.cardFor(id)); // not-yet-drilled, in order
    const wrap = el("div", "screen home");
    wrap.appendChild(header());

    const hero = el("div", "hero");
    const curBranch = currentBranch();
    const branchName = curBranch.pill.replace(/^\S+ · /, "");
    hero.appendChild(el("div", "kicker", branchName + " · learn"));
    hero.appendChild(el("h1", null, next.length ? "Keep learning." : "You've covered it all. 🎉"));
    hero.appendChild(el("p", "sub",
      s.introduced + " of " + s.total + " concepts started" +
      (dueReviews.length ? " · " + dueReviews.length + " due to review" : "")));
    const studyCta = el("button", "btn primary", "📖 Study & learn →");
    studyCta.onclick = () => go("study");
    hero.appendChild(studyCta);
    if (dueReviews.length) {
      const rev = el("button", "btn ghost hero-study", "Review " + dueReviews.length + " due →");
      rev.onclick = () => startSession(dueReviews);
      hero.appendChild(rev);
    }
    wrap.appendChild(hero);

    // Placement diagnostic entry — most prominent on a fresh branch (nothing started),
    // but always available. Honest framing: a starting estimate, fully skippable.
    if (!isLang() && typeof window.Diagnostic === "function" && s.introduced === 0) {
      const cta = el("button", "place-cta",
        '<span class="pc-ico">✶</span>' +
        '<span class="pc-copy"><span class="pc-title">Know some of this already?</span>' +
        '<span class="pc-sub">Answer a few questions and we\'ll place you on the graph.</span></span>' +
        '<span class="pc-go">→</span>');
      cta.onclick = () => go("diagnostic");
      wrap.appendChild(cta);
    }

    const stats = el("div", "stats");
    stats.appendChild(stat("🔥", s.streak, "day streak"));
    stats.appendChild(stat("✦", s.xp, "XP"));
    stats.appendChild(stat("◎", s.introduced + "/" + s.total, "started"));
    stats.appendChild(stat("★", s.mastered, "mastered"));
    wrap.appendChild(stats);

    // Continue learning — next concepts in learning order, NO daily cap. Always something.
    if (next.length) {
      const list = el("div", "route-list");
      list.appendChild(el("div", "section-label", "Continue learning"));
      next.slice(0, 8).forEach((id) => {
        const a = E.byId[id];
        const row = el("div", "route-row");
        row.appendChild(el("span", "dot shell-dot-" + a.shell));
        row.appendChild(el("span", "rtitle", escapeHtml(a.title)));
        row.appendChild(el("span", "rtag new", "learn"));
        row.onclick = () => openAtom(a.id, true);
        list.appendChild(row);
      });
      wrap.appendChild(list);
    } else if (dueReviews.length) {
      const list = el("div", "route-list");
      list.appendChild(el("div", "section-label", "Due for review"));
      dueReviews.slice(0, 8).forEach((r) => {
        const a = E.byId[r.id];
        const row = el("div", "route-row");
        row.appendChild(el("span", "dot shell-dot-" + a.shell));
        row.appendChild(el("span", "rtitle", escapeHtml(a.title)));
        row.appendChild(el("span", "rtag", "review"));
        row.onclick = () => openAtom(a.id, false);
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
    const cur = currentBranch();
    h.innerHTML =
      '<div class="brand">Bucket <span>Academy</span></div>' +
      '<button class="branch-pill" id="branchPill" title="Switch branch">' +
      cur.pill +
      ' <span class="branch-caret">▾</span></button>';
    h.querySelector("#branchPill").onclick = openBranchPicker;
    // Optional sign-in / "Save progress" control (bkt-su9). No-op when auth is
    // disabled (empty auth-config) — keeps anonymous local-first use intact.
    if (window.BucketAuthUI) {
      try { window.BucketAuthUI.mountInto(h); } catch (e) {}
    }
    return h;
  }

  function openBranchPicker() {
    refreshBranches();
    const back = el("div", "sheet-back");
    const sheet = el("div", "sheet");
    sheet.innerHTML = '<div class="sheet-title">Choose a branch</div>';

    function addRow(b) {
      const key = branchKey(b);
      const on = key === currentBranchFile;
      const row = el(
        "div",
        "branch-row" + (on ? " on" : "") + (b.generated ? " generated" : "")
      );
      const main = el(
        "button",
        "branch-row-main",
        '<span class="branch-row-name">' + escapeHtml(b.pill) +
          (b.generated ? ' <span class="branch-tag">created</span>' : "") + "</span>" +
          '<span class="branch-row-sub">' + escapeHtml(b.sub || "") + "</span>"
      );
      main.onclick = () => {
        back.remove();
        if (key !== currentBranchFile) switchBranch(key);
      };
      row.appendChild(main);
      if (b.generated) {
        const del = el("button", "branch-row-del", "🗑");
        del.title = "Delete this deck";
        del.onclick = (e) => {
          e.stopPropagation();
          if (!confirm("Delete “" + (b.pill || b.id) + "”? This removes the deck and its progress on this device.")) return;
          if (window.BucketLibrary) window.BucketLibrary.remove(b.id);
          if (key === currentBranchFile) {
            // fell out from under us — jump back to the default built-in
            currentBranchFile = DEFAULT_BRANCH;
            try { localStorage.setItem(BRANCH_PREF_KEY, currentBranchFile); } catch (er) {}
            back.remove();
            switchBranch(currentBranchFile);
            return;
          }
          back.remove();
          openBranchPicker();
        };
        row.appendChild(del);
      }
      sheet.appendChild(row);
    }

    BUILTINS.forEach(addRow);
    const customs = BRANCHES.filter((b) => b.generated);
    if (customs.length) {
      sheet.appendChild(el("div", "sheet-sub", "Your topics"));
      customs.forEach(addRow);
    }

    // ✦ New… — generate ANY topic or ANY language on demand.
    const create = el("button", "branch-row create-row",
      '<span class="branch-row-name">✦ New topic or language…</span>' +
      '<span class="branch-row-sub">Generate a deck for anything you want to learn</span>');
    create.onclick = () => { back.remove(); openCreateSheet(); };
    sheet.appendChild(create);

    back.appendChild(sheet);
    back.onclick = (e) => {
      if (e.target === back) back.remove();
    };
    document.body.appendChild(back);
  }

  // Load a branch by selection key. Built-ins fetch their file; custom decks load
  // their in-memory corpus via Engine.loadData (no network, namespaced by deck id).
  async function switchBranch(key) {
    const b = findBranch(key);
    currentBranchFile = key;
    try {
      localStorage.setItem(BRANCH_PREF_KEY, key);
    } catch (e) {}
    session = null;
    try {
      if (b && b.file) {
        await E.load(b.file);
      } else if (b && b.data) {
        E.loadData(b.data, b.id);
      } else {
        throw new Error("unknown branch " + key);
      }
      normalizeAtoms();
      await loadArtCache();
    } catch (e) {
      $("#app").innerHTML =
        '<div class="screen"><div class="hero"><h1>Corpus failed to load</h1><p class="sub">Run via a local server: <code>./serve.sh</code></p></div></div>';
      return;
    }
    go("home");
  }

  /* ---------- create ANY topic / ANY language ---------- */
  // Languages offered for the polyglot generator. Covers the built-in set plus a few
  // common targets; the generate route accepts free-text too, but a curated list keeps
  // the form tidy and the schema's `forms` keys predictable.
  const CREATE_LANGS = [
    ["en", "English"], ["es", "Spanish"], ["fr", "French"], ["it", "Italian"],
    ["pt", "Portuguese"], ["de", "German"], ["la", "Latin"], ["nl", "Dutch"],
    ["sv", "Swedish"], ["ru", "Russian"], ["pl", "Polish"], ["ja", "Japanese"],
    ["zh", "Mandarin Chinese"], ["ko", "Korean"], ["ar", "Arabic"], ["hi", "Hindi"],
    ["el", "Greek"], ["tr", "Turkish"], ["he", "Hebrew"], ["vi", "Vietnamese"],
  ];

  function openCreateSheet() {
    const back = el("div", "sheet-back");
    const sheet = el("div", "sheet create-sheet");
    sheet.innerHTML =
      '<div class="sheet-title">Create a new deck</div>' +
      '<div class="sheet-sub">Bucket generates an original, foundations-first deck. Cite-real-sources, no marketing fluff.</div>';

    // mode toggle: topic vs language
    const modeRow = el("div", "create-modes");
    let mode = "topic";
    const topicBtn = el("button", "create-mode on", "📚 Topic");
    const langBtn = el("button", "create-mode", "✺ Language");
    modeRow.appendChild(topicBtn);
    modeRow.appendChild(langBtn);
    sheet.appendChild(modeRow);

    const formHost = el("div", "create-form-host");
    sheet.appendChild(formHost);

    function renderTopic() {
      formHost.innerHTML = "";
      const f = el("div", "create-form");
      f.appendChild(el("label", "create-label", "What do you want to learn?"));
      const topic = el("input", "create-input");
      topic.type = "text";
      topic.placeholder = "e.g. Linear algebra, Roman history, Music theory…";
      topic.maxLength = 80;
      f.appendChild(topic);

      f.appendChild(el("label", "create-label", "Depth"));
      const lvl = el("select", "create-input");
      [["intro", "Intro — gentle, zero assumed background"],
       ["standard", "Standard — a solid working foundation"],
       ["advanced", "Advanced — rigorous, derivation-heavy"]].forEach(([v, lbl]) => {
        const o = el("option", null, lbl); o.value = v; lvl.appendChild(o);
      });
      lvl.value = "standard";
      f.appendChild(lvl);

      const go = el("button", "btn primary wide", "Generate deck →");
      go.onclick = () => {
        const t = (topic.value || "").trim();
        if (!t) { topic.focus(); topic.classList.add("err"); return; }
        runGenerate(back, { kind: "topic", topic: t, level: lvl.value });
      };
      f.appendChild(go);
      formHost.appendChild(f);
      topic.focus();
    }

    function renderLang() {
      formHost.innerHTML = "";
      const f = el("div", "create-form");
      f.appendChild(el("label", "create-label", "Language you want to learn"));
      const target = el("select", "create-input");
      CREATE_LANGS.forEach(([code, name]) => {
        const o = el("option", null, name); o.value = code; target.appendChild(o);
      });
      target.value = "es";
      f.appendChild(target);

      f.appendChild(el("label", "create-label", "Languages you already know (used as anchors)"));
      const known = el("div", "lang-known create-known");
      const chosen = new Set(["en"]);
      function paintChips() {
        known.innerHTML = "";
        CREATE_LANGS.forEach(([code, name]) => {
          if (code === target.value) return;
          const on = chosen.has(code);
          const chip = el("button", "lang-chip" + (on ? " on" : ""), escapeHtml(name));
          chip.onclick = () => {
            if (chosen.has(code)) chosen.delete(code); else chosen.add(code);
            if (!chosen.size) chosen.add(code);
            paintChips();
          };
          known.appendChild(chip);
        });
      }
      target.onchange = () => { chosen.delete(target.value); if (!chosen.size) chosen.add("en"); paintChips(); };
      paintChips();
      f.appendChild(known);

      const go = el("button", "btn primary wide", "Generate deck →");
      go.onclick = () => {
        const t = target.value;
        const knownArr = Array.from(chosen).filter((c) => c !== t);
        if (!knownArr.length) knownArr.push("en");
        runGenerate(back, { kind: "language", target: t, known: knownArr });
      };
      f.appendChild(go);
      formHost.appendChild(f);
    }

    topicBtn.onclick = () => { mode = "topic"; topicBtn.classList.add("on"); langBtn.classList.remove("on"); renderTopic(); };
    langBtn.onclick = () => { mode = "language"; langBtn.classList.add("on"); topicBtn.classList.remove("on"); renderLang(); };
    renderTopic();

    back.appendChild(sheet);
    back.onclick = (e) => { if (e.target === back) back.remove(); };
    document.body.appendChild(back);
  }

  // POST to the Next API generate route, store the deck, and load it.
  async function runGenerate(back, req) {
    const sheet = back.querySelector(".create-sheet");
    sheet.innerHTML =
      '<div class="sheet-title">Generating…</div>' +
      '<div class="sheet-sub">Building an original deck for you. This can take 20–40 seconds.</div>' +
      '<div class="gen-spinner">✦</div>';
    let data;
    try {
      const res = await fetch("/api/academy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        let msg = "Generation failed (" + res.status + ").";
        try { const j = await res.json(); if (j && j.error) msg = j.error; } catch (e) {}
        throw new Error(msg);
      }
      data = await res.json();
    } catch (e) {
      sheet.innerHTML =
        '<div class="sheet-title">Couldn’t generate</div>' +
        '<div class="sheet-sub gen-err">' + escapeHtml(e.message || "Unknown error") + "</div>";
      const retry = el("button", "btn ghost wide", "Back");
      retry.onclick = () => { back.remove(); openCreateSheet(); };
      sheet.appendChild(retry);
      return;
    }

    // data = { meta, atoms }. Wrap as a library record.
    const deck = normalizeGenerated(data, req);
    if (!deck) {
      sheet.innerHTML =
        '<div class="sheet-title">Couldn’t generate</div>' +
        '<div class="sheet-sub gen-err">The generated deck was empty or malformed. Please try again.</div>';
      const r = el("button", "btn ghost wide", "Back");
      r.onclick = () => { back.remove(); openCreateSheet(); };
      sheet.appendChild(r);
      return;
    }
    if (window.BucketLibrary) window.BucketLibrary.save(deck);
    refreshBranches();
    back.remove();
    switchBranch(deck.id);
  }

  // Turn a generate-route payload into a persisted library record (with a stable id,
  // picker pill/sub, and a clean meta.branch namespace). Defensive against partial output.
  function normalizeGenerated(data, req) {
    const atoms = (data && data.atoms) || [];
    if (!atoms.length) return null;
    const isLangDeck = (data.meta && data.meta.kind === "language") || req.kind === "language";
    const taken = BUILTINS.map((b) => b.id);
    let title, pill, sub;
    if (isLangDeck) {
      const tName = (LANG_NAMES[req.target] || (CREATE_LANGS.find((l) => l[0] === req.target) || [])[1] || req.target);
      title = tName + " — vocabulary";
      pill = "✺ · " + tName;
      sub = "Polyglot deck · " + atoms.length + " words";
    } else {
      title = (data.meta && data.meta.title) || req.topic;
      pill = "✦ · " + req.topic;
      sub = (req.level ? req.level.charAt(0).toUpperCase() + req.level.slice(1) + " · " : "") + atoms.length + " concepts";
    }
    const slug = isLangDeck ? "lang-" + (req.target || "x") : (req.topic || "topic");
    const id = window.BucketLibrary ? window.BucketLibrary.makeId(slug, taken)
      : "user:" + Date.now();
    const meta = Object.assign({}, data.meta || {}, {
      branch: id, // namespace FSRS/progress under the deck id
      title,
      generated: true,
    });
    if (isLangDeck) {
      meta.kind = "language";
      if (!Array.isArray(meta.languages) || !meta.languages.length) {
        meta.languages = [req.target].concat(req.known || []).filter(Boolean);
      }
    }
    return {
      id,
      file: null,
      pill,
      sub,
      kind: isLangDeck ? "language" : undefined,
      languages: isLangDeck ? meta.languages : undefined,
      generated: true,
      createdAt: Date.now(),
      data: { meta, atoms },
    };
  }

  function nav(active) {
    const n = el("div", "tabbar");
    [["home", "◎", "Learn"], ["map", "✸", "Map"], ["progress", "▰", "Progress"]].forEach(([k, i, l]) => {
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
    else { const cont = el("button", "btn primary wide", "Got it →"); cont.onclick = () => { if (!E.cardFor(id)) E.grade(id, 3, "recall"); go("home"); }; wrap.appendChild(cont); }
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
      b.onclick = () => { if (window.haptic) haptic(g === 1 ? "wrong" : g >= 3 ? "correct" : "tap"); E.grade(a.id, g, "recall"); next(); };
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
      cont.onclick = () => { if (!E.cardFor(id)) E.grade(id, 3, level || "recall"); go("home"); };
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

  // laurel checkmark that draws itself in (transform/opacity-safe stroke animation)
  function checkmarkSVG() {
    return (
      '<svg class="fb-check" viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">' +
      '<circle class="fb-ring" cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="3"/>' +
      '<path class="fb-tick" d="M14 25 L21 32 L35 16" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>"
    );
  }

  function drill(atom, q, level) {
    const box = el("div", "drill");
    box.appendChild(el("div", "drill-label", "Retrieve · " + level));
    box.appendChild(el("div", "q", q.prompt));
    const answer = el("div", "answer hidden");
    answer.innerHTML = "<div class='a-label'>Answer</div><div class='a-text'>" + q.answer + "</div>";
    const reveal = el("button", "btn wide", "Show answer");
    const feedback = el("div", "fb hidden"); // feedback choreography lands here
    reveal.onclick = () => {
      answer.classList.remove("hidden");
      reveal.classList.add("hidden");
      rate.classList.remove("hidden");
      if (window.haptic) haptic("tap");
      katex(answer);
    };
    const rate = el("div", "rate hidden");
    [[1, "Again", "again"], [2, "Hard", "hard"], [3, "Good", "good"], [4, "Easy", "easy"]].forEach(([g, lbl, cls]) => {
      const b = el("button", "rbtn " + cls, lbl);
      b.onclick = () => {
        // Feedback choreography (never red): a low grade = an amber, named nudge + soft
        // double-tap haptic; a confident grade = a laurel checkmark draw + correct haptic.
        if (g === 1) {
          if (window.haptic) haptic("wrong");
          const note = (atom.note && atom.note.length < 220)
            ? atom.note
            : "Re-read the answer above before moving on — the gap is worth a second look.";
          feedback.className = "fb wrong";
          feedback.innerHTML =
            '<span class="fb-mark">↺</span><span class="fb-text"><b>Worth another pass.</b> ' +
            escapeHtml(note) + "</span>";
          katex(feedback);
          box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake");
          // brief beat so the learner reads the nudge, then advance
          setTimeout(() => { E.grade(atom.id, g, level); next(); }, 1150);
        } else {
          if (window.haptic) haptic(g >= 3 ? "correct" : "tap");
          feedback.className = "fb right";
          feedback.innerHTML = '<span class="fb-mark laurel">' + checkmarkSVG() + "</span>" +
            '<span class="fb-text">' + (g >= 4 ? "Locked in." : g >= 3 ? "Good recall." : "Noted — we'll bring it back sooner.") + "</span>";
          rate.classList.add("hidden");
          setTimeout(() => { E.grade(atom.id, g, level); next(); }, g >= 3 ? 620 : 420);
        }
      };
      rate.appendChild(b);
    });
    box.appendChild(el("div", "q-eq", q.eq ? "$$" + q.eq + "$$" : ""));
    box.appendChild(reveal);
    box.appendChild(answer);
    box.appendChild(rate);
    box.appendChild(feedback);
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
      // stash the highest-leverage atom we just touched so the map can animate its
      // unlock + draw the leverage edges when the learner taps through to it.
      const studied = session.queue.map((q) => E.byId[q.id]).filter(Boolean);
      const lead = studied.sort((a, b) => (b.leverage || 0) - (a.leverage || 0))[0];
      if (lead && (lead.unlocks || []).length) pendingUnlock = { id: lead.id, unlocks: lead.unlocks.slice(0, 8) };
      session = null;
      return mount(screenDone());
    }
    renderAtom(session.queue[session.i].id, false);
    window.scrollTo(0, 0);
  }

  function screenDone() {
    const s = E.summary();
    if (window.haptic) haptic("celebrate");
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
  let studyDepth = "lesson";

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
    const cur = currentBranch();
    wrap.appendChild(el("h1", "study-h1", cur.pill.replace(/^\S+ · /, "")));
    wrap.appendChild(el("p", "study-sub", "Read straight through — foundations first. Switch depth any time; tap a concept to drill it."));

    // global depth toggle — full Lesson by default, with quick-blurb depths
    const hasLessons = E.atoms.some((x) => x.lesson);
    const tabs = el("div", "depth-tabs study-depth");
    const opts = hasLessons ? [["lesson", "Lesson"], ["eli5", "Plain"], ["core", "Core"], ["deep", "Deep"]] : [["eli5", "Plain"], ["core", "Core"], ["deep", "Deep"]];
    if (studyDepth === "lesson" && !hasLessons) studyDepth = "core";
    opts.forEach(([k, lbl]) => {
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
      const blk = el("div", "study-block reveal-up shell-edge-" + a.shell);
      if (a.equation || (a.note && studyDepth !== "eli5")) blk.dataset.math = "1";
      const head = el("div", "sb-head");
      head.innerHTML = '<span class="sb-num">' + (i + 1) + "</span><span class=\"sb-title\">" + escapeHtml(a.title) + "</span>";
      const m = E.masteryFor(id);
      if (E.cardFor(id)) head.appendChild(el("span", "sb-mastery" + (m >= 0.7 ? " on" : ""), m >= 0.7 ? "✓ known" : "seen"));
      blk.appendChild(head);
      if (studyDepth === "lesson" && a.lesson) {
        // full markdown lesson (the thorough read)
        blk.appendChild(el("div", "sb-lesson", mdToHtml(a.lesson)));
      } else {
        const txt = (a.depths && a.depths[studyDepth]) || a.summary || "";
        blk.appendChild(el("p", "sb-text", escapeHtml(txt)));
        if (a.equation) { const eq = el("div", "eqbox", "$$" + a.equation + "$$"); blk.appendChild(eq); }
        if (a.note && studyDepth !== "eli5") blk.appendChild(el("p", "sb-note", escapeHtml(a.note)));
      }
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
    revealAndRender(wrap, ".study-block");
  }

  // Stagger fade-up on scroll reveal + render KaTeX per visible block (once). This is
  // the app's biggest INP/scroll win: no full-tree KaTeX, no off-screen layout cost.
  function revealAndRender(wrap, sel) {
    const blocks = Array.prototype.slice.call(wrap.querySelectorAll(sel));
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window)) {
      blocks.forEach((b) => { b.classList.add("in"); if (b.dataset.math) katex(b); });
      return;
    }
    let shown = 0;
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const b = en.target;
        if (!reduce) { b.style.transitionDelay = Math.min(shown, 4) * 40 + "ms"; shown++; }
        b.classList.add("in");
        if (b.dataset.math) katex(b); // lazy, per-visible-block
        obs.unobserve(b);
      });
    }, { rootMargin: "120px 0px", threshold: 0.01 });
    blocks.forEach((b) => io.observe(b));
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
        const blk = el("div", "study-block lang-study reveal-up");
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
    revealAndRender(wrap, ".study-block");
  }

  /* ---------- nucleus map (concentric shells) ---------- */
  // when a route completes we stash the just-unlocked nodes so the map can animate them
  let pendingUnlock = null; // { id, unlocks:[ids] }

  const SVGNS = "http://www.w3.org/2000/svg";
  function svgEl(name, attrs) {
    const n = document.createElementNS(SVGNS, name);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function screenMap() {
    const wrap = el("div", "screen map");
    wrap.appendChild(header());
    const help = el("div", "map-help", "The nucleus. Ring = shell · size = leverage · fill = your mastery. Tap a concept to see its neighborhood.");
    wrap.appendChild(help);
    const W = Math.min(window.innerWidth - 24, 680);
    const H = Math.min(W, 560);
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

    const holder = el("div", "graph-holder");
    const svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "graph" });

    // faint shell rings for structure
    ["prereq", "nucleus", "frontier"].forEach((shell) => {
      svg.appendChild(svgEl("circle", { cx, cy, r: radii[shell], class: "ring-guide" }));
    });

    // edges
    E.atoms.forEach((a) => {
      (a.requires || []).forEach((r) => {
        if (pos[a.id] && pos[r]) {
          svg.appendChild(svgEl("line", {
            x1: pos[r].x, y1: pos[r].y, x2: pos[a.id].x, y2: pos[a.id].y,
            class: "edge", "data-from": r, "data-to": a.id,
          }));
        }
      });
    });

    // nodes
    E.atoms.forEach((a) => {
      if (!pos[a.id]) return;
      const m = E.masteryFor(a.id);
      const g = svgEl("g", {
        class: "node shell-" + a.shell + (E.cardFor(a.id) ? " seen" : ""),
        transform: "translate(" + pos[a.id].x + "," + pos[a.id].y + ")",
        "data-id": a.id, tabindex: "0", role: "button",
        "aria-label": a.title + (E.cardFor(a.id) ? " (started)" : " (locked)"),
      });
      const rr = 6 + a.leverage * 16;
      g.appendChild(svgEl("circle", { r: rr, class: "node-base" }));
      g.appendChild(svgEl("circle", { r: rr * Math.max(0.15, m), class: "node-fill" }));
      const open = () => { if (window.haptic) haptic("select"); openNeighborhood(a.id); };
      g.onclick = open;
      g.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };
      svg.appendChild(g);
    });
    holder.appendChild(svg);
    wrap.appendChild(holder);
    wrap.appendChild(nav("map"));

    // celebration pass: animate the just-unlocked node + draw edges to what it unlocks
    if (pendingUnlock) {
      const pu = pendingUnlock; pendingUnlock = null;
      requestAnimationFrame(() => animateUnlock(svg, pu, help));
    }
    return wrap;
  }

  /* ---------- share your public Mastery Profile (bkt-coh) ---------- */
  // Opt-in, signed-in-only. Lets a learner claim a handle, make the profile
  // public (default private), and copy the public link bucket.foundation/m/<h>.
  // Honest-signal framing: an evolving learning record, not a certified score.
  function shareProfileSection() {
    const box = el("div", "share-profile");
    const Auth = window.BucketAuth;
    box.appendChild(el("div", "section-label", "Share your Mastery Profile"));

    // Auth disabled (no backend) — nothing to share.
    if (!Auth || !Auth.enabled) {
      box.appendChild(el("p", "share-hint", "Sign-in isn't configured here, so a public profile isn't available."));
      return box;
    }
    const s = Auth.state();
    if (!s.signedIn) {
      box.appendChild(el("p", "share-hint",
        "Your public profile is the map of what you've mastered — a learning record you build by learning. Sign in (top right · “Save progress”) to claim your handle."));
      return box;
    }

    const body = el("div", "share-body");
    body.appendChild(el("p", "share-hint", "Loading your profile…"));
    box.appendChild(body);

    function render(rec) {
      body.innerHTML = "";
      const origin = (window.location && window.location.origin) || "https://bucket.foundation";
      const handle = rec && rec.handle ? rec.handle : "";
      const isPublic = !!(rec && rec.isPublic);

      // handle input + claim/save
      const form = el("form", "share-form");
      const label = el("label", "share-label", handle ? "Your handle" : "Claim a handle");
      const inWrap = el("div", "share-handle-row");
      inWrap.appendChild(el("span", "share-prefix", "/m/"));
      const input = el("input", "share-input");
      input.type = "text";
      input.placeholder = "your-handle";
      input.value = handle;
      input.maxLength = 32;
      input.autocapitalize = "off";
      input.autocomplete = "off";
      input.spellcheck = false;
      inWrap.appendChild(input);
      form.appendChild(label);
      form.appendChild(inWrap);
      const err = el("div", "share-err hidden");
      form.appendChild(err);
      const save = el("button", "btn primary wide", handle ? "Update handle" : "Claim handle");
      save.type = "submit";
      form.appendChild(save);
      form.onsubmit = (e) => {
        e.preventDefault();
        const h = (input.value || "").trim().toLowerCase();
        if (!h) return;
        err.classList.add("hidden");
        save.disabled = true; save.textContent = "Saving…";
        Auth.setProfile({ handle: h })
          .then((r) => { render((r && r.profile) || { handle: h, isPublic: isPublic }); })
          .catch((ex) => {
            save.disabled = false; save.textContent = handle ? "Update handle" : "Claim handle";
            let msg = (ex && ex.message) || "Couldn't save that handle.";
            if (ex && ex.code === "handle_taken") msg = "That handle is taken — try another.";
            else if (ex && ex.code === "invalid_handle") msg = "3–32 chars: lowercase letters, numbers, and single internal - or _.";
            err.textContent = msg; err.classList.remove("hidden");
          });
      };
      body.appendChild(form);

      if (handle) {
        // public toggle
        const toggleRow = el("label", "set-row share-toggle", isPublic ? "Public — anyone with the link can view" : "Private — only you");
        const sw = el("input"); sw.type = "checkbox"; sw.checked = isPublic;
        sw.onchange = () => {
          sw.disabled = true;
          Auth.setProfile({ is_public: sw.checked })
            .then((r) => { render((r && r.profile) || { handle: handle, isPublic: sw.checked }); })
            .catch(() => { sw.checked = !sw.checked; sw.disabled = false; });
        };
        toggleRow.appendChild(sw);
        body.appendChild(toggleRow);

        // public link + copy (only meaningful once public)
        const url = origin + "/m/" + handle;
        const linkRow = el("div", "share-link-row");
        const linkA = el("a", "share-link", url);
        linkA.href = "/m/" + handle; linkA.target = "_blank"; linkA.rel = "noopener";
        linkRow.appendChild(linkA);
        const copy = el("button", "share-copy", "Copy");
        copy.onclick = () => {
          const done = () => { copy.textContent = "Copied ✓"; setTimeout(() => { copy.textContent = "Copy"; }, 1400); };
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, done);
          else { try { input.value = url; input.select(); document.execCommand("copy"); } catch (e) {} done(); }
        };
        linkRow.appendChild(copy);
        body.appendChild(linkRow);

        body.appendChild(el("p", "share-note",
          isPublic
            ? "This is an evolving learning record — concepts mastered, depth, recency — with visible uncertainty. Not a certified score."
            : "Make it public to share the link. Your map shows concepts you've mastered by learning — an honest record, not a certified score."));
      }
    }

    Auth.getProfile()
      .then((res) => { render(res && res.profile ? res.profile : null); })
      .catch(() => { body.innerHTML = ""; body.appendChild(el("p", "share-hint", "Couldn't load your profile right now.")); });

    return box;
  }

  function animateUnlock(svg, pu, help) {
    const center = svg.querySelector('.node[data-id="' + cssEsc(pu.id) + '"]');
    if (center) {
      center.classList.add("just-unlocked");
      const t = E.byId[pu.id];
      if (t && help) help.textContent = "✦ Unlocked " + t.title + ". Tracing what it leads to…";
    }
    (pu.unlocks || []).forEach((u, i) => {
      const edge = svg.querySelector('.edge[data-from="' + cssEsc(pu.id) + '"][data-to="' + cssEsc(u) + '"]');
      if (edge) { edge.classList.add("draw"); edge.style.animationDelay = (i * 90) + "ms"; }
      const node = svg.querySelector('.node[data-id="' + cssEsc(u) + '"]');
      if (node) { node.classList.add("unlock-target"); node.style.animationDelay = (120 + i * 90) + "ms"; }
    });
  }

  function cssEsc(s) {
    return String(s).replace(/["\\\]]/g, "\\$&");
  }

  // Local-neighborhood view: requires ← node → unlocks, as a small curated 3-column
  // SVG. Always-useful (never the hairball), smooth transform/opacity entrance.
  function openNeighborhood(id) {
    const a = E.byId[id];
    if (!a) return openAtom(id, true);
    const reqs = (a.requires || []).filter((r) => E.byId[r]);
    const unlocks = (a.unlocks || []).filter((u) => E.byId[u]);
    const wrap = el("div", "screen map neighborhood");
    wrap.appendChild(header());
    const top = el("div", "atom-top");
    const back = el("button", "ghost", "‹ Map"); back.onclick = () => go("map");
    top.appendChild(back);
    top.appendChild(el("span", "prog", SHELL_LABEL[a.shell]));
    wrap.appendChild(top);
    wrap.appendChild(el("h2", "nb-title", escapeHtml(a.title)));
    wrap.appendChild(el("p", "nb-sub", escapeHtml(a.summary || "")));

    const W = Math.min(window.innerWidth - 24, 680), H = 300;
    const svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "graph nb-graph" });
    const colX = { req: W * 0.16, mid: W * 0.5, unl: W * 0.84 };
    const place = (arr, x) => arr.map((nid, i) => {
      const y = arr.length === 1 ? H / 2 : 40 + (i / (arr.length - 1)) * (H - 80);
      return { id: nid, x, y };
    });
    const reqP = place(reqs, colX.req), unlP = place(unlocks, colX.unl);
    const midP = { id, x: colX.mid, y: H / 2 };

    // edges (req → mid, mid → unl) drawn first, behind nodes
    reqP.forEach((p, i) => {
      const e = svgEl("path", { d: curve(p.x, p.y, midP.x, midP.y), class: "edge nb-edge draw" });
      e.style.animationDelay = (i * 60) + "ms"; svg.appendChild(e);
    });
    unlP.forEach((p, i) => {
      const e = svgEl("path", { d: curve(midP.x, midP.y, p.x, p.y), class: "edge nb-edge draw lead" });
      e.style.animationDelay = (120 + i * 60) + "ms"; svg.appendChild(e);
    });

    const drawNode = (p, kind) => {
      const at = E.byId[p.id];
      const m = E.masteryFor(p.id);
      const g = svgEl("g", {
        class: "node nb-node shell-" + at.shell + (E.cardFor(p.id) ? " seen" : "") + " " + kind,
        transform: "translate(" + p.x + "," + p.y + ")", tabindex: "0", role: "button",
        "aria-label": at.title,
      });
      const rr = kind === "center" ? 16 : 10;
      g.appendChild(svgEl("circle", { r: rr, class: "node-base" }));
      g.appendChild(svgEl("circle", { r: rr * Math.max(0.15, m), class: "node-fill" }));
      const label = svgEl("text", { class: "nb-label", x: 0, y: rr + 14, "text-anchor": "middle" });
      label.textContent = at.title.length > 22 ? at.title.slice(0, 21) + "…" : at.title;
      g.appendChild(label);
      const open = () => { if (window.haptic) haptic("select"); if (p.id === id) openAtom(id, true); else openNeighborhood(p.id); };
      g.onclick = open;
      g.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };
      svg.appendChild(g);
    };
    reqP.forEach((p) => drawNode(p, "req"));
    unlP.forEach((p) => drawNode(p, "unl"));
    drawNode(midP, "center");

    // column captions
    if (reqs.length) svg.appendChild(textLabel(colX.req, 22, "Requires"));
    svg.appendChild(textLabel(colX.mid, 22, "This concept"));
    if (unlocks.length) svg.appendChild(textLabel(colX.unl, 22, "Unlocks →"));

    const holder = el("div", "graph-holder");
    holder.appendChild(svg);
    wrap.appendChild(holder);

    // surface the leverage line in text too
    if (unlocks.length) {
      wrap.appendChild(el("div", "unlocks", "Unlocks → " + unlocks.map((x) => E.byId[x].title).join(", ")));
    }
    const study = el("button", "btn primary wide", "Study this concept →");
    study.onclick = () => openAtom(id, true);
    wrap.appendChild(study);
    wrap.appendChild(nav("map"));
    mount(wrap);
  }

  function curve(x1, y1, x2, y2) {
    const mx = (x1 + x2) / 2;
    return "M" + x1 + " " + y1 + "C" + mx + " " + y1 + " " + mx + " " + y2 + " " + x2 + " " + y2;
  }
  function textLabel(x, y, txt) {
    const t = svgEl("text", { x, y, class: "nb-cap", "text-anchor": "middle" });
    t.textContent = txt;
    return t;
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

    // Share your Mastery Profile (bkt-coh) — opt-in public, signed-in only.
    wrap.appendChild(shareProfileSection());

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

    // Re-take placement — re-run the adaptive diagnostic to re-estimate the frontier.
    if (!isLang() && typeof window.Diagnostic === "function") {
      const place = el("button", "btn ghost wide", "Re-take placement");
      place.onclick = () => go("diagnostic");
      settings.appendChild(place);
    }

    const reset = el("button", "btn ghost wide danger", "Reset all progress");
    reset.onclick = () => { if (confirm("Erase all learning progress?")) { E.reset(); go("home"); } };
    settings.appendChild(reset);
    wrap.appendChild(settings);

    wrap.appendChild(nav("progress"));
    return wrap;
  }

  /* ---------- placement diagnostic (ALEKS-style binary search over the graph) ----------
   * Honest framing: a STARTING ESTIMATE, never a certified rating (public ratings are
   * gated on bkt-4at). The learner can always study any concept regardless, and the
   * whole flow is skippable. Correct answers credit prerequisites via the encompassing
   * graph; placement seeds modest FSRS state, never "mastered". */

  // Seed engine state honestly for a set of placed-known atoms. We introduce each with
  // a "Hard" grade (rating 2): present + low-but-real stability + a modest proficiency,
  // NOT certified-mastered. FIRe/encompassing credit then flows to prerequisites through
  // the engine's grade() path. This makes the route + "Continue learning" resume past
  // what the learner already knows while leaving everything overridable.
  function seedPlacement(knownIds) {
    let n = 0;
    knownIds.forEach((id) => {
      if (!E.byId[id]) return;
      if (E.cardFor(id)) return;       // never clobber real progress
      const lvl = pickLevel(id);       // honor the atom's available quiz depth
      E.grade(id, 2, lvl || "recall"); // 2 = "Hard": introduced, modest stability + prof
      n++;
    });
    E.save();
    return n;
  }

  function startDiagnostic() {
    if (typeof window.Diagnostic !== "function") return go("home");
    const d = new window.Diagnostic({ atoms: E.atoms, byId: E.byId, isLang: isLang() });
    d.start();
    diag = { d: d, item: null, revealed: false };
    renderDiagIntro();
  }

  function renderDiagIntro() {
    const wrap = el("div", "screen diagnostic");
    wrap.appendChild(header());
    const intro = el("div", "diag-intro");
    intro.innerHTML =
      '<div class="di-mark">✶</div>' +
      "<h1>Place me on the graph</h1>" +
      "<p>We'll ask a handful of questions, jumping around the map to find what you " +
      "already know. Answer honestly — there's no score, no grade.</p>" +
      '<p class="diag-honest">This is a starting estimate. You can study any concept ' +
      "regardless, and re-take it any time.</p>";
    const start = el("button", "btn primary wide", "Start →");
    start.onclick = () => diagNext();
    intro.appendChild(start);
    const skip = el("button", "diag-skip", "Skip — just let me study");
    skip.onclick = () => { diag = null; go("home"); };
    intro.appendChild(skip);
    wrap.appendChild(intro);
    mount(wrap);
  }

  // Render the current diagnostic question (prompt → reveal → I knew it / I didn't).
  function diagNext() {
    if (!diag) return go("home");
    if (diag.d.done()) return diagFinish();
    const item = diag.d.next();
    if (!item) return diagFinish();
    diag.item = item;
    diag.revealed = false;
    renderDiagQuestion();
  }

  function renderDiagQuestion() {
    const item = diag.item;
    const a = item.atom;
    const wrap = el("div", "screen diagnostic");
    wrap.appendChild(header());

    const top = el("div", "atom-top");
    const skip = el("button", "ghost", "Skip placement");
    skip.onclick = () => { diag = null; go("home"); };
    top.appendChild(skip);
    top.appendChild(el("span", "diag-step", "Q" + item.qIndex + " · placing"));
    wrap.appendChild(top);

    // progress bar (approximate — diagnostic may early-stop before the cap)
    const bar = el("div", "diag-bar");
    const frac = Math.min(1, item.qIndex / Math.max(1, item.total));
    bar.appendChild(el("i")).style.width = Math.round(frac * 100) + "%";
    wrap.appendChild(bar);

    const box = el("div", "diag-q");
    box.appendChild(el("div", "dq-label", "Do you know this?"));
    box.appendChild(el("div", "dq-concept", escapeHtml(a.title || a.gloss || item.id)));

    // Build the prompt. Concept atoms use their quiz prompt; language atoms ask for
    // the target word given the gloss (mirrors the polyglot drill).
    let promptHtml, answerHtml;
    if (item.isLang) {
      const { target, known } = langSettings();
      const tf = (a.forms && a.forms[target]) || {};
      const hintLang = known[0];
      const hint = hintLang && a.forms[hintLang];
      promptHtml = "How do you say <b>“" + escapeHtml(a.gloss || a.title || "") + "”</b>" +
        (hint ? " (" + escapeHtml(LANG_NAMES[hintLang] || hintLang) + ": " + escapeHtml(hint.word) + ")" : "") +
        " in " + escapeHtml(LANG_NAMES[target] || target) + "?";
      answerHtml = escapeHtml(tf.word || "—") + (tf.ipa ? " <i>/" + escapeHtml(tf.ipa) + "/</i>" : "");
    } else {
      promptHtml = item.prompt || escapeHtml(a.title || "");
      answerHtml = item.answer || "";
    }
    box.appendChild(el("div", "dq-prompt", promptHtml));

    const answer = el("div", "answer hidden");
    answer.innerHTML = "<div class='a-label'>Answer</div><div class='a-text" +
      (item.isLang ? " lang-ans" : "") + "'>" + answerHtml + "</div>";
    const reveal = el("button", "btn wide", "Show answer");
    const choice = el("div", "diag-choice hidden");
    reveal.onclick = () => {
      answer.classList.remove("hidden");
      reveal.classList.add("hidden");
      choice.classList.remove("hidden");
      if (diag) diag.revealed = true;
      katex(answer);
    };
    const knew = el("button", "dc knew", "✓ I knew it");
    knew.onclick = () => diagAnswer(true);
    const didnt = el("button", "dc didnt", "I didn't");
    didnt.onclick = () => diagAnswer(false);
    choice.appendChild(knew);
    choice.appendChild(didnt);

    box.appendChild(reveal);
    box.appendChild(answer);
    box.appendChild(choice);
    wrap.appendChild(box);

    // an explicit "haven't learned this yet" supplies clean negative evidence without
    // forcing a reveal (ADAPTIVE-SOTA §a.3 — measurably reduces questions needed).
    const dunno = el("button", "diag-skip", "I haven't learned this yet");
    dunno.onclick = () => diagAnswer(false);
    wrap.appendChild(dunno);

    mount(wrap);
    katex(wrap);
  }

  function diagAnswer(correct) {
    if (!diag || !diag.item) return;
    diag.d.answer(diag.item.id, correct);
    if (diag.d.done()) return diagFinish();
    renderDiagPlacing(); // brief "thinking" beat, then the next question
    setTimeout(diagNext, 360);
  }

  function renderDiagPlacing() {
    const wrap = el("div", "screen diagnostic");
    wrap.appendChild(header());
    const p = el("div", "diag-placing");
    p.innerHTML = '<div class="dp-mark">✶</div><p>Placing you…</p>';
    wrap.appendChild(p);
    mount(wrap);
  }

  function diagFinish() {
    const res = diag ? diag.d.result() : { known: [], frontier: [], placedCount: 0 };
    diag = null;
    const placed = seedPlacement(res.known);
    renderDiagResult(res, placed);
  }

  function renderDiagResult(res, placed) {
    const wrap = el("div", "screen diagnostic");
    wrap.appendChild(header());
    const box = el("div", "diag-result");
    const headline = placed > 0
      ? "Started you at " + placed + " concept" + (placed === 1 ? "" : "s")
      : "Starting from the foundations";
    box.innerHTML =
      '<div class="dr-mark">✶</div>' +
      "<h1>" + headline + ".</h1>" +
      '<p class="dr-sub">' +
      (placed > 0
        ? "We placed you past what you already know. Here's where to go next — and you " +
          "can always revisit anything earlier."
        : "No problem — we'll build you up from first principles. Every concept is open " +
          "to study whenever you like.") +
      "</p>";

    // "here's where to go next" — the next learnable concepts in study order.
    const next = studyOrder().filter((id) => !E.cardFor(id)).slice(0, 5);
    if (next.length) {
      const list = el("div", "route-list dr-next");
      list.appendChild(el("div", "section-label", "Where to go next"));
      next.forEach((id) => {
        const a = E.byId[id];
        const row = el("div", "route-row");
        row.appendChild(el("span", "dot shell-dot-" + a.shell));
        row.appendChild(el("span", "rtitle", escapeHtml(a.title)));
        row.appendChild(el("span", "rtag new", "learn"));
        row.onclick = () => openAtom(a.id, true);
        list.appendChild(row);
      });
      box.appendChild(list);
    }

    const cont = el("button", "btn primary wide", "Start learning →");
    cont.onclick = () => go("home");
    box.appendChild(cont);
    const study = el("button", "btn ghost wide", "Browse everything (Study)");
    study.onclick = () => go("study");
    box.appendChild(study);
    wrap.appendChild(box);
    mount(wrap);
    katex(wrap);
  }

  /* ---------- router ---------- */
  function mount(node) {
    const root = $("#app");
    root.innerHTML = "";
    root.appendChild(node);
  }
  function go(where) {
    currentScreen = where;
    if (where === "home") mount(screenHome());
    else if (where === "study") screenStudy();
    else if (where === "map") mount(screenMap());
    else if (where === "progress") mount(screenProgress());
    else if (where === "diagnostic") startDiagnostic();
    window.scrollTo(0, 0);
  }

  async function boot() {
    // Load the built-in deck manifest (with fallback) + the user's saved decks first,
    // so BRANCHES is fully populated before we resolve the current selection / deep link.
    await loadManifest();
    if (window.BucketLibrary) {
      try { await window.BucketLibrary.pull(); } catch (e) {}
    }
    refreshBranches();

    // optional deep link: ?branch=<id>&atom=<id>
    let params = null;
    try { params = new URLSearchParams(location.search); } catch (e) {}
    if (params) {
      const bParam = params.get("branch");
      if (bParam) {
        const m = BRANCHES.find((b) => (b.file && b.file.includes(bParam)) || b.id === bParam);
        if (m) currentBranchFile = branchKey(m);
      }
    }

    // Make sure the persisted selection still exists (a custom deck may have been deleted
    // on another device); otherwise fall back to the default built-in branch.
    if (!findBranch(currentBranchFile)) currentBranchFile = DEFAULT_BRANCH;

    const cur = findBranch(currentBranchFile) || BRANCHES[0];
    try {
      if (cur && cur.file) await E.load(cur.file);
      else if (cur && cur.data) E.loadData(cur.data, cur.id);
      else await E.load(DEFAULT_BRANCH);
      normalizeAtoms();
      await loadArtCache();
    } catch (e) {
      $("#app").innerHTML = '<div class="screen"><div class="hero"><h1>Corpus failed to load</h1><p class="sub">Run via a local server: <code>./serve.sh</code></p></div></div>';
      return;
    }
    window.__BA = E; // debug handle

    // When an auth sync merges new state into localStorage, reload the active
    // branch's engine state and re-render the current screen so progress (and
    // the share-profile section) reflect the merged data (bkt-su9, bkt-coh).
    window.__BA_onAuthSync = function () {
      try { E._loadState && E._loadState(); } catch (e) {}
      go(currentScreen);
    };

    go("home");
    if (params) {
      const view = params.get("view");
      if (view === "study") go("study");
      else if (view === "map") go("map");
      const nbParam = params.get("nb");
      if (nbParam && E.byId[nbParam]) openNeighborhood(nbParam);
      const aParam = params.get("atom");
      if (aParam && E.byId[aParam]) openAtom(aParam, true);
    }
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
