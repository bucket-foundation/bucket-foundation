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

  function open(opts) {
    var atom = opts.atom;
    var history = [];

    var back = el("div", "tutor-back");
    var panel = el("div", "tutor-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Tutor for " + (atom.title || "this concept"));

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

    panel.appendChild(
      el(
        "div",
        "tutor-ground",
        "🛡 Answers are grounded to <b>" +
          esc(atom.title || "this concept") +
          "</b>'s material only. If you ask beyond it, the tutor will say so rather than guess."
      )
    );

    var log = el("div", "tutor-log");
    log.setAttribute("aria-live", "polite");
    panel.appendChild(log);

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

      var conf = (data.confidence || "medium").toLowerCase();
      var confLabel = { high: "grounded", medium: "partly grounded", low: "low certainty" }[conf] || "partly grounded";
      var meta = el("div", "tutor-meta");
      meta.appendChild(el("span", "tutor-conf conf-" + conf, "● " + confLabel));

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
            "The lesson, the art and the drill on this concept work as normal."
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

    function addSignIn() {
      var m = el("div", "tutor-msg tutor");
      var bubble = el("div", "tutor-bubble notice", "<b>Sign in to ask the tutor.</b>");
      var AuthUI = global.BucketAuthUI;
      var Auth = global.BucketAuth;
      if (AuthUI && typeof AuthUI.open === "function" && Auth && Auth.enabled) {
        var btn = el("button", "tutor-signin", "Sign in");
        btn.type = "button";
        btn.onclick = function () {
          AuthUI.open();
        };
        bubble.appendChild(btn);
      } else {
        bubble.appendChild(el("div", "tutor-signin-note", "Sign-in is off in this build, so the tutor is unavailable."));
      }
      m.appendChild(bubble);
      log.appendChild(m);
      scroll();
    }
    function sessionToken() {
      var Auth = global.BucketAuth;
      return Auth && typeof Auth.accessToken === "function" ? Auth.accessToken() : null;
    }

    var busy = false;
    function ask() {
      var q = (input.value || "").trim();
      if (!q || busy) return;
      var tok = sessionToken();
      if (!tok) {
        addSignIn();
        return;
      }
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
      };

      fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: "Bearer " + tok },
        credentials: "omit",
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
          var serverMsg = r.data && typeof r.data.error === "string" ? r.data.error : "";
          if (r.status === 401) {
            addSignIn();
            return;
          }
          if (r.status === 503) {
            if (!serverMsg || /enabled/i.test(serverMsg)) addNotEnabled();
            else addError("The tutor is unavailable right now. Try again later.");
            return;
          }
          if (r.status === 429) {
            addError(serverMsg || "You've reached today's tutor limit. It resets at midnight UTC.");
            return;
          }
          if (r.status >= 400 || !r.data || typeof r.data.reply !== "string") {
            var msg = serverMsg;
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
