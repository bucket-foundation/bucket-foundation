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
  ];
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
    hero.appendChild(el("div", "kicker", curBranch.pill.replace(/^[IVX]+ · /, "") + " · today's route"));
    hero.appendChild(el("h1", null, route.length ? "Ready when you are." : "All caught up. 🎉"));
    const sub = route.length
      ? route.filter((r) => r.kind === "review").length + " reviews · " + route.filter((r) => r.kind === "new").length + " new concepts"
      : "Nothing due. Explore the map or come back tomorrow.";
    hero.appendChild(el("p", "sub", sub));
    const cta = el("button", "btn primary", route.length ? "Start route →" : "Explore the map");
    cta.onclick = () => (route.length ? startSession(route) : go("map"));
    hero.appendChild(cta);
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
    } catch (e) {
      $("#app").innerHTML =
        '<div class="screen"><div class="hero"><h1>Corpus failed to load</h1><p class="sub">Run via a local server: <code>./serve.sh</code></p></div></div>';
      return;
    }
    go("home");
  }

  function nav(active) {
    const n = el("div", "tabbar");
    [["home", "◎", "Today"], ["map", "✸", "Map"], ["progress", "▰", "Progress"]].forEach(([k, i, l]) => {
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

  function renderAtom(id, peek) {
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
  function go(where) {
    if (where === "home") mount(screenHome());
    else if (where === "map") mount(screenMap());
    else if (where === "progress") mount(screenProgress());
    window.scrollTo(0, 0);
  }

  async function boot() {
    try {
      await E.load(currentBranchFile);
    } catch (e) {
      $("#app").innerHTML = '<div class="screen"><div class="hero"><h1>Corpus failed to load</h1><p class="sub">Run via a local server: <code>./serve.sh</code></p></div></div>';
      return;
    }
    window.__BA = E; // debug handle
    go("home");
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
