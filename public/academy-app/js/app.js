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

  // Available branches (corpora). The picker is data-driven: built-in decks are
  // LOADED from corpus/index.json at boot (see loadManifest()). Adding a built-in
  // deck = drop a corpus file + a manifest entry. BRANCHES is mutable and rebuilt
  // by refreshBranches(); BUILTIN_FALLBACK is used only if the fetch fails.
  const BRANCH_PREF_KEY = "bucket-academy/branch";
  const DEFAULT_BRANCH = "corpus/biophysics.json";
  const BUILTIN_FALLBACK = [
    { id: "00-learning-to-learn", file: "corpus/00-learning-to-learn.json", pill: "✦ · Learning to learn", sub: "The meta-skill that accelerates every branch" },
    { id: "01-mathematics", file: "corpus/01-mathematics.json", pill: "I · Mathematics", sub: "The foundations of reasoning" },
    { id: "02-physics", file: "corpus/02-physics.json", pill: "II · Physics", sub: "Matter, energy & spacetime" },
    { id: "03-chemistry", file: "corpus/03-chemistry.json", pill: "III · Chemistry", sub: "Matter, bonds & transformation" },
    { id: "04-information", file: "corpus/04-information.json", pill: "IV · Information", sub: "Entropy, computation & complexity" },
    { id: "05-biophysics", file: "corpus/biophysics.json", pill: "V · Biophysics", sub: "Energy, matter & life" },
    { id: "06-cosmology", file: "corpus/06-cosmology.json", pill: "VI · Cosmology", sub: "The universe at large" },
    { id: "07-mind", file: "corpus/07-mind.json", pill: "VII · Mind", sub: "Brains, computation & cognition" },
    { id: "lang-core", file: "corpus/lang-core.json", pill: "✺ · Languages", sub: "Learn a language through the ones you know", kind: "language", languages: ["en", "es", "fr", "it", "pt", "de", "nl", "sv", "ru", "ja", "zh", "el", "fi", "pl"] },
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

  // Rebuild BRANCHES from the built-in deck manifest. (Custom/AI-generated decks were
  // removed — the Academy ships only curated, foundations-first built-in branches.)
  function refreshBranches() {
    BRANCHES = BUILTINS.slice();
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
    pt: "Portuguese", de: "German", la: "Latin", nl: "Dutch",
    sv: "Swedish", pl: "Polish", fi: "Finnish", el: "Greek",
    ru: "Russian", ja: "Japanese", zh: "Chinese", ko: "Korean",
    hi: "Hindi", ar: "Arabic", fa: "Persian", he: "Hebrew",
    cs: "Czech", id: "Indonesian", sa: "Sanskrit", ta: "Tamil",
    th: "Thai", tr: "Turkish", vi: "Vietnamese",
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
  let assess = null;  // active "Test yourself" assessment run (bkt-v7y)
  let currentScreen = "home"; // last routed screen (for post-sync re-render)
  let shareProfileHandle = null; // cached {handle,isPublic} for the share action (bkt-vjb)

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

  /* ---------- language answer checking (bkt-n2v / C3 typed grading) ----------
   * Real recognition-free recall: the learner TYPES the target word and we grade
   * the actual answer (correct / close-typo / wrong), then drive FSRS from the
   * real result instead of self-report. Tolerant of diacritics, case, whitespace,
   * surrounding articles, and a single typo. */

  // Strip diacritics for all 7 deck languages: é→e ñ→n ü→u ç→c ã→a ò→o ï→i ß→ss …
  // Uses NFD canonical decomposition + combining-mark removal, plus explicit maps
  // for characters that don't decompose (ß, ø, æ, œ, ð, þ).
  function foldAccents(s) {
    s = String(s == null ? "" : s).toLowerCase().trim();
    // collapse internal whitespace
    s = s.replace(/\s+/g, " ");
    // characters with no canonical decomposition → expand explicitly
    s = s
      .replace(/ß/g, "ss")
      .replace(/æ/g, "ae").replace(/œ/g, "oe")
      .replace(/ø/g, "o")
      .replace(/ð/g, "d").replace(/þ/g, "th")
      .replace(/ł/g, "l");
    // canonical decompose, then drop combining diacritical marks (U+0300–U+036F)
    try { s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (e) {}
    // drop apostrophes/hyphens that don't change identity (l'eau → leau, etc.)
    s = s.replace(/[’'`\-]/g, "");
    return s.trim();
  }

  // Articles we accept as optional prefixes for gendered nouns, per language.
  var LANG_ARTICLES = {
    es: ["el", "la", "los", "las", "un", "una"],
    fr: ["le", "la", "les", "l", "un", "une", "des", "du", "de"],
    it: ["il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "l"],
    pt: ["o", "a", "os", "as", "um", "uma"],
    de: ["der", "die", "das", "ein", "eine", "den", "dem"],
    la: [],
    en: ["the", "a", "an"],
  };

  // Remove a leading article token (folded) so "el agua"/"la casa"/"der Hund"
  // match the article-less deck word, and vice-versa.
  function stripArticle(folded, lang) {
    var arts = LANG_ARTICLES[lang] || [];
    var parts = folded.split(" ");
    if (parts.length > 1 && arts.indexOf(parts[0]) !== -1) {
      return parts.slice(1).join(" ").trim();
    }
    return folded;
  }

  // Damerau-Levenshtein edit distance (bounded use: short words only). Counts an
  // ADJACENT TRANSPOSITION ("agau"→"agua") as a SINGLE edit, not two — so a real
  // typo where two neighbouring letters are swapped grades "close", not "wrong".
  // (Optimal String Alignment variant: sufficient for single-typo tolerance, and
  // we keep three rolling rows so the transposition term `prev2[j-2]` is available.)
  function editDistance(a, b) {
    a = a || ""; b = b || "";
    if (a === b) return 0;
    var la = a.length, lb = b.length;
    if (!la) return lb;
    if (!lb) return la;
    var prev2 = new Array(lb + 1), prev = new Array(lb + 1), cur = new Array(lb + 1), i, j;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      cur[0] = i;
      for (j = 1; j <= lb; j++) {
        var cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        var v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        // adjacent transposition: a[i-1]==b[j-2] && a[i-2]==b[j-1] → one edit
        if (i > 1 && j > 1 &&
            a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
            a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) {
          v = Math.min(v, prev2[j - 2] + 1);
        }
        cur[j] = v;
      }
      var t = prev2; prev2 = prev; prev = cur; cur = t;
    }
    return prev[lb];
  }

  // Grade a typed answer against the deck's target word.
  // Returns { verdict: "correct"|"close"|"wrong", accentOnly, expected, dist }.
  //   correct  → exact match after case/whitespace/article normalization
  //              (accentOnly flags a right-but-for-diacritics answer — still correct,
  //               we just note it so the reveal can nudge the accent)
  //   close    → within 1 edit of the (folded) target = an honest typo
  //   wrong    → otherwise
  function checkLangAnswer(typed, target, lang) {
    var expected = String(target == null ? "" : target).trim();
    var out = { verdict: "wrong", accentOnly: false, expected: expected, dist: 99 };
    if (!typed || !typed.trim()) return out;

    // Tier 1: exact (case + whitespace only) — diacritics intact.
    var tRaw = typed.toLowerCase().replace(/\s+/g, " ").trim();
    var eRaw = expected.toLowerCase().replace(/\s+/g, " ").trim();
    var tRawNA = stripRawArticle(tRaw, lang);
    if (tRaw === eRaw || tRawNA === eRaw || tRaw === stripRawArticle(eRaw, lang)) {
      out.verdict = "correct"; out.dist = 0; return out;
    }

    // Tier 2: accent/diacritic + article folded exact match → still correct,
    // flag accentOnly so we can show the precise spelling.
    var tf = stripArticle(foldAccents(typed), lang);
    var ef = stripArticle(foldAccents(expected), lang);
    if (tf && tf === ef) {
      out.verdict = "correct"; out.dist = 0;
      out.accentOnly = (tRawNA !== eRaw); // matched only after folding
      return out;
    }

    // Tier 3: close (single typo) on the folded form.
    var d = editDistance(tf, ef);
    out.dist = d;
    // 1 edit for short words, allow 2 for longer (>=8 chars) words.
    var tol = ef.length >= 8 ? 2 : 1;
    if (ef.length >= 3 && d <= tol) { out.verdict = "close"; return out; }

    return out;
  }

  // Like stripArticle but operates on a raw (un-folded) lowercased string.
  function stripRawArticle(raw, lang) {
    var arts = LANG_ARTICLES[lang] || [];
    var parts = raw.split(" ");
    if (parts.length > 1 && arts.indexOf(foldAccents(parts[0])) !== -1) {
      return parts.slice(1).join(" ").trim();
    }
    return raw;
  }

  /* ---------- screens ---------- */
  function screenHome() {
    // Languages: force the explicit setup picker before anything (fix #1). No silent
    // auto-Spanish default — the learner chooses target + known first, once.
    if (isLang() && !langPrefChosen()) return screenLangPicker();
    const s = E.summary();
    const route = E.route();
    const dueReviews = route.filter((r) => r.kind === "review");
    const next = studyOrder().filter((id) => !E.cardFor(id)); // not-yet-drilled, in order
    const wrap = el("div", "screen home");
    wrap.appendChild(header());

    const hero = el("div", "hero");
    const curBranch = currentBranch();
    const branchName = curBranch.pill.replace(/^\S+ · /, "");
    if (isLang()) {
      // Course-style hero: name the languages, lead with the current level, retrieval-first.
      const ls = langSettings();
      const levels = langLevels();
      const lv = langCurrentLevel(levels);
      hero.appendChild(el("div", "kicker",
        (LANG_NAMES[ls.target] || ls.target) + " · from " + (LANG_NAMES[ls.primaryKnown] || ls.primaryKnown)));
      const allDone = !next.length;
      hero.appendChild(el("h1", null, allDone ? "You've covered the deck. 🎉" : "Keep building your " + (LANG_NAMES[ls.target] || ls.target) + "."));
      hero.appendChild(el("p", "sub",
        (lv ? "Level " + lv.n + " · " + lv.label + " — " + lv.done + "/" + lv.total + " words" : (s.introduced + " of " + s.total + " words started")) +
        (dueReviews.length ? " · " + dueReviews.length + " to review" : "")));
      // primary verb = practice (retrieval-first), starting at the current level
      const startCta = el("button", "btn primary", (lv && lv.done ? "Continue level " + lv.n + " →" : "Start level " + (lv ? lv.n : 1) + " →"));
      startCta.onclick = () => {
        const queue = (lv ? lv.ids : next).filter((id) => !E.cardFor(id)).slice(0, LANG_LEVEL_SIZE);
        if (queue.length) startSession(queue.map((id) => ({ id, kind: "new" })));
        else if (dueReviews.length) startSession(dueReviews);
        else go("study");
      };
      hero.appendChild(startCta);
      const browse = el("button", "btn ghost hero-study", "Browse all words →");
      browse.onclick = () => go("study");
      hero.appendChild(browse);
      if (dueReviews.length) {
        const rev = el("button", "btn ghost hero-study", "Review " + dueReviews.length + " due →");
        rev.onclick = () => startSession(dueReviews);
        hero.appendChild(rev);
      }
    } else {
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
    }
    wrap.appendChild(hero);
    // honest framing right under the hero on the language branch (fix #5)
    if (isLang()) wrap.appendChild(langHonestyBanner());

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

    // Languages: a leveled PATH (fix #5) instead of a flat word list — units the
    // learner can see progress through. Each level tile starts a session of its words.
    if (isLang()) {
      const levels = langLevels();
      const cur = langCurrentLevel(levels);
      const path = el("div", "lang-path");
      path.appendChild(el("div", "section-label", "Your path"));
      levels.forEach((lv) => {
        const complete = lv.done >= lv.total;
        const isCur = cur && lv.n === cur.n;
        const tile = el("button", "lvl-tile" + (complete ? " done" : "") + (isCur ? " current" : ""));
        const pct = Math.round((lv.done / lv.total) * 100);
        tile.innerHTML =
          '<span class="lvl-badge">' + (complete ? "✓" : lv.n) + "</span>" +
          '<span class="lvl-body"><span class="lvl-name">Level ' + lv.n + " · " + escapeHtml(lv.label) + "</span>" +
          '<span class="lvl-meta">' + lv.done + "/" + lv.total + " words" + (lv.mastered ? " · " + lv.mastered + " mastered" : "") + "</span>" +
          '<span class="lvl-bar"><i style="width:' + pct + '%"></i></span></span>' +
          '<span class="lvl-go">' + (complete ? "↺" : "→") + "</span>";
        tile.onclick = () => {
          // start with the not-yet-learned words first; if all learned, review them
          let queue = lv.ids.filter((id) => !E.cardFor(id));
          if (!queue.length) queue = lv.ids; // revisit a completed level
          startSession(queue.slice(0, LANG_LEVEL_SIZE).map((id) => ({ id, kind: E.cardFor(id) ? "review" : "new" })));
        };
        path.appendChild(tile);
      });
      wrap.appendChild(path);
      wrap.appendChild(nav("home"));
      katex(wrap);
      return wrap;
    }

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
      const row = el("div", "branch-row" + (on ? " on" : ""));
      const main = el(
        "button",
        "branch-row-main",
        '<span class="branch-row-name">' + escapeHtml(b.pill) + "</span>" +
          '<span class="branch-row-sub">' + escapeHtml(b.sub || "") + "</span>"
      );
      main.onclick = () => {
        back.remove();
        if (key !== currentBranchFile) switchBranch(key);
      };
      row.appendChild(main);
      sheet.appendChild(row);
    }

    BUILTINS.forEach(addRow);

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
  // Read the raw persisted language preference (or {} if none).
  function langPrefRaw() {
    let p = {};
    try { p = JSON.parse(localStorage.getItem(LANG_PREF_KEY)) || {}; } catch (e) {}
    return p && typeof p === "object" ? p : {};
  }
  // Has the learner ever made an explicit "I want to learn ___ / I already know ___"
  // choice? Drives the first-run picker (fix #1 — explicit setup, not silent defaults).
  function langPrefChosen() {
    const p = langPrefRaw();
    return !!(p && p.chosen && p.target);
  }
  // Polyglot mode = the advanced "show the word in EVERY language I know" view.
  // OFF by default (fix #2 — beginners see one clean source→target mapping).
  function langPolyglot() {
    return !!langPrefRaw().polyglot;
  }
  // The languages a learner may pick as the TARGET (the one being learned). This is
  // meta.languages (guaranteed on every atom) PLUS bonusLanguages (ko/hi/ar — present
  // on most-but-not-all atoms; well above the ~80-word usability bar). Sorted by code
  // for a stable order; the picker re-sorts by display name. (bkt-3s9)
  function langDeckLangs() {
    const meta = (E.meta && E.meta.languages) || ["en"];
    const bonus = (E.meta && E.meta.bonusLanguages) || [];
    const seen = {}, out = [];
    [...meta, ...bonus].forEach((l) => { if (l && !seen[l]) { seen[l] = 1; out.push(l); } });
    return out;
  }
  // How many atoms actually carry a form in language `l` (for the picker's coverage
  // filter — only offer languages with a real, learnable amount of content).
  function langCoverage(l) {
    if (!E.atoms) return 0;
    let n = 0; for (const a of E.atoms) if (a.forms && a.forms[l] && a.forms[l].word) n++;
    return n;
  }
  function langSettings() {
    // target may be any deck language (incl. bonus ko/hi/ar); known (the source you
    // learn FROM) must be a guaranteed meta language so every atom can anchor it.
    const deckLangs = langDeckLangs();
    const metaLangs = (E.meta && E.meta.languages) || ["en"];
    const langs = deckLangs;
    const p = langPrefRaw();
    let target = p.target && langs.includes(p.target) ? p.target : (langs.find((l) => l !== "en") || langs[0]);
    // `known` = the languages the learner already knows. We keep the full list (so the
    // settings UI + advanced polyglot view can use it), but beginners are SHOWN only the
    // first (the primary source language) unless polyglot mode is on. Default known = [en].
    let known = (Array.isArray(p.known) ? p.known : ["en"]).filter((l) => metaLangs.includes(l) && l !== target);
    if (!known.length) known = (metaLangs.includes("en") && "en" !== target ? ["en"] : metaLangs.filter((l) => l !== target).slice(0, 1));
    // The single primary source language a beginner learns FROM (fix #2).
    const primaryKnown = p.primaryKnown && known.includes(p.primaryKnown) ? p.primaryKnown : known[0];
    // What the per-card reference list should show: just the primary by default; all
    // known languages when polyglot (advanced) mode is on.
    const shown = langPolyglot() ? known : (primaryKnown ? [primaryKnown] : known.slice(0, 1));
    return { target, known, shown, primaryKnown, polyglot: langPolyglot(), langs };
  }
  // Persist the learner's choice. `opts` may carry { primaryKnown, polyglot, chosen }.
  // Marks the pref as explicitly chosen so the first-run picker doesn't reappear.
  function setLangPref(target, known, opts) {
    opts = opts || {};
    const prev = langPrefRaw();
    const kn = Array.isArray(known) && known.length ? known : (prev.known || ["en"]);
    const rec = {
      target,
      known: kn,
      primaryKnown: opts.primaryKnown || (kn.includes(prev.primaryKnown) ? prev.primaryKnown : kn[0]),
      polyglot: opts.polyglot != null ? !!opts.polyglot : !!prev.polyglot,
      chosen: opts.chosen != null ? !!opts.chosen : (prev.chosen || false),
    };
    try { localStorage.setItem(LANG_PREF_KEY, JSON.stringify(rec)); } catch (e) {}
  }

  // "Ask the tutor" — opens a focused, grounded Socratic chat scoped to this
  // atom. Degrades silently if the tutor module didn't load (atom screen must
  // never break). The panel itself handles the not-enabled (503) state.
  function tutorAffordance(a) {
    const wrap = el("div", "tutor-cta");
    const btn = el(
      "button",
      "tutor-cta-btn",
      '<span class="tutor-cta-ico">✦</span>' +
        '<span class="tutor-cta-txt"><b>Ask the tutor</b>' +
        '<span class="tutor-cta-sub">Grounded to this concept · Socratic hints, not answers</span></span>' +
        '<span class="tutor-cta-caret">›</span>'
    );
    btn.setAttribute("aria-label", "Ask the tutor about " + (a.title || "this concept"));
    btn.onclick = () => {
      if (!window.BucketTutor || typeof window.BucketTutor.open !== "function") return;
      window.BucketTutor.open({
        atom: a,
        branch: (E.meta && E.meta.branch) || null,
        byId: E.byId,
      });
    };
    wrap.appendChild(btn);
    return wrap;
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

  // Build the per-card cross-language reference rows. By default (beginner) this shows
  // ONLY the primary source language (fix #2 — one clean source→target). When polyglot
  // (advanced) mode is on, it shows every known language. `langs` = which to render.
  function langRefSection(a, langsToShow) {
    const ref = el("div", "lang-ref");
    ref.appendChild(el("div", "section-label",
      langsToShow.length > 1 ? "In the languages you know" : "In " + (LANG_NAMES[langsToShow[0]] || langsToShow[0])));
    langsToShow.forEach((l) => {
      const f = a.forms[l]; if (!f) return;
      const r = el("div", "lang-row",
        '<span class="lang-name">' + escapeHtml(LANG_NAMES[l] || l) + "</span>" +
        '<span class="lang-w">' + escapeHtml(f.word) + (f.ipa ? ' <i>/' + escapeHtml(f.ipa) + "/</i>" : "") + "</span>");
      if (f.word && window.LangAudio && window.LangAudio.supported()) {
        r.appendChild(window.LangAudio.button(f.word, l, { label: "Hear " + f.word + " in " + (LANG_NAMES[l] || l) }));
      }
      ref.appendChild(r);
    });
    return ref;
  }

  /* ---------- language atom ---------- */
  function renderLangAtom(id, peek) {
    const a = E.byId[id];
    const ls = langSettings();
    const target = ls.target, known = ls.known, shown = ls.shown;
    const tf = a.forms[target] || {};
    const wrap = el("div", "screen atom lang");
    wrap.appendChild(header());
    const top = el("div", "atom-top");
    const back = el("button", "ghost", "‹ Route"); back.onclick = () => go("home");
    top.appendChild(back);
    top.appendChild(el("span", "prog", session ? session.i + 1 + " / " + session.queue.length : ""));
    wrap.appendChild(top);

    // Level badge (fix #5 — "where am I"). Small, calm, serif.
    wrap.appendChild(el("div", "lang-level-chip", "Level " + langLevelOf(id) + " · " + (LANG_NAMES[target] || target)));

    if (peek) {
      // ---- PEEK / preview (browsing from the path): reveal the full card, no spoiler worry.
      const card = el("div", "art lang-card shell-" + a.shell);
      card.innerHTML =
        '<div class="art-badge">' + escapeHtml(LANG_NAMES[target] || target) + "</div>" +
        '<div class="lang-word-row"><span class="lang-word">' + escapeHtml(tf.word || "—") + "</span></div>" +
        (tf.ipa ? '<div class="lang-ipa">/' + escapeHtml(tf.ipa) + "/</div>" : "") +
        '<div class="art-title">' + escapeHtml(a.gloss || a.title || "") +
          (a.pos ? " · " + escapeHtml(a.pos) : "") + (tf.gender ? " · " + escapeHtml(tf.gender) : "") + "</div>";
      if (tf.word && window.LangAudio && window.LangAudio.supported()) {
        const row = card.querySelector(".lang-word-row");
        if (row) row.appendChild(window.LangAudio.button(tf.word, target, { label: "Hear " + tf.word + " in " + (LANG_NAMES[target] || target), cls: "big" }));
      }
      wrap.appendChild(card);

      const body = el("div", "atom-body");
      body.appendChild(langRefSection(a, shown));
      if (a.note) body.appendChild(el("div", "lang-note", escapeHtml(a.note)));
      if (a.example) {
        const ex = el("div", "lang-ex");
        ex.appendChild(el("div", "section-label", "Example"));
        [target].concat(shown).forEach((l) => {
          if (!a.example[l]) return;
          ex.appendChild(el("div", "ex-row",
            '<span class="lang-name">' + escapeHtml(LANG_NAMES[l] || l) + "</span> " + escapeHtml(a.example[l])));
        });
        body.appendChild(ex);
      }
      wrap.appendChild(body);
      const cont = el("button", "btn primary wide", "Got it →");
      cont.onclick = () => { if (!E.cardFor(id)) E.grade(id, 3, "recall"); go("home"); };
      wrap.appendChild(cont);
      wrap.appendChild(deeperSection(a));
      mount(wrap);
      return;
    }

    // ---- DRILL mode: a sequenced exercise (fix #3). We do NOT reveal the target word
    // up front (that would defeat recall) — instead a prompt asking for the meaning,
    // then the sequenced exercise stages render below. The full reference card is shown
    // by each stage AFTER the learner answers.
    const stage = el("div", "lang-stage");
    wrap.appendChild(stage);
    wrap.appendChild(deeperSection(a));
    mount(wrap);
    langExercise(a, target, known, shown, stage);
  }

  // Sequenced language exercise (fix #3 + #4). Difficulty ramps WITHIN an atom:
  //   (a) image-or-word multiple choice  → recognition, can't-fail FIRST exposure
  //   (b) word-bank / tap-the-tokens     → assembly with support
  //   (c) typed recall (langDrill)       → hardest, last; the single FSRS signal
  // The stage shown to START at scales with mastery (a brand-new word starts at MC; a
  // well-known word jumps straight to typed recall — no babying a learner who's got it).
  // MC + word-bank are warm-ups (gentle amber/green feedback, no FSRS grade); the typed
  // drill is the one that grades + schedules (and chains the sentence cloze), exactly as
  // before. So FSRS scheduling is unchanged — we only ADD recognition ramps in front.
  function langExercise(a, target, known, shown, mountEl) {
    const m = E.masteryFor(a.id);
    // stage order; entry point by mastery
    const stages = ["mc", "bank", "typed"];
    let idx = m >= 0.7 ? 2 : m >= 0.35 ? 1 : 0;

    function clear() {
      // shim-safe: drop all children + any innerHTML so the next stage is the only content
      if (mountEl.children) Array.prototype.slice.call(mountEl.children).forEach((c) => c.remove());
      mountEl.innerHTML = "";
    }
    function advance() {
      idx++;
      if (idx >= stages.length) return; // typed stage drives next() itself
      runStage();
    }
    function runStage() {
      clear();
      const s = stages[idx];
      if (s === "mc") {
        const node = langMultipleChoice(a, target, known, shown, advance);
        if (!node) { advance(); return; } // not enough distractors → skip to assembly
        mountEl.appendChild(node);
      } else if (s === "bank") {
        const node = langWordBank(a, target, known, shown, advance);
        if (!node) { advance(); return; } // word too short to assemble → skip to typed
        mountEl.appendChild(node);
      } else {
        // typed recall — the existing accent/typo-tolerant drill; it grades FSRS and
        // chains the sentence cloze, then advances the session via next().
        mountEl.appendChild(langDrill(a, target, known));
      }
    }
    runStage();
  }

  // Gather sibling atoms in the SAME category as distractors for multiple choice /
  // word-bank decoys (fix #3 — "distractors drawn from sibling atoms in the same deck").
  function langSiblings(a, target, n) {
    const want = (a.forms[target] || {}).word || "";
    const sameCat = E.atoms.filter((x) =>
      x.id !== a.id && x.category === a.category && x.forms && x.forms[target] && x.forms[target].word && x.forms[target].word !== want);
    // fall back to any atom if the category is too small
    let pool = sameCat;
    if (pool.length < n) {
      const extra = E.atoms.filter((x) => x.id !== a.id && x.forms && x.forms[target] && x.forms[target].word && x.forms[target].word !== want && pool.indexOf(x) < 0);
      pool = pool.concat(shuffle(extra));
    }
    return shuffle(pool).slice(0, n);
  }

  function shuffle(arr) {
    arr = arr.slice();
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }

  // Stage (a): multiple-choice recognition — "Which one is '<gloss>'?" → pick the
  // target word from options. Can't-fail first exposure. Gentle feedback: green Correct
  // → continue; amber Not-quite → reveal the right one + try again. No FSRS grade.
  // Returns null if there aren't enough distinct options (caller falls through).
  function langMultipleChoice(a, target, known, shown, done) {
    const tf = a.forms[target] || {};
    const correct = tf.word || "";
    if (!correct) return null;
    const distractors = langSiblings(a, target, 2).map((x) => x.forms[target].word);
    if (distractors.length < 1) return null; // need at least one decoy
    const options = shuffle([correct].concat(distractors));

    const box = el("div", "drill lang-drill lang-mc");
    box.dataset.concept = a.id; // lets pic-MC (emoji prompt) be mapped back to its atom
    box.appendChild(el("div", "drill-label", "Choose · " + (LANG_NAMES[target] || target)));
    // anchor the meaning via the primary known language (fix #2 — one source)
    const hintLang = shown[0] || known[0];
    const hint = hintLang && a.forms[hintLang];
    // PICTURE multiple-choice (bkt-3s9): when the concept has a curated emoji, show
    // the emoji as the prompt — a true can't-fail picture choice (the Duolingo hook).
    // Falls back to the word/gloss prompt for abstract concepts with no honest picture.
    const emoji = window.LangEmoji && window.LangEmoji.emojiFor(a.id);
    if (emoji) {
      box.classList.add("lang-mc-pic");
      const pic = el("div", "mc-emoji", '<span class="mc-emoji-glyph" role="img" aria-label="' +
        escapeHtml(a.gloss || a.id || "") + '">' + emoji + "</span>");
      box.appendChild(pic);
      box.appendChild(el("div", "q",
        "Which one is this in <b>" + escapeHtml(LANG_NAMES[target] || target) + "</b>?" +
        (hint ? ' <span class="mc-q-hint">(' + escapeHtml(LANG_NAMES[hintLang] || hintLang) + ": " + escapeHtml(hint.word) + ")</span>" : "")));
    } else {
      box.appendChild(el("div", "q",
        "Which one means <b>“" + escapeHtml(a.gloss || a.title || "") + "”</b>" +
        (hint ? " (" + escapeHtml(LANG_NAMES[hintLang] || hintLang) + ": " + escapeHtml(hint.word) + ")" : "") +
        " in " + escapeHtml(LANG_NAMES[target] || target) + "?"));
    }

    const opts = el("div", "mc-options");
    let answered = false;
    const result = el("div", "lang-result hidden");

    options.forEach((w) => {
      const o = el("button", "mc-opt", escapeHtml(w));
      o.type = "button";
      // 🔊 hear the option (recognition is helped by sound)
      if (window.LangAudio && window.LangAudio.supported()) {
        o.appendChild(window.LangAudio.button(w, target, { label: "Hear " + w, cls: "inline" }));
      }
      o.onclick = () => {
        if (answered) return;
        const right = w === correct;
        if (!right) {
          // gentle, non-punishing: amber nudge, mark the wrong choice, let them try again
          if (window.haptic) haptic("wrong");
          o.classList.add("mc-wrong");
          o.disabled = true;
          box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake");
          if (!box.querySelector(".mc-nudge")) box.appendChild(el("div", "mc-nudge", "Not quite — try another."));
          return;
        }
        answered = true;
        if (window.haptic) haptic("correct");
        opts.querySelectorAll(".mc-opt").forEach((b) => { b.disabled = true; });
        o.classList.add("mc-right");
        const nudge = box.querySelector(".mc-nudge"); if (nudge) nudge.remove();
        // green "Correct!" + continue (Duolingo/Khan style)
        result.appendChild(el("div", "lr-head correct",
          '<span class="lr-icon">✓</span><span class="lr-label">Correct!</span>'));
        const ans = el("div", "lr-answer");
        ans.innerHTML = '<span class="a-label">' + escapeHtml(a.gloss || "") + "</span> " +
          '<span class="lang-ans">' + escapeHtml(correct) + (tf.ipa ? " <i>/" + escapeHtml(tf.ipa) + "/</i>" : "") + "</span>";
        if (window.LangAudio && window.LangAudio.supported()) ans.appendChild(window.LangAudio.button(correct, target, { label: "Hear it", cls: "inline" }));
        result.appendChild(ans);
        const actions = el("div", "lr-actions");
        const cont = el("button", "btn primary wide", "Continue →");
        cont.onclick = done;
        actions.appendChild(cont);
        result.appendChild(actions);
        result.classList.remove("hidden");
        try { cont.focus(); } catch (e) {}
      };
      opts.appendChild(o);
    });
    box.appendChild(opts);
    box.appendChild(result);
    return box;
  }

  // Stage (b): word-bank / tap-the-tokens assembly — like Duolingo's "Write this in
  // <lang>" with tappable letter/syllable tiles. The learner builds the target word by
  // tapping tiles (the correct letters + a few decoy letters), then checks. Reuses the
  // accent/typo-tolerant grader. Gentle feedback. No FSRS grade (the typed drill does that).
  // Returns null for very short words (≤2 chars) where assembly adds no value.
  function langWordBank(a, target, known, shown, done) {
    const tf = a.forms[target] || {};
    const correct = tf.word || "";
    if (correct.length < 3) return null;

    const box = el("div", "drill lang-drill lang-bank");
    box.appendChild(el("div", "drill-label", "Build it · " + (LANG_NAMES[target] || target)));
    const hintLang = shown[0] || known[0];
    const hint = hintLang && a.forms[hintLang];
    box.appendChild(el("div", "q",
      "Spell <b>“" + escapeHtml(a.gloss || a.title || "") + "”</b>" +
      (hint ? " (" + escapeHtml(LANG_NAMES[hintLang] || hintLang) + ": " + escapeHtml(hint.word) + ")" : "") +
      " in " + escapeHtml(LANG_NAMES[target] || target) + " — tap the tiles in order:"));

    // tokens = the word's characters (spaces kept as a visible gap), plus a few decoy
    // letters drawn from a sibling word so it isn't a trivial in-order tap.
    const letters = Array.from(correct);
    const sib = langSiblings(a, target, 1)[0];
    const decoySrc = sib ? Array.from(sib.forms[target].word) : [];
    const decoys = shuffle(decoySrc).filter((c) => c.trim()).slice(0, Math.min(3, Math.max(1, Math.round(letters.length / 3))));
    const tiles = shuffle(letters.concat(decoys));

    const assembled = el("div", "bank-assembled");
    const tray = el("div", "bank-tray");
    const result = el("div", "lang-result hidden");
    let built = []; // [{ch, tileEl}]
    let done2 = false;

    function refresh() {
      assembled.innerHTML = "";
      built.forEach((b, i) => {
        const chip = el("button", "bank-chip", escapeHtml(b.ch === " " ? "␣" : b.ch));
        chip.type = "button";
        chip.onclick = () => { if (done2) return; b.tileEl.disabled = false; b.tileEl.classList.remove("used"); built.splice(i, 1); refresh(); };
        assembled.appendChild(chip);
      });
    }
    tiles.forEach((ch) => {
      const t = el("button", "bank-tile", escapeHtml(ch === " " ? "␣" : ch));
      t.type = "button";
      t.onclick = () => { if (done2 || t.disabled) return; t.disabled = true; t.classList.add("used"); built.push({ ch, tileEl: t }); refresh(); };
      tray.appendChild(t);
    });

    box.appendChild(assembled);
    box.appendChild(tray);

    const form = el("div", "bank-actions");
    const check = el("button", "btn primary wide", "Check →");
    check.type = "button";
    function finish() {
      if (done2) return;
      const typed = built.map((b) => b.ch).join("");
      const res = checkLangAnswer(typed, correct, target);
      if (res.verdict === "wrong") {
        // gentle: amber, reveal, offer "show me" / try again — never harsh (fix #4)
        if (window.haptic) haptic("wrong");
        box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake");
        result.innerHTML = "";
        result.appendChild(el("div", "lr-head wrong",
          '<span class="lr-icon">·</span><span class="lr-label">Not quite — try again</span>'));
        const ans = el("div", "lr-answer");
        ans.innerHTML = '<span class="a-label">It\'s</span> <span class="lang-ans">' + escapeHtml(correct) + "</span>";
        if (window.LangAudio && window.LangAudio.supported()) ans.appendChild(window.LangAudio.button(correct, target, { label: "Hear it", cls: "inline" }));
        result.appendChild(ans);
        const actions = el("div", "lr-actions");
        const retry = el("button", "btn ghost wide", "↺ Clear & try again");
        retry.onclick = () => { built.forEach((b) => { b.tileEl.disabled = false; b.tileEl.classList.remove("used"); }); built = []; refresh(); result.classList.add("hidden"); };
        const showMe = el("button", "btn primary wide", "Show me → continue");
        showMe.onclick = () => { done2 = true; done(); };
        actions.appendChild(retry); actions.appendChild(showMe);
        result.appendChild(actions);
        result.classList.remove("hidden");
        return;
      }
      // correct (or close-typo) → green, continue
      done2 = true;
      if (window.haptic) haptic("correct");
      result.innerHTML = "";
      result.appendChild(el("div", "lr-head correct",
        '<span class="lr-icon">✓</span><span class="lr-label">' + (res.verdict === "close" ? "Close enough!" : "Correct!") + "</span>"));
      const ans = el("div", "lr-answer");
      ans.innerHTML = '<span class="a-label">' + escapeHtml(a.gloss || "") + "</span> " +
        '<span class="lang-ans">' + escapeHtml(correct) + (tf.ipa ? " <i>/" + escapeHtml(tf.ipa) + "/</i>" : "") + "</span>";
      if (window.LangAudio && window.LangAudio.supported()) ans.appendChild(window.LangAudio.button(correct, target, { label: "Hear it", cls: "inline" }));
      result.appendChild(ans);
      const actions = el("div", "lr-actions");
      const cont = el("button", "btn primary wide", "Continue →");
      cont.onclick = () => done();
      actions.appendChild(cont);
      result.appendChild(actions);
      result.classList.remove("hidden");
      try { cont.focus(); } catch (e) {}
    }
    check.onclick = finish;
    form.appendChild(check);
    box.appendChild(form);
    box.appendChild(result);
    return box;
  }

  // Typed-recall language drill (bkt-n2v / C3). The learner TYPES the target word;
  // we check it (accent/case/article/typo-tolerant), show correct ✓ / close / wrong
  // (amber, never red), reveal the right spelling, and grade FSRS from the ACTUAL
  // result — Good/Easy on a correct answer (Easy if it was fast & accent-perfect),
  // Hard on a close typo, Again on wrong. An honesty "I actually knew it" override
  // stays available so a learner whose intent was right isn't penalised by a slip.
  function langDrill(a, target, known) {
    const box = el("div", "drill lang-drill");
    box.appendChild(el("div", "drill-label", "Type it · " + (LANG_NAMES[target] || target)));
    const hintLang = known[0];
    const hint = hintLang && a.forms[hintLang];
    box.appendChild(el("div", "q",
      "How do you say <b>“" + escapeHtml(a.gloss || a.title || "") + "”</b>" +
      (hint ? " (" + escapeHtml(LANG_NAMES[hintLang] || hintLang) + ": " + escapeHtml(hint.word) + ")" : "") +
      " in " + escapeHtml(LANG_NAMES[target] || target) + "?"));

    const tf = a.forms[target] || {};
    const correctWord = tf.word || "";

    // input row
    const form = el("form", "lang-typed");
    const input = el("input", "lang-input");
    input.type = "text";
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("aria-label", "Type the word in " + (LANG_NAMES[target] || target));
    input.placeholder = "Type in " + (LANG_NAMES[target] || target) + "…";
    const submit = el("button", "btn primary wide", "Check →");
    submit.type = "submit";
    form.appendChild(input);
    form.appendChild(submit);
    box.appendChild(form);

    // result + reveal block (hidden until checked)
    const result = el("div", "lang-result hidden");
    box.appendChild(result);

    const started = Date.now();
    let graded = false;

    function grade(g) {
      if (graded) return;
      graded = true;
      if (window.haptic) haptic(g === 1 ? "wrong" : g >= 3 ? "correct" : "tap");
      E.grade(a.id, g, "recall");
      // If this atom carries a usable target-language example sentence, follow the
      // word drill with a short cloze (fill-in-the-blank) sentence drill on the SAME
      // screen — practising the word IN CONTEXT — before advancing. The cloze is
      // bonus practice (typed-checked with the same accent-tolerant grader) and does
      // NOT re-grade FSRS, so the word recall stays the single scheduling signal.
      const cloze = clozeForAtom(a, target);
      if (cloze) { box.appendChild(langSentenceDrill(a, target, known, cloze, next)); }
      else next();
    }

    function reveal(res) {
      input.disabled = true;
      submit.disabled = true;
      const fast = (Date.now() - started) < 9000;

      let cls, icon, label;
      let g; // FSRS grade derived from the real result
      if (res.verdict === "correct") {
        cls = "correct"; icon = "✓";
        label = res.accentOnly ? "Right — mind the accent" : "Correct";
        g = (fast && !res.accentOnly) ? 4 : 3; // fast & accent-perfect → Easy, else Good
      } else if (res.verdict === "close") {
        cls = "close"; icon = "≈"; label = "So close — a typo"; g = 2; // Hard
      } else {
        cls = "wrong"; icon = "·"; label = "Not quite"; g = 1; // Again
      }

      const head = el("div", "lr-head " + cls,
        '<span class="lr-icon">' + icon + "</span><span class=\"lr-label\">" + label + "</span>");
      result.appendChild(head);

      // always reveal the correct spelling (+ IPA + audio)
      const ans = el("div", "lr-answer");
      ans.innerHTML = '<span class="a-label">Answer</span> ' +
        '<span class="lang-ans">' + escapeHtml(correctWord) +
        (tf.ipa ? " <i>/" + escapeHtml(tf.ipa) + "/</i>" : "") + "</span>";
      if (window.LangAudio && window.LangAudio.supported()) {
        ans.appendChild(window.LangAudio.button(correctWord, target, { label: "Hear it", cls: "inline" }));
      }
      result.appendChild(ans);

      result.classList.remove("hidden");

      // continue / honesty override
      const actions = el("div", "lr-actions");
      const cont = el("button", "btn primary wide", "Continue →");
      cont.onclick = () => grade(g);
      actions.appendChild(cont);
      if (res.verdict !== "correct") {
        // honesty: learner's intent was right (slip / different valid form)
        const knew = el("button", "btn ghost wide", "I actually knew it");
        knew.onclick = () => grade(3);
        actions.appendChild(knew);
      }
      result.appendChild(actions);

      cont.focus();
    }

    form.onsubmit = (e) => {
      e.preventDefault();
      if (graded || input.disabled) return;
      const res = checkLangAnswer(input.value, correctWord, target);
      reveal(res);
    };

    // "I don't know" → reveal as a miss without forcing a guess.
    const giveUp = el("button", "lang-giveup", "Reveal · I don't know");
    giveUp.type = "button";
    giveUp.onclick = () => { if (graded || input.disabled) return; reveal({ verdict: "wrong", accentOnly: false, expected: correctWord, dist: 99 }); };
    box.appendChild(giveUp);

    setTimeout(() => { try { input.focus(); } catch (e) {} }, 30);
    return box;
  }

  // Build a cloze (fill-in-the-blank) task from an atom's target-language example,
  // by blanking out the target word inside the sentence. Returns null when there's
  // no example, or the target word doesn't appear verbatim in it (so we never show
  // a sentence drill we can't honestly check). The hint sentence is a known-language
  // rendering of the same example when available.
  function clozeForAtom(a, target) {
    const ex = a.example;
    if (!ex || !ex[target]) return null;
    const sentence = String(ex[target]);
    const word = (a.forms[target] || {}).word || "";
    if (!word) return null;
    // case-insensitive, whole-word match on the target word inside the sentence;
    // accent-/letter-exact (we blank the literal surface so the answer is unambiguous).
    var re;
    try { re = new RegExp("(^|[^\\p{L}])(" + escapeRegex(word) + ")(?=$|[^\\p{L}])", "iu"); }
    catch (e) { re = new RegExp("(^|[^A-Za-z\\u00C0-\\u024F])(" + escapeRegex(word) + ")(?=$|[^A-Za-z\\u00C0-\\u024F])", "i"); }
    const m = sentence.match(re);
    if (!m) return null;
    const found = m[2]; // the actual surface as it appears (preserves case)
    const idx = sentence.indexOf(found, m.index);
    if (idx < 0) return null;
    const before = sentence.slice(0, idx);
    const after = sentence.slice(idx + found.length);
    // a known-language gloss of the sentence to anchor meaning (first known lang that has it)
    return { sentence, before, after, answer: found, word };
  }

  function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Sentence/cloze drill: show the target-language example with the word blanked,
  // ask the learner to TYPE the missing word, check it with the SAME accent/typo-
  // tolerant grader (checkLangAnswer), reveal the full sentence, then advance via
  // `done()`. Bonus practice — does not re-grade FSRS (the word drill already did).
  function langSentenceDrill(a, target, known, cloze, done) {
    const box = el("div", "drill lang-drill cloze-drill");
    box.appendChild(el("div", "drill-label", "Use it in a sentence · " + (LANG_NAMES[target] || target)));

    // a known-language rendering of the same example, to anchor meaning
    const hintLang = (known || []).find((l) => a.example && a.example[l]);
    if (hintLang) {
      box.appendChild(el("div", "cloze-hint",
        '<span class="lang-name">' + escapeHtml(LANG_NAMES[hintLang] || hintLang) + "</span> " +
        escapeHtml(a.example[hintLang])));
    }

    // the sentence with a blank where the word goes
    box.appendChild(el("div", "cloze-q",
      escapeHtml(cloze.before) + '<span class="cloze-blank">_____</span>' + escapeHtml(cloze.after)));

    const form = el("form", "lang-typed");
    const input = el("input", "lang-input");
    input.type = "text";
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("aria-label", "Fill in the missing word in " + (LANG_NAMES[target] || target));
    input.placeholder = "Fill the blank…";
    const submit = el("button", "btn primary wide", "Check →");
    submit.type = "submit";
    form.appendChild(input);
    form.appendChild(submit);
    box.appendChild(form);

    const result = el("div", "lang-result hidden");
    box.appendChild(result);

    let done2 = false;
    function reveal(res) {
      if (done2) return;
      input.disabled = true; submit.disabled = true;
      let cls, icon, label;
      if (res.verdict === "correct") { cls = "correct"; icon = "✓"; label = res.accentOnly ? "Right — mind the accent" : "Correct"; }
      else if (res.verdict === "close") { cls = "close"; icon = "≈"; label = "So close — a typo"; }
      else { cls = "wrong"; icon = "·"; label = "Not quite"; }
      if (window.haptic) haptic(res.verdict === "correct" ? "correct" : res.verdict === "close" ? "tap" : "wrong");
      result.appendChild(el("div", "lr-head " + cls,
        '<span class="lr-icon">' + icon + '</span><span class="lr-label">' + label + "</span>"));
      // reveal the full sentence with the answer filled in
      const full = el("div", "lr-answer");
      full.innerHTML = '<span class="a-label">Sentence</span> ' +
        '<span class="lang-ans">' + escapeHtml(cloze.before) +
        "<b>" + escapeHtml(cloze.answer) + "</b>" + escapeHtml(cloze.after) + "</span>";
      if (window.LangAudio && window.LangAudio.supported()) {
        full.appendChild(window.LangAudio.button(cloze.sentence, target, { label: "Hear the sentence", cls: "inline" }));
      }
      result.appendChild(full);
      result.classList.remove("hidden");
      const actions = el("div", "lr-actions");
      const cont = el("button", "btn primary wide", "Continue →");
      cont.onclick = () => { if (done2) return; done2 = true; done(); };
      actions.appendChild(cont);
      result.appendChild(actions);
      cont.focus();
    }

    form.onsubmit = (e) => {
      e.preventDefault();
      if (done2 || input.disabled) return;
      reveal(checkLangAnswer(input.value, cloze.answer, target));
    };

    const skip = el("button", "lang-giveup", "Reveal · I don't know");
    skip.type = "button";
    skip.onclick = () => { if (done2 || input.disabled) return; reveal({ verdict: "wrong", accentOnly: false, expected: cloze.answer, dist: 99 }); };
    box.appendChild(skip);

    setTimeout(() => { try { input.focus(); } catch (e) {} }, 30);
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
    // Ask the tutor — a grounded, Socratic aid scoped to THIS concept (bkt-5jj).
    body.appendChild(tutorAffordance(a));
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
    const share = el("button", "btn ghost wide", "↗ Share Bucket Academy");
    share.onclick = shareAcademy;
    c.appendChild(share);
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
    // On a language deck, drop atoms that lack a form in the chosen TARGET language
    // (relevant for bonus targets like ko/hi/ar, which don't cover every concept) so
    // the level path + queue never serve an empty/unanswerable card. (bkt-3s9)
    if (isLang()) {
      const target = langSettings().target;
      return out.filter((id) => { const a = E.byId[id]; return a && a.forms && a.forms[target] && a.forms[target].word; });
    }
    return out;
  }

  // Leveled path for the LANGUAGE deck (fix #5). Chunk the topo study order into
  // bite-size units (~14 words each) so the learner sees a sequence of levels with a
  // clear "where am I", instead of one flat 448-word list. Each level is named after
  // its dominant category. Returns [{ n, label, ids[], total, done, mastered }].
  const LANG_LEVEL_SIZE = 14;
  function langLevels() {
    const order = studyOrder();
    const levels = [];
    for (let i = 0; i < order.length; i += LANG_LEVEL_SIZE) {
      const ids = order.slice(i, i + LANG_LEVEL_SIZE);
      // name the level by the most common category in the chunk
      const counts = {};
      ids.forEach((id) => { const c = (E.byId[id] || {}).category || "words"; counts[c] = (counts[c] || 0) + 1; });
      const cat = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "words";
      const done = ids.filter((id) => E.cardFor(id)).length;
      const mastered = ids.filter((id) => E.masteryFor(id) >= 0.7).length;
      levels.push({
        n: levels.length + 1,
        label: cat.charAt(0).toUpperCase() + cat.slice(1),
        ids, total: ids.length, done, mastered,
      });
    }
    return levels;
  }
  // The level a given atom id belongs to (1-based), for the atom-screen badge.
  function langLevelOf(id) {
    const order = studyOrder();
    const idx = order.indexOf(id);
    return idx < 0 ? 1 : Math.floor(idx / LANG_LEVEL_SIZE) + 1;
  }
  // The next not-yet-completed level (or the last one once all are done).
  function langCurrentLevel(levels) {
    levels = levels || langLevels();
    return levels.find((lv) => lv.done < lv.total) || levels[levels.length - 1] || null;
  }

  // ---------- language picker (fix #1: explicit setup, not silent defaults) ----------
  // The FIRST thing a learner sees on the Languages branch before any drilling:
  // a clear "I want to learn ___ / I already know ___" choice. Persists via setLangPref
  // (marking the pref `chosen`) so it appears once. No more silent auto-Spanish.
  function screenLangPicker() {
    // TARGET options = every deck language with real coverage (≥80 words), sorted by
    // display name — this is what surfaces the full breadth (14 guaranteed + bonus).
    const metaLangs = (E.meta && E.meta.languages) || ["en"];
    const byName = (a, b) => (LANG_NAMES[a] || a).localeCompare(LANG_NAMES[b] || b);
    const COVER_MIN = 80;
    const targetLangs = langDeckLangs().filter((l) => l !== "en" && langCoverage(l) >= COVER_MIN).sort(byName);
    // KNOWN (source) options = guaranteed meta languages only, so every atom anchors it.
    const knownLangs = metaLangs.slice().sort(byName);
    const cur = langSettings();
    // working selection (defaults sensible, but the learner must confirm)
    let pick = {
      target: targetLangs.includes(cur.target) ? cur.target : targetLangs[0],
      known: knownLangs.includes(cur.primaryKnown) ? cur.primaryKnown : (knownLangs.includes("en") ? "en" : knownLangs[0]),
    };

    const wrap = el("div", "screen lang-picker");
    wrap.appendChild(header());
    const card = el("div", "picker-card");
    card.appendChild(el("div", "picker-kicker", "Languages"));
    card.appendChild(el("h1", "picker-h1", "Set up your course"));
    card.appendChild(el("p", "picker-sub", "Pick one of " + targetLangs.length + " languages to learn and the language you already know. You can change both later in Progress."));

    function langGrid(role, options, getVal, setVal) {
      const grid = el("div", "picker-grid");
      options.forEach((l) => {
        const opt = el("button", "picker-opt", escapeHtml(LANG_NAMES[l] || l));
        opt.dataset.l = l;
        opt.onclick = () => {
          setVal(l);
          // keep target != known
          if (pick.target === pick.known) {
            if (role === "target") pick.known = knownLangs.find((x) => x !== pick.target) || pick.known;
            else pick.target = targetLangs.find((x) => x !== pick.known) || pick.target;
          }
          render();
        };
        grid.appendChild(opt);
      });
      grid.querySelectorAll(".picker-opt").forEach((b) => b.classList.toggle("on", b.dataset.l === getVal()));
      return grid;
    }

    const body = el("div", "picker-body");
    function render() {
      body.innerHTML = "";
      const t = el("div", "picker-field");
      t.appendChild(el("div", "picker-label", "I want to learn"));
      t.appendChild(langGrid("target", targetLangs, () => pick.target, (l) => { pick.target = l; }));
      body.appendChild(t);
      const k = el("div", "picker-field");
      k.appendChild(el("div", "picker-label", "I already know"));
      k.appendChild(langGrid("known", knownLangs, () => pick.known, (l) => { pick.known = l; }));
      body.appendChild(k);
      const start = el("button", "btn primary wide picker-start",
        "Start learning " + escapeHtml(LANG_NAMES[pick.target] || pick.target) + " →");
      start.disabled = pick.target === pick.known;
      start.onclick = () => {
        setLangPref(pick.target, [pick.known], { primaryKnown: pick.known, polyglot: false, chosen: true });
        go("home");
      };
      body.appendChild(start);
    }
    render();
    card.appendChild(body);
    // honesty: this is an experiment, set expectations up front
    card.appendChild(langHonestyBanner());
    wrap.appendChild(card);
    return wrap;
  }

  // Honesty banner (fix #5): Languages is an early experiment, not a finished course.
  // Mirrors CLAUDE.md's "don't oversell" rule (small deck, TTS-not-recorded audio,
  // residual sense-noise). Reused on the picker, study, and home screens.
  function langHonestyBanner() {
    return el("div", "lang-honesty",
      '<span class="lh-ico">⚗</span>' +
      '<span class="lh-txt"><b>Languages is an early experiment</b>, not a finished course — ' +
      'a small starter deck, spoken aloud by your device (not studio audio), with the occasional rough edge. ' +
      'We\'re sharing it honestly while it grows.</span>');
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
    const ls = langSettings();
    const target = ls.target, shown = ls.shown;
    wrap.appendChild(el("h1", "study-h1", (LANG_NAMES[target] || target) + " — all words"));
    wrap.appendChild(el("p", "study-sub", ls.polyglot
      ? "Every word grouped by topic, shown across the languages you know. Tap to practice."
      : "Every word grouped by topic, anchored in " + (LANG_NAMES[ls.primaryKnown] || ls.primaryKnown) + ". Tap to practice."));
    wrap.appendChild(langHonestyBanner());

    // Word explorer entry — the Polingual cross-lingual comparison surface.
    const exploreCta = el("button", "explore-cta reveal-up",
      '<span class="xc-ico">✦</span>' +
      '<span class="xc-copy"><span class="xc-title">Explore words across languages</span>' +
      '<span class="xc-sub">Look up any word — see it by meaning, sound, spelling &amp; root across 27 languages.</span></span>' +
      '<span class="xc-go">→</span>');
    exploreCta.onclick = () => go("explore");
    wrap.appendChild(exploreCta);
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
        shown.forEach((l) => { const f = a.forms[l]; if (f) blk.appendChild(el("div", "lang-row", '<span class="lang-name">' + escapeHtml(LANG_NAMES[l] || l) + "</span><span class=\"lang-w\">" + escapeHtml(f.word) + "</span>")); });
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

  /* ---------- Polingual word explorer (bkt-nhy / bkt-2ea) ----------
   * HYBRID five-lens cross-lingual comparison. Each lens tries the LIVE full
   * 45k-photon index first (same-origin proxy `/api/polingual`, via the new
   * Polingual.*Async wrappers) and falls back to the baked ~6.5k-word starter
   * subset when offline / the service is unavailable. Lazy-loads the subset
   * asset on first open (instant default + offline engine). Honest empty
   * states; async loading states on lookup + lens switch; mobile + keyboard
   * friendly. `ref` identifies a word: a numeric subset row, OR {surface,lang}
   * for a full-index word that isn't in the baked subset.
   */
  let explorerState = { query: "", lang: "", ref: null, lens: "meaning", source: null };
  // monotonic token so a slow in-flight lens/lookup can't overwrite a newer one
  let xplToken = 0;

  function xplRefKey(ref) {
    if (ref == null) return "";
    if (typeof ref === "number") return "row:" + ref;
    return (ref.lang || "") + ":" + (ref.surface != null ? ref.surface : ref.s || "");
  }

  // The "offline — showing starter set" note, shown ONLY on the subset path.
  function xplSourceNote(source) {
    if (source !== "subset") return null;
    return el("div", "xpl-offline-note",
      '<span class="xpl-offline-dot">●</span> Offline — showing the starter set ' +
      '(~6.5k words). The full 45-language index loads when you’re back online.');
  }

  function screenExplorer() {
    const wrap = el("div", "screen explorer");
    wrap.appendChild(header());
    wrap.appendChild(el("div", "kicker", "Polingual · explore"));
    wrap.appendChild(el("h1", "study-h1", "Word explorer"));
    wrap.appendChild(el("p", "study-sub",
      "Look up a word, then compare it across 27 languages by meaning, sound, spelling and root."));

    // search row
    const form = el("form", "xpl-search");
    form.setAttribute("role", "search");
    const input = el("input", "xpl-input");
    input.type = "search";
    input.placeholder = "Type a word — e.g. light, water, love";
    input.setAttribute("aria-label", "Search for a word");
    input.autocomplete = "off";
    input.autocapitalize = "off";
    input.spellcheck = false;
    input.value = explorerState.query || "";
    const go2 = el("button", "xpl-go", "Look up");
    go2.type = "submit";
    form.appendChild(input);
    form.appendChild(go2);
    wrap.appendChild(form);

    const results = el("div", "xpl-results");
    results.setAttribute("aria-live", "polite");
    wrap.appendChild(results);

    // attribution (REQUIRED — visible on the explorer)
    const attrib = el("div", "xpl-attrib",
      'Data: Wiktionary via <a href="https://kaikki.org" target="_blank" rel="noopener">Kaikki</a> ' +
      '(CC-BY-SA 3.0). Short glosses only — full entries at ' +
      '<a href="https://en.wiktionary.org" target="_blank" rel="noopener">Wiktionary</a>.');
    wrap.appendChild(attrib);

    wrap.appendChild(nav("study"));
    mount(wrap);

    form.onsubmit = (e) => {
      e.preventDefault();
      explorerState.query = input.value.trim();
      explorerState.ref = null;
      runExplorerSearch(results, input.value.trim());
    };

    // boot the engine; show loading state, then either prior result or seed prompt
    results.innerHTML = '<div class="xpl-loading">Loading the word index…</div>';
    if (!window.Polingual) {
      results.innerHTML = '<div class="xpl-empty">Explorer engine unavailable.</div>';
      return;
    }
    window.Polingual.load().then(() => {
      if (explorerState.ref != null) {
        renderExplorerWord(results, explorerState.ref);
      } else if (explorerState.query) {
        runExplorerSearch(results, explorerState.query);
      } else {
        renderExplorerSeed(results, input);
      }
      // focus input on desktop (skip on touch to avoid keyboard jump)
      if (!("ontouchstart" in window)) setTimeout(() => input.focus(), 40);
    }).catch((err) => {
      results.innerHTML = '<div class="xpl-empty">Couldn\'t load the word index.' +
        '<br><span class="xpl-empty-sub">Run via a local server (./serve.sh). ' +
        escapeHtml(String(err && err.message || err)) + '</span></div>';
    });
  }

  // Seed view: a few inviting starter words + the language count.
  function renderExplorerSeed(host, input) {
    const m = window.Polingual.manifest() || {};
    host.innerHTML = "";
    const intro = el("div", "xpl-seed");
    intro.appendChild(el("p", "xpl-seed-h",
      (m.words || 0).toLocaleString() + " core words · " +
      (m.languages ? m.languages.length : 0) + " languages"));
    const chips = el("div", "xpl-chips");
    ["light", "water", "love", "star", "fire", "mother", "free", "gold"].forEach((w) => {
      const c = el("button", "xpl-chip", escapeHtml(w));
      c.type = "button";
      c.onclick = () => {
        explorerState.query = w;
        if (input) input.value = w;
        runExplorerSearch(host, w);
      };
      chips.appendChild(c);
    });
    intro.appendChild(el("div", "xpl-seed-label", "Try"));
    intro.appendChild(chips);
    host.appendChild(intro);
  }

  // Run a free-text lookup. Tries the LIVE full index first (so a word NOT in
  // the baked subset still resolves when online), else the subset's fuzzy
  // lookup, else honest empty. Async with a loading state.
  function runExplorerSearch(host, q) {
    if (!q) { renderExplorerSeed(host, null); return; }
    const P = window.Polingual;
    const myToken = ++xplToken;
    host.innerHTML = '<div class="xpl-loading">Looking up <b>' + escapeHtml(q) + '</b>…</div>';
    P.lookupAsync(q).then((res) => {
      if (myToken !== xplToken) return; // a newer search superseded this one
      const rec = res && res.record;
      if (!rec) {
        host.innerHTML =
          '<div class="xpl-empty">No match for <b>' + escapeHtml(q) + '</b>.' +
          '<br><span class="xpl-empty-sub">Try a common word like ' +
          '<i>light</i>, <i>water</i> or <i>star</i>' +
          (res && res.source === "subset"
            ? ' — you appear to be offline, so only the ~6.5k-word starter set is available.'
            : '.') +
          '</span></div>';
        return;
      }
      explorerState.ref = rec.ref != null ? rec.ref : rec.row;
      explorerState.source = res.source;
      renderExplorerWordRec(host, rec, res.source, res.attribution);
    }).catch(() => {
      if (myToken !== xplToken) return;
      host.innerHTML = '<div class="xpl-empty">Couldn’t look up <b>' + escapeHtml(q) + '</b>.</div>';
    });
  }

  // Navigate to a word by ref (numeric subset row OR {surface,lang} full-index).
  // Resolves the headword (live-first) then renders. Async with a loading card.
  function renderExplorerWord(host, ref) {
    const P = window.Polingual;
    const myToken = ++xplToken;
    host.innerHTML = '<div class="xpl-loading">Loading…</div>';
    P.lookupAsync(ref).then((res) => {
      if (myToken !== xplToken) return;
      const rec = res && res.record;
      if (!rec) { renderExplorerSeed(host, null); return; }
      explorerState.ref = rec.ref != null ? rec.ref : rec.row;
      explorerState.source = res.source;
      renderExplorerWordRec(host, rec, res.source, res.attribution);
    }).catch(() => {
      if (myToken !== xplToken) return;
      renderExplorerSeed(host, null);
    });
  }

  // The result card + lens sections for one already-resolved word record.
  function renderExplorerWordRec(host, rec, source, attribution) {
    if (!rec) { renderExplorerSeed(host, null); return; }
    const ref = rec.ref != null ? rec.ref : rec.row;
    explorerState.ref = ref;
    host.innerHTML = "";

    // subtle source note (only shown on the offline / subset fallback path)
    const note = xplSourceNote(source);
    if (note) host.appendChild(note);

    // headline card
    const card = el("div", "xpl-card reveal-up");
    const top = el("div", "xpl-card-top");
    top.innerHTML =
      '<span class="xpl-surface">' + escapeHtml(rec.surface) + "</span>" +
      (rec.ipa ? '<span class="xpl-ipa">/' + escapeHtml(rec.ipa) + "/</span>" : "");
    // 🔊 hear the looked-up word (on-device Web Speech; hidden if unavailable).
    if (rec.surface && rec.lang && window.LangAudio && window.LangAudio.supported()) {
      top.appendChild(window.LangAudio.button(rec.surface, rec.lang, { label: "Hear " + rec.surface + " in " + (rec.langName || rec.lang) }));
    }
    card.appendChild(top);
    const meta = el("div", "xpl-meta");
    meta.innerHTML =
      '<span class="xpl-lang">' + escapeHtml(rec.langName) + "</span>" +
      (rec.pos ? '<span class="xpl-pos">' + escapeHtml(rec.pos) + "</span>" : "") +
      (rec.concept ? '<span class="xpl-concept">' + escapeHtml(rec.concept) + "</span>" : "");
    card.appendChild(meta);
    if (rec.gloss) card.appendChild(el("p", "xpl-gloss", escapeHtml(rec.gloss)));
    host.appendChild(card);

    // lens tabs
    const LENSES = [
      ["meaning", "Meaning"],
      ["sound", "Sound"],
      ["spelling", "Spelling"],
      ["root", "Etymology"],
      ["translate", "Translations"],
    ];
    const tabs = el("div", "xpl-tabs");
    tabs.setAttribute("role", "tablist");
    LENSES.forEach(([k, lbl]) => {
      const b = el("button", "xpl-tab" + (explorerState.lens === k ? " on" : ""), lbl);
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", explorerState.lens === k ? "true" : "false");
      b.onclick = () => {
        explorerState.lens = k;
        tabs.querySelectorAll(".xpl-tab").forEach((t) => {
          const on = t === b;
          t.classList.toggle("on", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
        });
        renderExplorerLens(panel, ref, k, rec);
      };
      tabs.appendChild(b);
    });
    host.appendChild(tabs);

    const panel = el("div", "xpl-panel");
    panel.setAttribute("role", "tabpanel");
    host.appendChild(panel);
    renderExplorerLens(panel, ref, explorerState.lens, rec);

    // a "back to top / new search" affordance lives in the search box above.
    revealAndRender(host, ".xpl-card");
    window.scrollTo(0, 0);
  }

  // A clickable neighbor row (taps navigate to that word — full-index aware).
  function explorerNeighborRow(rec, scoreText) {
    const r = el("button", "xpl-row");
    r.type = "button";
    r.innerHTML =
      '<span class="xpl-row-lang">' + escapeHtml(rec.langName) + "</span>" +
      '<span class="xpl-row-surface">' + escapeHtml(rec.surface) + "</span>" +
      (rec.ipa ? '<span class="xpl-row-ipa">/' + escapeHtml(rec.ipa) + "/</span>" : '<span class="xpl-row-ipa"></span>') +
      '<span class="xpl-row-gloss">' + escapeHtml(rec.gloss || "") + "</span>" +
      (scoreText ? '<span class="xpl-row-score">' + scoreText + "</span>" : "");
    r.onclick = () => {
      const host = $(".xpl-results");
      const navRef = rec.ref != null ? rec.ref : rec.row;
      if (host && navRef != null) renderExplorerWord(host, navRef);
    };
    return r;
  }

  function explorerEmpty(msg) {
    return el("div", "xpl-lens-empty", escapeHtml(msg));
  }

  function xplLensLoading() {
    return el("div", "xpl-lens-loading", "Comparing across languages…");
  }

  // Render a lens for a word `ref`, async (live-first, subset fallback). `self`
  // is the already-resolved headword record (so we know hasPhonetic etc.).
  function renderExplorerLens(panel, ref, lens, self) {
    const P = window.Polingual;
    panel.innerHTML = "";
    const myToken = ++xplToken;
    // capture which lens this render is for, so a stale resolve can't paint over
    // a tab the user has since switched away from.
    const myLens = lens;
    const stillCurrent = () => myToken === xplToken && explorerState.lens === myLens;

    const renderNeighbors = (caption, res, emptyMsg) => {
      if (!stillCurrent()) return;
      panel.innerHTML = "";
      panel.appendChild(el("p", "xpl-lens-cap", caption));
      const recs = (res && res.records) || [];
      const note = xplSourceNote(res && res.source);
      if (note) panel.appendChild(note);
      if (!recs.length) { panel.appendChild(explorerEmpty(emptyMsg)); return; }
      recs.forEach((r) => panel.appendChild(explorerNeighborRow(r, null)));
    };

    if (lens === "meaning") {
      const caption = "Words that mean the same — across languages (semantic vectors).";
      panel.appendChild(el("p", "xpl-lens-cap", caption));
      panel.appendChild(xplLensLoading());
      P.semanticAsync(ref, 12, { crossLingualOnly: false })
        .then((res) => renderNeighbors(caption, res, "No semantic neighbors found."))
        .catch(() => { if (stillCurrent()) { panel.innerHTML = ""; panel.appendChild(el("p", "xpl-lens-cap", caption)); panel.appendChild(explorerEmpty("No semantic neighbors found.")); } });

    } else if (lens === "sound") {
      const caption = "Words that sound alike — language-agnostic (phonetic vectors over IPA).";
      panel.appendChild(el("p", "xpl-lens-cap", caption));
      if (self && self.hasPhonetic === false) {
        panel.appendChild(explorerEmpty("This word has no IPA transcription, so the sound lens is unavailable."));
        return;
      }
      panel.appendChild(xplLensLoading());
      P.phoneticAsync(ref, 12)
        .then((res) => renderNeighbors(caption, res, "No phonetic neighbors found."))
        .catch(() => { if (stillCurrent()) { panel.innerHTML = ""; panel.appendChild(el("p", "xpl-lens-cap", caption)); panel.appendChild(explorerEmpty("No phonetic neighbors found.")); } });

    } else if (lens === "spelling") {
      const caption = "Words spelled similarly (normalized edit distance).";
      panel.appendChild(el("p", "xpl-lens-cap", caption));
      panel.appendChild(xplLensLoading());
      P.spellingAsync(ref, 12)
        .then((res) => renderNeighbors(caption, res, "No similarly-spelled words found."))
        .catch(() => { if (stillCurrent()) { panel.innerHTML = ""; panel.appendChild(el("p", "xpl-lens-cap", caption)); panel.appendChild(explorerEmpty("No similarly-spelled words found.")); } });

    } else if (lens === "root") {
      renderEtymologyLens(panel, ref, stillCurrent);

    } else if (lens === "translate") {
      renderTranslateLens(panel, ref, stillCurrent);
    }
  }

  function renderTranslateLens(panel, ref, stillCurrent) {
    const P = window.Polingual;
    const ok = stillCurrent || (() => true);
    panel.appendChild(el("p", "xpl-lens-cap", "Translations across languages."));
    panel.appendChild(xplLensLoading());
    P.translateAsync(ref).then((t) => {
      if (!ok()) return;
      panel.innerHTML = "";
      panel.appendChild(el("p", "xpl-lens-cap",
        t.concept ? 'The concept "' + escapeHtml(t.concept) + '" across languages.'
                  : "Translations across languages."));
      const note = xplSourceNote(t.origin);
      if (note) panel.appendChild(note);
      const results = t.results || [];
      if (!results.length) {
        panel.appendChild(explorerEmpty(
          t.origin === "subset"
            ? "This word isn't anchored to a shared concept in the starter index — try the Meaning lens for cross-lingual neighbors."
            : "No translations available for this word."));
        return;
      }
      const table = el("div", "xpl-trans");
      results.forEach((r) => table.appendChild(explorerNeighborRow(r, null)));
      panel.appendChild(table);
    }).catch(() => {
      if (!ok()) return;
      panel.innerHTML = "";
      panel.appendChild(el("p", "xpl-lens-cap", "Translations across languages."));
      panel.appendChild(explorerEmpty("No translations available for this word."));
    });
  }

  // Etymology: the Kaikki snippet for this word (live-first), then — on the
  // subset fallback — a simple root chain across same-concept siblings.
  function renderEtymologyLens(panel, ref, stillCurrent) {
    const P = window.Polingual;
    const ok = stillCurrent || (() => true);
    panel.appendChild(xplLensLoading());
    P.etymologyAsync(ref).then((res) => {
      if (!ok()) return;
      panel.innerHTML = "";
      const ety = res && res.ety;
      const note = xplSourceNote(res && res.source);
      if (note) panel.appendChild(note);
      if (ety) {
        const box = el("div", "xpl-ety");
        box.appendChild(el("p", "xpl-ety-text", escapeHtml(ety.text)));
        const src = el("p", "xpl-ety-src",
          '<a href="' + ety.url + '" target="_blank" rel="noopener">' +
          escapeHtml(ety.surface) + " on Wiktionary</a> · " + escapeHtml(ety.source));
        box.appendChild(src);
        panel.appendChild(box);
      } else {
        panel.appendChild(explorerEmpty("No etymology recorded for this word."));
      }
      // sibling roots only make sense on the subset path (concept-anchored).
      if (res && res.source === "subset" && typeof ref === "number") {
        const t = P.translate(ref);
        const sibs = (t.results || []).filter((r) => {
          const e = P.etymology(r.row);
          return e && e.text;
        }).slice(0, 6);
        if (sibs.length) {
          panel.appendChild(el("p", "xpl-lens-cap xpl-ety-rel", "Related roots (same concept)"));
          const tree = el("div", "xpl-tree");
          sibs.forEach((r) => {
            const e = P.etymology(r.row);
            const node = el("div", "xpl-tree-node");
            node.innerHTML =
              '<button class="xpl-tree-head" type="button">' +
              '<span class="xpl-row-lang">' + escapeHtml(r.langName) + "</span>" +
              '<span class="xpl-row-surface">' + escapeHtml(r.surface) + "</span></button>" +
              '<p class="xpl-tree-ety">' + escapeHtml((e.text || "").slice(0, 160) + (e.text && e.text.length > 160 ? "…" : "")) + "</p>";
            node.querySelector(".xpl-tree-head").onclick = () => {
              const host = $(".xpl-results");
              if (host) renderExplorerWord(host, r.row);
            };
            tree.appendChild(node);
          });
          panel.appendChild(tree);
        }
      }
    }).catch(() => {
      if (!ok()) return;
      panel.innerHTML = "";
      panel.appendChild(explorerEmpty("No etymology recorded for this word."));
    });
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
      .then((res) => {
        const rec = res && res.profile ? res.profile : null;
        // cache for the global "Share Bucket Academy" action (prefer public profile)
        shareProfileHandle = rec && rec.handle ? { handle: rec.handle, isPublic: !!rec.isPublic } : null;
        render(rec);
      })
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

    // "Test yourself" — a sealed self-test that sharpens the mastery estimate (bkt-v7y).
    // Concept branches only (polyglot keeps its own recall drill), and only once the
    // learner has started something to be tested on. Fully skippable; never blocks Study.
    if (!isLang() && window.Assess && s.introduced > 0) {
      const log = readAssessLog();
      const last = (log.runs || [])[log.runs.length - 1];
      const subTxt = last
        ? "Last: " + last.correct + "/" + last.total + " · " + Math.round((last.score || 0) * 100) + "%"
        : "Sharpen your mastery estimate with a sealed self-test.";
      const cta = el("button", "place-cta assess-cta",
        '<span class="pc-ico">▰</span>' +
        '<span class="pc-copy"><span class="pc-title">Test yourself</span>' +
        '<span class="pc-sub">' + escapeHtml(subTxt) + "</span></span>" +
        '<span class="pc-go">→</span>');
      cta.onclick = () => go("assess");
      wrap.appendChild(cta);
    }

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

    // language branch: choose target + primary source + advanced polyglot toggle
    if (isLang()) {
      const ls = langSettings();
      const target = ls.target, known = ls.known, langs = ls.langs;
      const tRow = el("label", "set-row", "Language I'm learning");
      const tSel = el("select", "lang-sel");
      langs.forEach((l) => {
        const o = el("option", null, LANG_NAMES[l] || l); o.value = l; if (l === target) o.selected = true; tSel.appendChild(o);
      });
      tSel.onchange = () => {
        const nt = tSel.value;
        const nk = (langSettings().known || []).filter((l) => l !== nt);
        const finalKnown = nk.length ? nk : langs.filter((l) => l !== nt).slice(0, 1);
        const pk = finalKnown.includes(ls.primaryKnown) ? ls.primaryKnown : finalKnown[0];
        setLangPref(nt, finalKnown, { primaryKnown: pk, chosen: true });
        go("progress");
      };
      tRow.appendChild(tSel); settings.appendChild(tRow);

      // Primary source language — the ONE language a beginner learns FROM (fix #2).
      const pRow = el("label", "set-row", "I learn from (my main language)");
      const pSel = el("select", "lang-sel");
      langs.filter((l) => l !== target).forEach((l) => {
        const o = el("option", null, LANG_NAMES[l] || l); o.value = l; if (l === ls.primaryKnown) o.selected = true; pSel.appendChild(o);
      });
      pSel.onchange = () => {
        const pk = pSel.value;
        // ensure the primary is in the known set
        let nk = (langSettings().known || []).slice();
        if (!nk.includes(pk)) nk = [pk].concat(nk);
        setLangPref(target, nk, { primaryKnown: pk, chosen: true });
        go("progress");
      };
      pRow.appendChild(pSel); settings.appendChild(pRow);

      // Advanced: polyglot mode — show each word in EVERY language you know at once.
      // OFF by default (fix #2). A real toggle, not the lead experience.
      const polyRow = el("label", "set-row", "Polyglot mode (advanced — show all my languages)");
      const polySw = el("input"); polySw.type = "checkbox"; polySw.checked = ls.polyglot;
      polySw.onchange = () => { setLangPref(target, langSettings().known, { polyglot: polySw.checked, chosen: true }); go("progress"); };
      polyRow.appendChild(polySw); settings.appendChild(polyRow);

      // The extra languages used by polyglot mode (only meaningful when polyglot is on).
      settings.appendChild(el("div", "set-hint", ls.polyglot
        ? "Languages shown alongside each word in polyglot mode:"
        : "Extra languages you know (only used in polyglot mode):"));
      const kWrap = el("div", "lang-known");
      langs.filter((l) => l !== target).forEach((l) => {
        const on = known.includes(l);
        const isPrimary = l === ls.primaryKnown;
        const chip = el("button", "lang-chip" + (on ? " on" : "") + (isPrimary ? " primary" : ""),
          escapeHtml(LANG_NAMES[l] || l) + (isPrimary ? " ·main" : ""));
        chip.onclick = () => {
          if (isPrimary) return; // the primary source is always known; change it above
          let nk = (langSettings().known || []).slice();
          nk = nk.includes(l) ? nk.filter((x) => x !== l) : nk.concat(l);
          if (!nk.includes(ls.primaryKnown)) nk = [ls.primaryKnown].concat(nk);
          if (!nk.length) nk = [l];
          setLangPref(target, nk, { chosen: true });
          go("progress");
        };
        kWrap.appendChild(chip);
      });
      settings.appendChild(kWrap);

      // Re-run the explicit course setup picker.
      const redo = el("button", "btn ghost wide", "Redo course setup");
      redo.onclick = () => go("lang-picker");
      settings.appendChild(redo);
    }

    // Re-take placement — re-run the adaptive diagnostic to re-estimate the frontier.
    if (!isLang() && typeof window.Diagnostic === "function") {
      const place = el("button", "btn ghost wide", "Re-take placement");
      place.onclick = () => go("diagnostic");
      settings.appendChild(place);
    }

    // Share the academy (growth loop) + replay the first-run intro.
    const shareBtn = el("button", "btn ghost wide", "↗ Share Bucket Academy");
    shareBtn.onclick = shareAcademy;
    settings.appendChild(shareBtn);

    if (window.BucketOnboarding) {
      const replay = el("button", "btn ghost wide", "Replay intro");
      replay.onclick = () => {
        window.BucketOnboarding.clearOnboarded();
        runOnboarding((where) => go(where || "home"));
      };
      settings.appendChild(replay);
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

  /* ---------- "Test yourself" assessment (bkt-v7y) ----------
   * A SEALED self-test, deliberately separate from practice (Study + drill). Practice is
   * show-answer-then-self-rate (FSRS, retries — farmable by design); an assessment hides
   * the answer until you respond, grades numeric/short-symbolic answers DETERMINISTICALLY
   * (bkt-3so), and falls back to an HONEST, clearly-marked self-check for prose (lower
   * trust). Results are stored in a SEPARATE log (the practice/credential firewall
   * STRUCTURE, bkt-dji) and fed into the engine proficiency so the Mastery Profile reflects
   * TESTED proficiency — never a certified or public rating (that's gated on bkt-4at + the
   * AI key: real held-out, freshly-generated transfer items + anti-gaming come later). */

  // Firewall: assessment results live in their OWN localStorage namespace, kept apart from
  // the engine's practice state (FSRS cards / xp / streak). This is the structural
  // separation between practice and credential signal (bkt-dji).
  function assessLogKey() {
    const branch = (E.meta && E.meta.branch) || "default";
    return "bucket-academy/assess/" + branch;
  }
  function readAssessLog() {
    try { return JSON.parse(localStorage.getItem(assessLogKey())) || { runs: [] }; }
    catch (e) { return { runs: [] }; }
  }
  function appendAssessRun(record) {
    const log = readAssessLog();
    log.runs = (log.runs || []).concat(record).slice(-50); // keep last 50 runs
    try { localStorage.setItem(assessLogKey(), JSON.stringify(log)); } catch (e) {}
  }

  // Entry point: build a sealed run over the current branch (or a chosen concept set).
  function startAssessment(conceptIds) {
    if (!window.Assess || typeof window.Assess.buildRun !== "function") return go("home");
    const graph = { atoms: E.atoms, byId: E.byId, branch: (E.meta && E.meta.branch) || null };
    const state = { cardForId: (id) => E.cardFor(id) };
    const run = window.Assess.buildRun(graph, state, {
      size: 10,
      conceptIds: conceptIds && conceptIds.length ? conceptIds : null,
    });
    if (!run.items.length) {
      toast("Study a few concepts first, then test yourself.");
      return go("study");
    }
    assess = { run, i: 0, results: [], revealed: false, item: null, startedAt: Date.now(), itemStart: 0 };
    renderAssessIntro();
  }

  function renderAssessIntro() {
    const wrap = el("div", "screen assess");
    wrap.appendChild(header());
    const intro = el("div", "assess-intro");
    const n = assess.run.items.length;
    intro.innerHTML =
      '<div class="as-mark">▰</div>' +
      "<h1>Test yourself</h1>" +
      "<p>A sealed self-test of <b>" + n + "</b> question" + (n === 1 ? "" : "s") +
      " across what you've been learning. You'll answer first, then see the solution — " +
      "no peeking.</p>" +
      '<p class="assess-honest">This sharpens your mastery estimate. It is not a grade or ' +
      "a certificate — just an honest signal, for you.</p>";
    const start = el("button", "btn primary wide", "Begin →");
    start.onclick = () => assessNext();
    intro.appendChild(start);
    const skip = el("button", "assess-skip", "Not now");
    skip.onclick = () => { assess = null; go("progress"); };
    intro.appendChild(skip);
    wrap.appendChild(intro);
    mount(wrap);
  }

  function assessNext() {
    if (!assess) return go("home");
    if (assess.i >= assess.run.items.length) return assessFinish();
    assess.item = assess.run.items[assess.i];
    assess.revealed = false;
    assess.itemStart = Date.now();
    renderAssessQuestion();
  }

  function renderAssessQuestion() {
    const item = assess.item;
    const wrap = el("div", "screen assess");
    wrap.appendChild(header());

    const top = el("div", "atom-top");
    const quit = el("button", "ghost", "End test");
    quit.onclick = () => { if (confirm("End this self-test? Your answers so far won't be saved.")) { assess = null; go("progress"); } };
    top.appendChild(quit);
    top.appendChild(el("span", "diag-step", "Q" + (assess.i + 1) + " / " + assess.run.items.length + " · " + item.level));
    wrap.appendChild(top);

    const bar = el("div", "diag-bar");
    bar.appendChild(el("i")).style.width = Math.round((assess.i / assess.run.items.length) * 100) + "%";
    wrap.appendChild(bar);

    const box = el("div", "diag-q assess-q");
    box.appendChild(el("div", "dq-label", "Retrieve · " + item.level));
    box.appendChild(el("div", "dq-concept", escapeHtml(item.title || item.atomId)));
    box.appendChild(el("div", "dq-prompt", item.prompt));
    if (item.eq) box.appendChild(el("div", "q-eq", "$$" + item.eq + "$$"));

    // sealed input — the learner types their answer BEFORE the solution exists on screen.
    const inWrap = el("div", "assess-input-row");
    const input = el("input", "assess-input");
    input.type = "text";
    input.placeholder = "Your answer…";
    input.autocapitalize = "off";
    input.autocomplete = "off";
    input.spellcheck = false;
    inWrap.appendChild(input);
    box.appendChild(inWrap);

    const submit = el("button", "btn primary wide", "Submit answer");
    submit.onclick = () => assessGrade(item, input.value);
    box.appendChild(submit);
    input.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); assessGrade(item, input.value); } };

    wrap.appendChild(box);
    mount(wrap);
    katex(wrap);
    setTimeout(() => { try { input.focus(); } catch (e) {} }, 40);
  }

  // Grade the submitted answer. Deterministic where possible (laurel ✓ / amber — never
  // red); otherwise reveal the solution and ask for an HONEST self-check (lower trust).
  function assessGrade(item, userInput) {
    const verdict = window.Assess.gradeAnswer(userInput, item.answer);
    const latency = Math.max(0, Date.now() - assess.itemStart);
    if (verdict.gradable) {
      // deterministic verdict — record + animate, no self-report needed.
      recordAssessItem(item, verdict.correct, true, latency);
      renderAssessVerdict(item, userInput, verdict, /*auto*/ true);
    } else {
      // honest fallback: reveal the canonical answer, let the learner self-check.
      renderAssessSelfCheck(item, userInput, latency);
    }
  }

  // Deterministic verdict moment: laurel check for correct, amber nudge for incorrect.
  function renderAssessVerdict(item, userInput, verdict, auto) {
    const wrap = el("div", "screen assess");
    wrap.appendChild(header());
    const top = el("div", "atom-top");
    top.appendChild(el("span", "prog", ""));
    top.appendChild(el("span", "diag-step", "Q" + (assess.i + 1) + " / " + assess.run.items.length));
    wrap.appendChild(top);

    const box = el("div", "diag-q assess-q");
    box.appendChild(el("div", "dq-concept", escapeHtml(item.title || item.atomId)));
    box.appendChild(el("div", "dq-prompt", item.prompt));

    const fb = el("div", "fb " + (verdict.correct ? "right" : "wrong"));
    fb.innerHTML = verdict.correct
      ? '<span class="fb-mark laurel">' + checkmarkSVG() + "</span>" +
        '<span class="fb-text"><b>Correct.</b> ' + escapeHtml(auto ? "Graded automatically." : "") + "</span>"
      : '<span class="fb-mark">↺</span><span class="fb-text"><b>Not quite.</b> ' +
        "Your answer: " + escapeHtml(userInput || "—") + ". Auto-graded.</span>";
    box.appendChild(fb);

    const ans = el("div", "answer");
    ans.innerHTML = "<div class='a-label'>Solution</div><div class='a-text'>" + item.answer + "</div>";
    box.appendChild(ans);

    const badge = el("div", "assess-trust auto", "✓ Auto-graded · deterministic");
    box.appendChild(badge);

    const cont = el("button", "btn primary wide", assess.i + 1 >= assess.run.items.length ? "See results →" : "Next →");
    cont.onclick = () => { assess.i++; assessNext(); };
    box.appendChild(cont);
    wrap.appendChild(box);
    mount(wrap);
    katex(wrap);
    if (window.haptic) haptic(verdict.correct ? "correct" : "tap");
  }

  // Honest self-check moment for non-auto-gradable (prose) answers. We reveal the
  // canonical solution and the learner reports — clearly flagged as self-reported, lower
  // trust, kept apart from the deterministic signal in the firewall log.
  function renderAssessSelfCheck(item, userInput, latency) {
    const wrap = el("div", "screen assess");
    wrap.appendChild(header());
    const top = el("div", "atom-top");
    top.appendChild(el("span", "prog", ""));
    top.appendChild(el("span", "diag-step", "Q" + (assess.i + 1) + " / " + assess.run.items.length));
    wrap.appendChild(top);

    const box = el("div", "diag-q assess-q");
    box.appendChild(el("div", "dq-concept", escapeHtml(item.title || item.atomId)));
    box.appendChild(el("div", "dq-prompt", item.prompt));

    if (userInput && userInput.trim()) {
      const yours = el("div", "assess-yours");
      yours.innerHTML = "<div class='a-label'>Your answer</div><div class='a-text'>" + escapeHtml(userInput) + "</div>";
      box.appendChild(yours);
    }
    const ans = el("div", "answer");
    ans.innerHTML = "<div class='a-label'>Solution</div><div class='a-text'>" + item.answer + "</div>";
    box.appendChild(ans);

    box.appendChild(el("div", "assess-selfq", "This one's open-ended — did you get it right?"));
    const choice = el("div", "diag-choice");
    const yes = el("button", "dc knew", "✓ I got it");
    yes.onclick = () => { recordAssessItem(item, true, false, latency); assess.i++; assessNext(); };
    const no = el("button", "dc didnt", "Missed it");
    no.onclick = () => { recordAssessItem(item, false, false, latency); assess.i++; assessNext(); };
    choice.appendChild(yes);
    choice.appendChild(no);
    box.appendChild(choice);
    box.appendChild(el("div", "assess-trust self", "Self-reported · counts for less than auto-graded"));

    wrap.appendChild(box);
    mount(wrap);
    katex(wrap);
  }

  // Record a graded item: push to the in-memory results AND feed the engine proficiency
  // through the EXISTING grade() path (so masteryDetail reflects tested proficiency). We
  // never clobber practice signal dishonestly: a self-reported verdict is flagged so the
  // firewall log marks it lower-trust. Auto-graded correctness is the trustworthy signal.
  function recordAssessItem(item, correct, autoGraded, latencyMs) {
    assess.results.push({ atomId: item.atomId, level: item.level, correct, autoGraded, latencyMs });
    // Feed proficiency via the engine grade path. Only an INTRODUCED concept gets a card;
    // for a not-yet-started concept we still introduce it (a tested concept IS now seen).
    try {
      const rating = window.Assess.ratingFor(correct);
      E.grade(item.atomId, rating, item.level || "recall");
    } catch (e) {}
  }

  function assessFinish() {
    const summary = window.Assess.summarize(assess.results);
    const record = {
      at: Date.now(),
      branch: (E.meta && E.meta.branch) || null,
      total: summary.total, correct: summary.correct, score: summary.score,
      auto: summary.auto, self: summary.self, byLevel: summary.byLevel,
      weakConcepts: summary.weakConcepts, trust: summary.trust,
    };
    appendAssessRun(record); // firewall log (separate from practice state)
    const results = assess.results.slice();
    assess = null;
    renderAssessResults(summary);
  }

  function renderAssessResults(summary) {
    const wrap = el("div", "screen assess");
    wrap.appendChild(header());
    const box = el("div", "assess-result");
    const pct = Math.round(summary.score * 100);
    if (window.haptic) haptic("celebrate");
    box.innerHTML =
      '<div class="ar-mark">▰</div>' +
      "<h1>" + summary.correct + " / " + summary.total + "</h1>" +
      '<div class="ar-score">' + pct + "% on this self-test</div>" +
      '<p class="ar-sub">An honest signal to sharpen your estimate — not a grade or a certificate.</p>';

    // trust split (the firewall, made visible)
    const trust = el("div", "ar-trust");
    trust.innerHTML =
      '<span class="art-pill auto">' + summary.auto.correct + "/" + summary.auto.total + " auto-graded</span>" +
      '<span class="art-pill self">' + summary.self.correct + "/" + summary.self.total + " self-reported</span>";
    box.appendChild(trust);

    // by-level breakdown
    const levels = window.Assess.ASSESS.LEVELS.filter((l) => summary.byLevel[l]);
    if (levels.length) {
      const bl = el("div", "ar-levels");
      bl.appendChild(el("div", "section-label", "By depth"));
      levels.forEach((l) => {
        const d = summary.byLevel[l];
        const row = el("div", "bar-row");
        row.innerHTML = '<div class="bar-label">' + l.charAt(0).toUpperCase() + l.slice(1) + "</div>";
        const bar = el("div", "bar");
        bar.appendChild(el("div", "fill shell-bar-nucleus", "")).style.width = Math.round((d.correct / d.total) * 100) + "%";
        row.appendChild(bar);
        row.appendChild(el("div", "bar-pct", d.correct + "/" + d.total));
        bl.appendChild(row);
      });
      box.appendChild(bl);
    }

    // weak concepts → link back to Study
    if (summary.weakConcepts.length) {
      const weak = el("div", "route-list ar-weak");
      weak.appendChild(el("div", "section-label", "Review these"));
      summary.weakConcepts.slice(0, 8).forEach((id) => {
        const a = E.byId[id];
        if (!a) return;
        const row = el("div", "route-row");
        row.appendChild(el("span", "dot shell-dot-" + a.shell));
        row.appendChild(el("span", "rtitle", escapeHtml(a.title)));
        row.appendChild(el("span", "rtag", "study"));
        row.onclick = () => openAtom(id, true); // back to Study (peek), never blocks
        weak.appendChild(row);
      });
      box.appendChild(weak);
    } else if (summary.total) {
      box.appendChild(el("p", "ar-clean", "Nothing flagged to review — clean run."));
    }

    const done = el("button", "btn primary wide", "Done");
    done.onclick = () => go("progress");
    box.appendChild(done);
    const again = el("button", "btn ghost wide", "Test again");
    again.onclick = () => startAssessment();
    box.appendChild(again);
    wrap.appendChild(box);
    mount(wrap);
    katex(wrap);
  }

  /* ---------- share Bucket Academy (growth loop) ---------- */
  // Canonical public URL of the academy. Defaults to /academy on the current origin;
  // no hardcoded production secret.
  function academyUrl() {
    try {
      const o = window.location && window.location.origin && window.location.origin !== "null"
        ? window.location.origin : "https://bucket.foundation";
      return o.replace(/\/$/, "") + "/academy";
    } catch (e) { return "https://bucket.foundation/academy"; }
  }
  // Prefer the learner's PUBLIC Mastery Profile (bkt-coh) when they have a public handle.
  function shareTarget() {
    try {
      const Auth = window.BucketAuth;
      if (Auth && Auth.enabled && shareProfileHandle && shareProfileHandle.handle && shareProfileHandle.isPublic) {
        const o = (window.location && window.location.origin) || "https://bucket.foundation";
        return { url: o.replace(/\/$/, "") + "/m/" + shareProfileHandle.handle,
                 title: "My Bucket Academy mastery profile", isProfile: true };
      }
    } catch (e) {}
    return { url: academyUrl(), title: "Bucket Academy · learn the nucleus", isProfile: false };
  }
  function shareAcademy() {
    const t = shareTarget();
    const text = t.isProfile
      ? "Here's what I've mastered on Bucket Academy — learn the nucleus of any field:"
      : "Learn the nucleus of any field — the foundations, made unforgettable.";
    if (navigator.share) { navigator.share({ title: t.title, text, url: t.url }).catch(() => {}); return; }
    const done = (ok) => toast(ok ? "Link copied — share it with a friend." : t.url);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t.url).then(() => done(true), () => done(false));
    } else { done(false); }
  }
  function toast(msg) {
    const t = el("div", "ba-toast", escapeHtml(msg));
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("on"));
    setTimeout(() => { t.classList.remove("on"); setTimeout(() => t.remove(), 300); }, 2600);
  }

  /* ---------- first-run onboarding wiring (bkt-vjb) ---------- */
  // The best "first real concept": a foundational (prereq) atom with a full lesson,
  // no prerequisites, highest leverage. Falls back gracefully.
  function firstLessonAtom() {
    const withLesson = E.atoms.filter((a) => a.lesson);
    const pool = withLesson.length ? withLesson : E.atoms;
    const rank = (a) =>
      (a.shell === "prereq" ? 0 : a.shell === "nucleus" ? 1 : 2) * 100 -
      (a.requires && a.requires.length ? 50 : 0) - (a.leverage || 0);
    return pool.slice().sort((a, b) => rank(a) - rank(b))[0] || E.atoms[0];
  }

  function runOnboarding(onDone) {
    if (!window.BucketOnboarding) return onDone();
    window.BucketOnboarding.start({
      E, mount, isLang, firstLessonAtom,
      // reuse the app's REAL renderers so the lesson + art match Study mode exactly
      mdToHtml, artCard,
      switchBranch: (file) => {
        const m = findBranch(file) || BRANCHES.find((b) => b.file === file);
        currentBranchFile = m ? branchKey(m) : file;
        try { localStorage.setItem(BRANCH_PREF_KEY, currentBranchFile); } catch (e) {}
        const target = m && m.file ? m.file : file;
        return E.load(target).then(() => { normalizeAtoms(); return loadArtCache(); }).catch(() => {});
      },
      gradeWin: (id, level) => { if (!E.cardFor(id)) E.grade(id, 3, level || "recall"); },
      langPair: () => {
        const { target, known } = langSettings();
        const a = firstLessonAtom();
        const tf = (a && a.forms && a.forms[target]) || {};
        return { target, targetName: LANG_NAMES[target] || target, known,
                 gloss: (a && (a.gloss || a.title)) || "", word: tf.word || "", ipa: tf.ipa || "" };
      },
      // real diagnostic (js/diagnostic.js)
      hasDiagnostic: () => !isLang() && typeof window.Diagnostic === "function",
      startDiagnostic: () => go("diagnostic"),
      // real auth (js/auth.js + auth-ui.js) — feature-detected, never required
      hasAuth: () => !!(window.BucketAuth && window.BucketAuth.enabled),
      signIn: () => new Promise((resolve) => {
        // open the existing sign-in modal via the topbar pill once the app is mounted
        setTimeout(() => { const pill = document.getElementById("authPill"); if (pill) pill.click(); resolve(); }, 60);
      }),
      share: shareAcademy,
      finish: (opts) => {
        opts = opts || {};
        return onDone(opts.goTo || "home");
      },
    });
  }

  /* ---------- router ---------- */
  function mount(node) {
    const root = $("#app");
    root.innerHTML = "";
    root.appendChild(node);
  }
  function go(where) {
    currentScreen = where;
    if (where === "lang-picker") mount(screenLangPicker());
    else if (where === "home") mount(screenHome());
    else if (where === "study") screenStudy();
    else if (where === "map") mount(screenMap());
    else if (where === "progress") mount(screenProgress());
    else if (where === "diagnostic") startDiagnostic();
    else if (where === "assess") startAssessment();
    else if (where === "explore") screenExplorer();
    window.scrollTo(0, 0);
  }

  async function boot() {
    // Load the built-in deck manifest (with fallback) first, so BRANCHES is fully
    // populated before we resolve the current selection / deep link.
    await loadManifest();
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

    // Deep links (shared atom / view / neighborhood) bypass first-run onboarding.
    const deepLink = params && (params.get("atom") || params.get("nb") ||
      params.get("view") === "study" || params.get("view") === "map" || params.get("onboard") === "0");
    const forceOnboard = params && params.get("onboard") === "1";

    function enter() {
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

    // First-run commitment ladder — only for brand-new visitors (or explicit replay).
    if (window.BucketOnboarding && !deepLink &&
        (forceOnboard || window.BucketOnboarding.shouldRun())) {
      runOnboarding((where) => go(where || "home"));
    } else {
      enter();
    }
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
