/* Bucket Academy — Socratic tutor panel (client).
 * Grounded + safe by construction: the panel ONLY ever sends the current atom's
 * own verified material as `grounding`, and renders the tutor's reply with the
 * grounding made visible and citations linked from the server-validated set.
 *
 * Safety surfaced in UX (mirrors the S1–S7 server floor):
 *  - the concept it's grounded in is shown in the header AND in a standing
 *    disclaimer ("grounded to this concept's material"), so the learner knows
 *    its scope (S1).
 *  - abstention ("outside this concept") is rendered as a calm, expected state,
 *    never an error (S2/S4).
 *  - confidence is shown honestly (high/medium/low) (S4).
 *  - citations are rendered ONLY from the server-validated `citations` array —
 *    the client never parses links out of the model's prose (S3).
 *  - a 503 / not_configured response degrades to a graceful "tutor not enabled
 *    yet" card; the atom screen keeps working (never breaks the lesson).
 *
 * The tutor never replaces the retrieval loop — it's an optional aid attached
 * to the concept the learner is already studying.
 */
(function (global) {
  "use strict";

  var API = "/api/academy/tutor";

  function el(t, c, h) {
    var n = document.createElement(t);
    if (c) n.className = c;
    if (h != null) n.innerHTML = h;
    return n;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // Build the grounding payload from an atom + the titles of its neighbours.
  // byId maps atom id -> atom (so we can resolve requires/unlocks to titles).
  function buildGrounding(atom, byId) {
    function titles(ids) {
      return (ids || [])
        .map(function (id) {
          return byId && byId[id] ? byId[id].title : null;
        })
        .filter(Boolean);
    }
    return {
      title: atom.title,
      summary: atom.summary,
      lesson: atom.lesson,
      equation: atom.equation,
      depths: atom.depths,
      sources: atom.sources,
      resources: atom.resources,
      requires: titles(atom.requires),
      unlocks: titles(atom.unlocks),
    };
  }

  var SUGGESTED = [
    "Explain this differently",
    "Why is this true?",
    "Give me another example",
    "What should I understand first?",
  ];

  // Open the focused tutor panel for one atom. opts: { atom, branch, byId }.
  function open(opts) {
    var atom = opts.atom;
    var byId = opts.byId || {};
    var grounding = buildGrounding(atom, byId);
    var history = []; // [{role:'user'|'tutor', content}]

    var back = el("div", "tutor-back");
    var panel = el("div", "tutor-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Tutor for " + (atom.title || "this concept"));

    // header
    var head = el("div", "tutor-head");
    head.appendChild(
      el(
        "div",
        "tutor-head-l",
        '<div class="tutor-kicker">Tutor · grounded</div>' +
          '<div class="tutor-concept">' +
          esc(atom.title || "this concept") +
          "</div>"
      )
    );
    var close = el("button", "tutor-close", "✕");
    close.setAttribute("aria-label", "Close tutor");
    close.onclick = dismiss;
    head.appendChild(close);
    panel.appendChild(head);

    // standing disclaimer (grounding made visible — S1)
    panel.appendChild(
      el(
        "div",
        "tutor-ground",
        "🛡 Answers are grounded to <b>" +
          esc(atom.title || "this concept") +
          "</b>'s material only. If you ask beyond it, the tutor will say so rather than guess."
      )
    );

    // conversation log
    var log = el("div", "tutor-log");
    log.setAttribute("aria-live", "polite");
    panel.appendChild(log);

    // suggested questions (shown until first ask)
    var suggWrap = el("div", "tutor-sugg");
    suggWrap.appendChild(el("div", "tutor-sugg-label", "Try asking"));
    var suggRow = el("div", "tutor-sugg-row");
    SUGGESTED.forEach(function (q) {
      var chip = el("button", "tutor-chip", esc(q));
      chip.onclick = function () {
        input.value = q;
        ask();
      };
      suggRow.appendChild(chip);
    });
    suggWrap.appendChild(suggRow);
    panel.appendChild(suggWrap);

    // composer
    var form = el("form", "tutor-form");
    var input = document.createElement("input");
    input.className = "tutor-input";
    input.type = "text";
    input.placeholder = "Ask about " + (atom.title || "this concept") + "…";
    input.setAttribute("aria-label", "Ask the tutor a question");
    input.maxLength = 1000;
    var send = el("button", "tutor-send", "Ask");
    send.type = "submit";
    form.appendChild(input);
    form.appendChild(send);
    form.onsubmit = function (e) {
      e.preventDefault();
      ask();
    };
    panel.appendChild(form);

    back.appendChild(panel);
    back.onclick = function (e) {
      if (e.target === back) dismiss();
    };
    // keyboard: Escape closes
    function onKey(e) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKey);

    function dismiss() {
      document.removeEventListener("keydown", onKey);
      back.classList.add("closing");
      setTimeout(function () {
        if (back.parentNode) back.parentNode.removeChild(back);
      }, 180);
    }

    document.body.appendChild(back);
    setTimeout(function () {
      try {
        input.focus();
      } catch (e) {}
    }, 60);

    // ---- message rendering ----
    function addUser(text) {
      var m = el("div", "tutor-msg user");
      m.appendChild(el("div", "tutor-bubble", esc(text)));
      log.appendChild(m);
      scroll();
    }
    function addThinking() {
      var m = el("div", "tutor-msg tutor pending");
      m.appendChild(
        el("div", "tutor-bubble thinking", '<span class="tdot"></span><span class="tdot"></span><span class="tdot"></span>')
      );
      log.appendChild(m);
      scroll();
      return m;
    }
    function addTutor(data) {
      var m = el("div", "tutor-msg tutor");
      var bubble = el("div", "tutor-bubble");

      if (data.abstained) {
        bubble.classList.add("abstained");
        bubble.appendChild(
          el("div", "tutor-abstain-tag", "Outside this concept's material")
        );
      }
      bubble.appendChild(el("div", "tutor-reply", esc(data.reply || "")));

      // confidence chip (honest uncertainty signalling — S4)
      var conf = (data.confidence || "medium").toLowerCase();
      var confLabel = { high: "grounded", medium: "partly grounded", low: "low certainty" }[conf] || "partly grounded";
      var meta = el("div", "tutor-meta");
      meta.appendChild(el("span", "tutor-conf conf-" + conf, "● " + confLabel));

      // citations — rendered ONLY from the server-validated closed set (S3)
      if (data.citations && data.citations.length) {
        var cites = el("div", "tutor-cites");
        cites.appendChild(el("span", "tutor-cites-label", "From:"));
        data.citations.forEach(function (c) {
          if (c && c.url) {
            var a = el("a", "tutor-cite", esc(c.label || c.url));
            a.href = c.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            cites.appendChild(a);
          } else if (c && c.label) {
            cites.appendChild(el("span", "tutor-cite static", esc(c.label)));
          }
        });
        bubble.appendChild(cites);
      }

      bubble.appendChild(meta);
      m.appendChild(bubble);
      log.appendChild(m);
      if (global.renderMathInElement) {
        try {
          global.renderMathInElement(m, {
            delimiters: [
              { left: "$$", right: "$$", display: true },
              { left: "$", right: "$", display: false },
            ],
            throwOnError: false,
          });
        } catch (e) {}
      }
      scroll();
    }
    function addNotEnabled() {
      var m = el("div", "tutor-msg tutor");
      m.appendChild(
        el(
          "div",
          "tutor-bubble notice",
          "<b>Tutor not enabled yet.</b><br>The tutor needs an API key configured on the server. " +
            "Everything else on this concept — the lesson, the art, the drill — works as normal."
        )
      );
      log.appendChild(m);
      scroll();
    }
    function addError(msg) {
      var m = el("div", "tutor-msg tutor");
      m.appendChild(el("div", "tutor-bubble notice", esc(msg || "Something went wrong. Try again.")));
      log.appendChild(m);
      scroll();
    }
    function scroll() {
      log.scrollTop = log.scrollHeight;
    }

    var busy = false;
    function ask() {
      var q = (input.value || "").trim();
      if (!q || busy) return;
      busy = true;
      send.disabled = true;
      input.value = "";
      if (suggWrap.parentNode) suggWrap.style.display = "none";
      addUser(q);
      var thinking = addThinking();

      var payload = {
        atomId: atom.id,
        branch: opts.branch || null,
        question: q,
        history: history.slice(-8),
        grounding: grounding,
      };

      fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res
            .json()
            .catch(function () {
              return {};
            })
            .then(function (data) {
              return { status: res.status, data: data };
            });
        })
        .then(function (r) {
          if (thinking.parentNode) thinking.parentNode.removeChild(thinking);
          if (r.status === 503) {
            addNotEnabled();
            return;
          }
          if (r.status === 429) {
            addError("You're asking quickly — give it a few seconds and try again.");
            return;
          }
          if (r.status >= 400 || !r.data || typeof r.data.reply !== "string") {
            var msg = r.data && r.data.error && r.data.error.message;
            addError(msg || "The tutor couldn't answer that. Try rephrasing.");
            return;
          }
          history.push({ role: "user", content: q });
          history.push({ role: "tutor", content: r.data.reply });
          addTutor(r.data);
        })
        .catch(function () {
          if (thinking.parentNode) thinking.parentNode.removeChild(thinking);
          addError("Couldn't reach the tutor. Check your connection and try again.");
        })
        .then(function () {
          busy = false;
          send.disabled = false;
          try {
            input.focus();
          } catch (e) {}
        });
    }
  }

  global.BucketTutor = { open: open, buildGrounding: buildGrounding };
})(typeof window !== "undefined" ? window : globalThis);
