/* Bucket Academy — first-run onboarding (the commitment ladder).
 *
 * A clean, skippable first-run shown ONLY to brand-new visitors. It delivers value
 * before any account: warm welcome → goal → ONE real foundational lesson (full markdown
 * lesson + procedural art) + a single retrieval win → diagnostic offer → soft, skippable
 * signup. Mirrors the Customer-Success commitment ladder
 * (research/customer-success/ONBOARDING-RETENTION-COMMUNITY.md) and the UX-SPEC onboarding.
 *
 * Self-contained: exposes window.BucketOnboarding. NO API key needed. Leans on what's already
 * built — it is handed the live Engine (E) and a small set of host callbacks from app.js, and
 * feature-detects window.BucketAuth / a diagnostic if/when they exist (never depends on them).
 *
 * Detection of "first run": no per-branch progress exists in localStorage AND the
 * `bucket-academy/onboarded` flag is unset. Once finished or skipped, the flag is set so
 * returning visitors go straight to Today. "Replay intro" (in Progress settings) clears the
 * flag and re-runs this flow on demand.
 */
(function (global) {
  "use strict";

  var ONBOARDED_KEY = "bucket-academy/onboarded";
  var LS_BASE = "bucket-academy/v1"; // matches engine.js progress namespace

  function el(t, c, h) {
    var n = document.createElement(t);
    if (c) n.className = c;
    if (h != null) n.innerHTML = h;
    return n;
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function katex(root) {
    if (global.renderMathInElement) {
      try {
        global.renderMathInElement(root, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
          ],
          throwOnError: false,
        });
      } catch (e) {}
    }
  }

  /* ---- first-run detection ---- */
  function hasAnyProgress() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(LS_BASE) === 0) {
          var raw = localStorage.getItem(k);
          if (!raw) continue;
          try {
            var s = JSON.parse(raw);
            if (s && s.cards && Object.keys(s.cards).length > 0) return true;
            if (s && s.stats && (s.stats.xp > 0 || s.stats.streak > 0)) return true;
          } catch (e) {}
        }
      }
    } catch (e) {}
    return false;
  }
  function isOnboarded() {
    try {
      return localStorage.getItem(ONBOARDED_KEY) === "1";
    } catch (e) {
      return false;
    }
  }
  function markOnboarded() {
    try {
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch (e) {}
  }
  function clearOnboarded() {
    try {
      localStorage.removeItem(ONBOARDED_KEY);
    } catch (e) {}
  }
  // Show the first-run flow only to brand-new visitors.
  function shouldRun() {
    return !isOnboarded() && !hasAnyProgress();
  }

  /* ---- goal chips → sensible default branch ---- */
  // Each goal seeds a default branch file + a one-line "why" the app mirrors back later.
  var GOALS = [
    { key: "exam", icon: "✒", label: "Exam prep", sub: "Lock in the foundations I'll be tested on", branch: "corpus/biophysics.json" },
    { key: "curiosity", icon: "✦", label: "Curiosity", sub: "Understand how the world actually works", branch: "corpus/02-physics.json" },
    { key: "depth", icon: "❖", label: "Go deep in a field", sub: "Master the nucleus of one branch", branch: "corpus/01-mathematics.json" },
    { key: "language", icon: "✺", label: "Learn a language", sub: "Through the languages I already know", branch: "corpus/lang-core.json" },
  ];

  /* ---- procedural art (zero-dependency, deterministic per atom) ----
   * A calm, on-brand generative glyph so the "procedural art" requirement is met without
   * touching any art module. Deterministic from the atom id, tinted by shell. */
  var SHELL_COLOR = { prereq: "#2E6B6B", nucleus: "#8A641A", frontier: "#5A7A3A" };
  var SHELL_LABEL = { prereq: "Prerequisite", nucleus: "Nucleus", frontier: "Frontier" };
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function proceduralArt(atom) {
    var seed = hashStr(atom.id || atom.title || "bucket");
    function rnd() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    var color = SHELL_COLOR[atom.shell] || "#2E6B6B";
    var W = 320, H = 150, cx = W / 2, cy = H / 2;
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("class", "ob-art-svg");
    svg.setAttribute("aria-hidden", "true");
    // concentric shells (echo the nucleus map), plus orbiting nodes seeded by the atom
    var rings = 3;
    for (var r = rings; r >= 1; r--) {
      var c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", cx); c.setAttribute("cy", cy);
      c.setAttribute("r", 18 + r * 16);
      c.setAttribute("fill", "none");
      c.setAttribute("stroke", color);
      c.setAttribute("stroke-opacity", (0.10 + r * 0.06).toFixed(2));
      c.setAttribute("stroke-width", "1");
      svg.appendChild(c);
    }
    var nodes = 6 + Math.floor(rnd() * 5);
    for (var i = 0; i < nodes; i++) {
      var ring = 1 + Math.floor(rnd() * rings);
      var ang = rnd() * Math.PI * 2;
      var rr = 18 + ring * 16;
      var x = cx + Math.cos(ang) * rr;
      var y = cy + Math.sin(ang) * rr;
      var line = document.createElementNS(ns, "line");
      line.setAttribute("x1", cx); line.setAttribute("y1", cy);
      line.setAttribute("x2", x); line.setAttribute("y2", y);
      line.setAttribute("stroke", color); line.setAttribute("stroke-opacity", "0.18");
      line.setAttribute("stroke-width", "1");
      svg.appendChild(line);
      var dot = document.createElementNS(ns, "circle");
      dot.setAttribute("cx", x); dot.setAttribute("cy", y);
      dot.setAttribute("r", (2 + rnd() * 3).toFixed(1));
      dot.setAttribute("fill", color);
      dot.setAttribute("fill-opacity", (0.45 + rnd() * 0.4).toFixed(2));
      svg.appendChild(dot);
    }
    var core = document.createElementNS(ns, "circle");
    core.setAttribute("cx", cx); core.setAttribute("cy", cy);
    core.setAttribute("r", "7"); core.setAttribute("fill", color);
    svg.appendChild(core);
    var card = el("div", "ob-art shell-" + atom.shell);
    card.appendChild(el("div", "ob-art-badge", SHELL_LABEL[atom.shell] || "Concept"));
    card.appendChild(svg);
    if (atom.equation) {
      var eq = el("div", "ob-art-eq", "$$" + atom.equation + "$$");
      card.appendChild(eq);
    }
    card.appendChild(el("div", "ob-art-title", escapeHtml(atom.title || "")));
    return card;
  }

  /* ---- tiny, safe markdown renderer for the atom `lesson` field ----
   * Handles the subset the corpus uses: ### headings, **bold**, *italic*, `code`,
   * $…$ / $$…$$ math (left for KaTeX), and paragraphs. No raw HTML passthrough. */
  function renderLesson(md) {
    var box = el("div", "ob-lesson");
    var blocks = String(md || "").split(/\n{2,}/);
    blocks.forEach(function (b) {
      b = b.trim();
      if (!b) return;
      var hm = b.match(/^(#{1,4})\s+(.*)$/);
      if (hm) {
        var lvl = Math.min(4, hm[1].length);
        box.appendChild(el("div", "ob-l-h ob-l-h" + lvl, inline(hm[2])));
        return;
      }
      // display-math-only block
      if (/^\$\$[\s\S]*\$\$$/.test(b)) {
        box.appendChild(el("div", "ob-l-eq", b));
        return;
      }
      var p = el("p", "ob-l-p");
      p.innerHTML = inline(b.replace(/\n/g, " "));
      box.appendChild(p);
    });
    return box;
  }
  // Inline markdown → safe HTML. Protect math spans from escaping; escape the rest.
  function inline(s) {
    var math = [];
    s = String(s).replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g, function (m) {
      math.push(m);
      return " " + (math.length - 1) + " ";
    });
    s = escapeHtml(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>");
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/ (\d+) /g, function (_, i) {
      return math[+i];
    });
    return s;
  }

  /* ---- chrome ---- */
  function progressDots(total, idx) {
    var row = el("div", "ob-dots");
    for (var i = 0; i < total; i++) row.appendChild(el("span", "ob-dot" + (i <= idx ? " on" : "")));
    return row;
  }
  function skipBtn(onSkip) {
    var b = el("button", "ob-skip", "Skip intro");
    b.onclick = onSkip;
    return b;
  }

  /* ====================================================================== *
   *  The flow. ctx = { E, mount, finish, switchBranch, openHomeAtom,
   *                    startDiagnostic, signIn, share }
   * ====================================================================== */
  function start(ctx) {
    var STEPS = 6;
    var chosenGoal = null;

    // Prefer the host app's real lesson renderer (marked-based, matches Study mode);
    // otherwise use the self-contained safe renderer above.
    function lessonNode(md) {
      if (ctx.mdToHtml) {
        var box = el("div", "ob-lesson sb-lesson");
        try { box.innerHTML = ctx.mdToHtml(md); return box; } catch (e) {}
      }
      return renderLesson(md);
    }

    function frame(stepIdx, inner) {
      var screen = el("div", "screen ob-screen");
      var top = el("div", "ob-top");
      top.appendChild(el("div", "ob-brand", 'Bucket <span>Academy</span>'));
      top.appendChild(skipBtn(skipAll));
      screen.appendChild(top);
      screen.appendChild(inner);
      screen.appendChild(progressDots(STEPS, stepIdx));
      ctx.mount(screen);
      katex(screen);
      try { global.scrollTo(0, 0); } catch (e) {}
    }

    function skipAll() {
      markOnboarded();
      ctx.finish({ skipped: true });
    }

    /* 1 — warm welcome */
    function stepWelcome() {
      var w = el("div", "ob-body ob-center");
      w.appendChild(el("div", "ob-kicker", "Welcome"));
      w.appendChild(el("h1", "ob-h1", "Learn the nucleus."));
      w.appendChild(el("p", "ob-lead",
        "Bucket Academy teaches the <b>foundations</b> of a field — the handful of axioms, laws and primary results everything else is built from — and then makes sure you never forget them."));
      w.appendChild(el("p", "ob-fine", "No account needed to start. We'll teach you a real concept in the next minute."));
      var go = el("button", "btn primary wide", "Begin →");
      go.onclick = stepGoal;
      w.appendChild(go);
      frame(0, w);
    }

    /* 2 — what brings you here? (goal chips → default branch) */
    function stepGoal() {
      var w = el("div", "ob-body");
      w.appendChild(el("div", "ob-kicker", "One question"));
      w.appendChild(el("h1", "ob-h1", "What brings you here?"));
      w.appendChild(el("p", "ob-lead", "We'll point you at a sensible starting branch. You can switch any time."));
      var grid = el("div", "ob-goals");
      GOALS.forEach(function (g) {
        var chip = el("button", "ob-goal",
          '<span class="ob-goal-ico">' + g.icon + "</span>" +
          '<span class="ob-goal-label">' + escapeHtml(g.label) + "</span>" +
          '<span class="ob-goal-sub">' + escapeHtml(g.sub) + "</span>");
        chip.onclick = function () {
          chosenGoal = g;
          // set the default branch for this goal, then teach the first real concept
          ctx.switchBranch(g.branch).then(stepLesson, stepLesson);
        };
        grid.appendChild(chip);
      });
      w.appendChild(grid);
      frame(1, w);
    }

    /* 3 — teach ONE real concept BEFORE any signup (full lesson + procedural art + 1 win) */
    function stepLesson() {
      var atom = ctx.firstLessonAtom();
      var w = el("div", "ob-body");
      w.appendChild(el("div", "ob-kicker", "Your first concept"));
      // language branch has no `lesson` field — give it a faithful intro instead.
      if (ctx.isLang() || !atom) return stepLessonLang(w);

      w.appendChild(el("h1", "ob-h1", escapeHtml(atom.title)));
      // Prefer the app's real build-time procedural art + marked lesson renderer; fall back
      // to the self-contained versions so onboarding still works standalone.
      w.appendChild(ctx.artCard ? ctx.artCard(atom) : proceduralArt(atom));
      w.appendChild(lessonNode(atom.lesson || atom.summary || ""));
      if (atom.sources && atom.sources.length) {
        w.appendChild(el("div", "ob-cite", "Learn from: " + escapeHtml(atom.sources.join(" · "))));
      }

      // one quick retrieval win — the aha. Reveal → "Got it" grades it real (recall).
      var q = (atom.quiz || []).find(function (x) { return x.level === "recall"; }) || (atom.quiz || [])[0];
      var drill = el("div", "ob-drill");
      drill.appendChild(el("div", "ob-drill-label", "Quick check · one question"));
      if (q) {
        drill.appendChild(el("div", "ob-q", q.prompt));
        var ans = el("div", "ob-answer hidden");
        ans.innerHTML = '<div class="ob-a-label">Answer</div><div class="ob-a-text">' + (q.answer || "") + "</div>";
        var reveal = el("button", "btn wide", "Show answer");
        var done = el("div", "ob-drill-done hidden");
        var got = el("button", "btn primary wide", "Got it → save this win");
        got.onclick = function () {
          ctx.gradeWin(atom.id, "recall"); // banks the first concept in the engine
          stepHowItWorks();
        };
        var notyet = el("button", "ob-link", "Not yet — show me from the start");
        notyet.onclick = stepHowItWorks;
        done.appendChild(got);
        done.appendChild(notyet);
        reveal.onclick = function () {
          ans.classList.remove("hidden");
          reveal.classList.add("hidden");
          done.classList.remove("hidden");
          katex(ans);
        };
        drill.appendChild(reveal);
        drill.appendChild(ans);
        drill.appendChild(done);
      } else {
        var cont = el("button", "btn primary wide", "Got it →");
        cont.onclick = function () { ctx.gradeWin(atom.id, "recall"); stepHowItWorks(); };
        drill.appendChild(cont);
      }
      w.appendChild(drill);
      frame(2, w);
    }

    // Language branch variant of step 3 (no `lesson` markdown; teach one real word).
    function stepLessonLang(w) {
      var atom = ctx.firstLessonAtom();
      var pair = ctx.langPair(); // {target, known, word, gloss}
      w.appendChild(el("h1", "ob-h1", "Your first word"));
      var langArtAtom = atom || { id: "lang", title: pair.gloss || "word", shell: "prereq" };
      w.appendChild(ctx.artCard ? ctx.artCard(langArtAtom) : proceduralArt(langArtAtom));
      w.appendChild(el("p", "ob-l-p",
        "In <b>" + escapeHtml(pair.targetName) + "</b>, “" + escapeHtml(pair.gloss) + "” is <b>" +
        escapeHtml(pair.word) + "</b>" + (pair.ipa ? " /" + escapeHtml(pair.ipa) + "/" : "") + "."));
      var drill = el("div", "ob-drill");
      drill.appendChild(el("div", "ob-drill-label", "Quick check"));
      drill.appendChild(el("div", "ob-q",
        "How do you say “" + escapeHtml(pair.gloss) + "” in " + escapeHtml(pair.targetName) + "?"));
      var ans = el("div", "ob-answer hidden");
      ans.innerHTML = '<div class="ob-a-label">Answer</div><div class="ob-a-text">' + escapeHtml(pair.word) + "</div>";
      var reveal = el("button", "btn wide", "Show answer");
      var done = el("div", "ob-drill-done hidden");
      var got = el("button", "btn primary wide", "Got it → save this win");
      got.onclick = function () { if (atom) ctx.gradeWin(atom.id, "recall"); stepHowItWorks(); };
      done.appendChild(got);
      reveal.onclick = function () {
        ans.classList.remove("hidden"); reveal.classList.add("hidden"); done.classList.remove("hidden");
      };
      drill.appendChild(reveal); drill.appendChild(ans); drill.appendChild(done);
      w.appendChild(drill);
      frame(2, w);
    }

    /* 4 — close the use↔teach loop: explain HOW this app schedules you, and WHY,
     * connecting the FSRS engine the learner just used (the retrieval win above) to
     * the evidence-based mechanisms taught as content in the Learning-to-learn branch.
     * Systems USE good cognitive science but rarely TEACH it; this step + that branch
     * are how Bucket teaches it. (education-atlas deep brief 03.) */
    function stepHowItWorks() {
      var w = el("div", "ob-body");
      w.appendChild(el("div", "ob-kicker", "Why that just worked"));
      w.appendChild(el("h1", "ob-h1", "How this app schedules you — and why."));
      w.appendChild(el("p", "ob-lead",
        "You didn't just reread that concept — you <b>recalled</b> it. That's <b>retrieval practice</b>, and pulling an answer out of memory strengthens it far more than reading it again. It's one of the two best-evidenced study techniques there is."));
      var rows = el("div", "ob-howrows");
      function howRow(k, v) {
        var r = el("div", "ob-howrow");
        r.appendChild(el("div", "ob-how-k", k));
        r.appendChild(el("div", "ob-how-v", v));
        rows.appendChild(r);
      }
      howRow("Retrieval",
        "Every card asks you to <b>recall</b>, not reread. The effort is the point — that's what burns it in.");
      howRow("Spacing",
        "An <b>FSRS</b> spaced-repetition engine models how your memory fades and brings each idea back right as you're about to forget it. Spread-out practice beats cramming — even at the same total time.");
      howRow("The catch",
        "These feel <i>harder</i> than rereading, so most people quit them: <b>90%</b> learn better from spacing, yet <b>72%</b> believe cramming works better. The good feeling of rereading is a <b>fluency illusion</b>, not learning.");
      w.appendChild(rows);
      w.appendChild(el("p", "ob-fine",
        "Most apps just <i>use</i> this science on you. Bucket also <b>teaches</b> it — the “✦ Learning to learn” branch makes these mechanisms (retrieval, spacing, interleaving, metacognition) concepts you master, so you can run them anywhere, for life. Grounded in Dunlosky et al. (2013) and Kornell & Bjork (2008)."));
      var teachMe = el("button", "btn primary wide", "Teach me how to learn →");
      teachMe.onclick = function () {
        // open the meta-skill branch directly, then drop into study
        Promise.resolve(ctx.switchBranch("corpus/00-learning-to-learn.json")).then(
          function () { markOnboarded(); ctx.finish({ goTo: "study" }); },
          function () { stepDiagnostic(); }
        );
      };
      var later = el("button", "btn ghost wide", "Got it — keep going");
      later.onclick = stepDiagnostic;
      w.appendChild(teachMe);
      w.appendChild(later);
      frame(3, w);
    }

    /* 5 — offer the diagnostic (place me) OR start from the beginning */
    function stepDiagnostic() {
      var w = el("div", "ob-body ob-center");
      w.appendChild(el("div", "ob-kicker", "Nicely done"));
      w.appendChild(el("h1", "ob-h1", "Know some of this already?"));
      w.appendChild(el("p", "ob-lead",
        "Place yourself so we start you at the right depth — never at “what is energy” if you're past it."));
      var hasDiag = ctx.hasDiagnostic();
      var place = el("button", "btn primary wide", "Place me →");
      place.onclick = function () {
        markOnboarded();
        if (hasDiag) ctx.startDiagnostic();
        else ctx.finish({ goTo: "study" }); // graceful fallback: read straight through
      };
      var begin = el("button", "btn ghost wide", "Start from the beginning");
      begin.onclick = stepSignup;
      w.appendChild(place);
      w.appendChild(begin);
      if (!hasDiag) {
        w.appendChild(el("p", "ob-fine", "Placement opens the full curriculum so you can jump in where it gets interesting."));
      }
      frame(4, w);
    }

    /* 5 — soft, skippable signup (benefit-framed, never a gate) */
    function stepSignup() {
      var w = el("div", "ob-body ob-center");
      w.appendChild(el("div", "ob-kicker", "Last thing — optional"));
      w.appendChild(el("h1", "ob-h1", "Save your progress?"));
      w.appendChild(el("p", "ob-lead",
        "Create a free account to <b>keep your streak and sync across devices</b> — so tomorrow's review targets exactly what you got wrong."));
      var hasAuth = ctx.hasAuth();
      var save = el("button", "btn primary wide", hasAuth ? "Save my progress →" : "Save my progress →");
      save.onclick = function () {
        markOnboarded();
        if (hasAuth) {
          Promise.resolve(ctx.signIn()).then(
            function () { ctx.finish({ goTo: "home" }); },
            function () { ctx.finish({ goTo: "home" }); }
          );
        } else {
          // auth not wired yet — never block; drop the learner straight into the app
          ctx.finish({ goTo: "home" });
        }
      };
      var later = el("button", "btn ghost wide", "Maybe later");
      later.onclick = function () { markOnboarded(); ctx.finish({ goTo: "home" }); };
      w.appendChild(save);
      w.appendChild(later);

      // tasteful share offer at the success peak (the growth loop)
      var share = el("button", "ob-link ob-share-link", "↗ Share Bucket Academy with a friend");
      share.onclick = function () { ctx.share(); };
      w.appendChild(share);
      w.appendChild(el("p", "ob-fine", "Your progress is already saved on this device. Account is optional."));
      frame(5, w);
    }

    stepWelcome();
  }

  global.BucketOnboarding = {
    shouldRun: shouldRun,
    start: start,
    markOnboarded: markOnboarded,
    clearOnboarded: clearOnboarded,
    isOnboarded: isOnboarded,
    proceduralArt: proceduralArt,
  };
})(typeof window !== "undefined" ? window : globalThis);
