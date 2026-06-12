/* Bucket Academy — sign-in affordance + modal (bkt-su9).
 *
 * Renders a small "Save progress" control into the app topbar and a minimal
 * email-OTP modal styled to match the bucket aesthetic (bone/basalt ground,
 * aegean/gold/laurel accents, Cinzel + Fraunces type). Anonymous use is fully
 * intact — this only ADDS an optional sign-in.
 *
 * app.js calls `window.BucketAuthUI.mountInto(topbarEl)` from header(); this
 * module owns everything else (modal, state, re-render on auth change).
 */
(function (global) {
  "use strict";

  var Auth = global.BucketAuth;
  var lastState = Auth ? Auth.state() : { enabled: false, signedIn: false };

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* ---------- topbar control ---------- */

  // Inject the control as the LAST child of the given topbar element.
  function mountInto(topbar) {
    if (!Auth || !Auth.enabled) return; // auth disabled → render nothing
    var s = Auth.state();
    var btn = el("button", "auth-pill", controlLabel(s));
    btn.id = "authPill";
    btn.title = s.signedIn ? "Synced — tap to manage" : "Sign in to save your progress";
    btn.onclick = openModal;
    topbar.appendChild(btn);
  }

  function controlLabel(s) {
    if (s.syncing) return '<span class="auth-dot syncing"></span> Syncing…';
    if (s.signedIn) return '<span class="auth-dot on"></span> Saved';
    return '<span class="auth-dot"></span> Save progress';
  }

  // Re-render any live topbar pill when auth state changes.
  function refreshPill(s) {
    var pill = document.getElementById("authPill");
    if (pill) {
      pill.innerHTML = controlLabel(s);
      pill.title = s.signedIn
        ? "Synced — tap to manage"
        : "Sign in to save your progress";
    }
  }

  /* ---------- modal ---------- */

  var pending = { email: null, stage: "email" }; // email | code | done

  function openModal() {
    var s = Auth.state();
    var back = el("div", "auth-back");
    var card = el("div", "auth-card");
    back.appendChild(card);
    back.onclick = function (e) { if (e.target === back) back.remove(); };
    document.body.appendChild(back);

    if (s.signedIn) renderSignedIn(card, back);
    else renderEmail(card, back);
  }

  function renderEmail(card, back) {
    pending.stage = "email";
    card.innerHTML =
      '<div class="auth-title">Save your progress</div>' +
      '<p class="auth-sub">Optional. Sign in with your email to sync your ' +
      "streak, XP, and review schedule across devices. No password — we email " +
      "you a 6-digit code.</p>";
    var form = el("form", "auth-form");
    var input = el("input", "auth-input");
    input.type = "email";
    input.placeholder = "you@example.com";
    input.autocomplete = "email";
    input.required = true;
    var err = el("div", "auth-err hidden");
    var submit = el("button", "btn primary wide", "Email me a code");
    submit.type = "submit";
    form.appendChild(input);
    form.appendChild(err);
    form.appendChild(submit);
    form.onsubmit = function (e) {
      e.preventDefault();
      var email = input.value.trim();
      if (!email) return;
      submit.disabled = true;
      submit.textContent = "Sending…";
      err.classList.add("hidden");
      Auth.requestCode(email)
        .then(function () {
          pending.email = email;
          renderCode(card, back);
        })
        .catch(function (ex) {
          submit.disabled = false;
          submit.textContent = "Email me a code";
          showErr(err, ex);
        });
    };
    card.appendChild(form);
    card.appendChild(footer(back));
    setTimeout(function () { input.focus(); }, 30);
  }

  function renderCode(card, back) {
    pending.stage = "code";
    card.innerHTML =
      '<div class="auth-title">Enter your code</div>' +
      '<p class="auth-sub">We sent a 6-digit code to <b>' +
      escapeHtml(pending.email) +
      "</b>. Enter it below (or tap the magic link in the email).</p>";
    var form = el("form", "auth-form");
    var input = el("input", "auth-input code");
    input.type = "text";
    input.inputMode = "numeric";
    input.autocomplete = "one-time-code";
    input.maxLength = 6;
    input.placeholder = "······";
    var err = el("div", "auth-err hidden");
    var submit = el("button", "btn primary wide", "Verify & sync");
    submit.type = "submit";
    form.appendChild(input);
    form.appendChild(err);
    form.appendChild(submit);
    form.onsubmit = function (e) {
      e.preventDefault();
      var code = input.value.trim();
      if (!code) return;
      submit.disabled = true;
      submit.textContent = "Verifying…";
      err.classList.add("hidden");
      Auth.verifyCode(pending.email, code)
        .then(function () { renderDone(card, back); })
        .catch(function (ex) {
          submit.disabled = false;
          submit.textContent = "Verify & sync";
          showErr(err, ex);
        });
    };
    var resend = el("button", "auth-link", "Use a different email");
    resend.type = "button";
    resend.onclick = function () { renderEmail(card, back); };
    card.appendChild(form);
    card.appendChild(resend);
    card.appendChild(footer(back));
    setTimeout(function () { input.focus(); }, 30);
  }

  function renderDone(card, back) {
    pending.stage = "done";
    card.innerHTML =
      '<div class="auth-title">You\'re synced ✦</div>' +
      '<p class="auth-sub">Your progress is now saved to your account and will ' +
      "follow you across devices.</p>";
    var ok = el("button", "btn primary wide", "Back to learning");
    ok.onclick = function () { back.remove(); };
    card.appendChild(ok);
  }

  function renderSignedIn(card, back) {
    var s = Auth.state();
    card.innerHTML =
      '<div class="auth-title">Progress saved</div>' +
      '<p class="auth-sub">Signed in as <b>' +
      escapeHtml(s.email || "") +
      "</b>. Your streak, XP, and schedule sync automatically.</p>";
    var syncBtn = el("button", "btn wide", "Sync now");
    syncBtn.onclick = function () {
      syncBtn.disabled = true;
      syncBtn.textContent = "Syncing…";
      Auth.sync()
        .then(function () {
          syncBtn.textContent = "Synced ✓";
          setTimeout(function () { back.remove(); }, 600);
        })
        .catch(function () {
          syncBtn.disabled = false;
          syncBtn.textContent = "Sync now";
        });
    };
    var out = el("button", "btn ghost wide", "Sign out");
    out.onclick = function () {
      Auth.signOut().then(function () { back.remove(); });
    };
    card.appendChild(syncBtn);
    card.appendChild(out);
    card.appendChild(footer(back));
  }

  function footer(back) {
    var f = el("div", "auth-foot");
    var skip = el("button", "auth-link", "Keep using without an account");
    skip.type = "button";
    skip.onclick = function () { back.remove(); };
    f.appendChild(skip);
    return f;
  }

  function showErr(node, ex) {
    var msg = (ex && (ex.message || ex.error_description)) || "Something went wrong. Try again.";
    // Friendlier copy for the common Supabase cases.
    if (/rate|too many|429/i.test(msg)) msg = "Too many requests — wait a minute and try again.";
    else if (/invalid|expired|token/i.test(msg)) msg = "That code looks wrong or expired. Request a new one.";
    node.textContent = msg;
    node.classList.remove("hidden");
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------- wire up ---------- */

  if (Auth) {
    Auth.onChange(function (s) {
      lastState = s;
      refreshPill(s);
      // If a screen is showing and a sync just merged new state in, let the app
      // know so it can re-render from the merged localStorage.
      if (global.__BA_onAuthSync) {
        try { global.__BA_onAuthSync(s); } catch (e) {}
      }
    });
    Auth.init();
  }

  global.BucketAuthUI = { mountInto: mountInto };
})(typeof window !== "undefined" ? window : globalThis);
