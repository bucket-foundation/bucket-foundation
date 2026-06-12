/* Bucket Academy — optional sign-in + cross-device progress sync (bkt-su9).
 *
 * Passwordless EMAIL OTP via Supabase Auth. Anonymous local-first use keeps
 * working with NO sign-in — this module only ADDS cross-device save/sync.
 *
 * Design:
 *  - Loads the Supabase JS client from CDN (the anon key is public by design;
 *    Row-Level Security is the real boundary — a user can only read/write their
 *    own rows in public.academy_progress).
 *  - Public config (URL + anon key) is injected at build time by
 *    scripts/sync-academy.mjs into js/auth-config.js (window.__BUCKET_SUPABASE).
 *    When that config is absent (no env), auth disables itself silently and the
 *    app stays purely anonymous + local.
 *  - Progress lives in localStorage under `bucket-academy/v1/<branch>` exactly
 *    as engine.js writes it. On sign-in we MERGE local⇄server per-card by the
 *    most recent review (`lastReview`), then push the merged blob up and write
 *    it back down, so every device converges.
 *
 * This module is intentionally framework-free and self-contained, mirroring the
 * rest of the static app. It exposes `window.BucketAuth`.
 */
(function (global) {
  "use strict";

  var LS_BASE = "bucket-academy/v1";
  var SUPABASE_CDN =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

  var cfg = global.__BUCKET_SUPABASE || null;
  var enabled = !!(cfg && cfg.url && cfg.anonKey);

  var sb = null; // Supabase client (lazy)
  var session = null; // current Supabase session (or null)
  var listeners = []; // onChange subscribers
  var syncing = false;

  /* ---------- localStorage helpers (the same keys engine.js uses) ---------- */

  // All branch blobs currently on this device → { branch: stateObj }
  function readAllLocal() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(LS_BASE + "/") === 0) {
          var branch = k.slice((LS_BASE + "/").length);
          try {
            out[branch] = JSON.parse(localStorage.getItem(k)) || null;
          } catch (e) {
            /* skip corrupt blob */
          }
        }
      }
    } catch (e) {}
    return out;
  }

  function readLocal(branch) {
    try {
      return JSON.parse(localStorage.getItem(LS_BASE + "/" + branch));
    } catch (e) {
      return null;
    }
  }

  function writeLocal(branch, state) {
    try {
      localStorage.setItem(LS_BASE + "/" + branch, JSON.stringify(state));
    } catch (e) {}
  }

  /* ---------- merge (commutative, idempotent, convergent) ---------- */

  // Merge two engine states for the SAME branch. Cards merge per-id by the most
  // recent `lastReview`; stats take the monotonic max; history unions by day;
  // settings come from whichever blob was touched last (the caller decides
  // ordering — `b` is treated as "newer or equal" on exact ties).
  function mergeState(a, b) {
    if (!a) return b ? JSON.parse(JSON.stringify(b)) : a;
    if (!b) return JSON.parse(JSON.stringify(a));

    var out = {
      cards: {},
      settings: b.settings || a.settings || { newPerDay: 4, requestRetention: 0.9 },
      stats: { xp: 0, streak: 0, lastStudyDay: null, history: {} },
    };

    // cards: union of ids, keep the most-recently-reviewed version
    var ids = {};
    Object.keys((a.cards || {})).forEach(function (id) { ids[id] = 1; });
    Object.keys((b.cards || {})).forEach(function (id) { ids[id] = 1; });
    Object.keys(ids).forEach(function (id) {
      var ca = a.cards && a.cards[id];
      var cb = b.cards && b.cards[id];
      if (!ca) { out.cards[id] = cb; return; }
      if (!cb) { out.cards[id] = ca; return; }
      var la = ca.lastReview || 0;
      var lb = cb.lastReview || 0;
      out.cards[id] = lb >= la ? cb : ca;
    });

    // stats: xp is monotonic non-decreasing → max; streak → max; lastStudyDay →
    // lexically/temporally latest; history → union with max counts per day.
    var sa = a.stats || {};
    var sb2 = b.stats || {};
    out.stats.xp = Math.max(sa.xp || 0, sb2.xp || 0);
    out.stats.streak = Math.max(sa.streak || 0, sb2.streak || 0);
    out.stats.lastStudyDay = latestDay(sa.lastStudyDay, sb2.lastStudyDay);
    var ha = sa.history || {};
    var hb = sb2.history || {};
    var days = {};
    Object.keys(ha).forEach(function (d) { days[d] = 1; });
    Object.keys(hb).forEach(function (d) { days[d] = 1; });
    Object.keys(days).forEach(function (d) {
      var x = ha[d] || {};
      var y = hb[d] || {};
      out.stats.history[d] = {
        new: Math.max(x.new || 0, y.new || 0),
        reviews: Math.max(x.reviews || 0, y.reviews || 0),
      };
    });

    return out;
  }

  function latestDay(a, b) {
    if (!a) return b || null;
    if (!b) return a || null;
    // day keys are "YYYY-M-D"; compare by real date.
    return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
  }

  /* ---------- Supabase plumbing ---------- */

  function ensureClient() {
    if (sb) return Promise.resolve(sb);
    if (!enabled) return Promise.reject(new Error("auth disabled"));
    return import(SUPABASE_CDN).then(function (mod) {
      sb = mod.createClient(cfg.url, cfg.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "bucket-academy/auth",
        },
      });
      // Track auth state for the lifetime of the page.
      sb.auth.onAuthStateChange(function (_event, s) {
        var was = !!session;
        session = s || null;
        if (!was && session) {
          // Just signed in → sync once.
          syncAll().catch(function () {});
        }
        emit();
      });
      return sb.auth.getSession().then(function (r) {
        session = (r && r.data && r.data.session) || null;
        emit();
        return sb;
      });
    });
  }

  // Pull every server row → { branch: { data, updated_at } }
  function pullServer() {
    return sb
      .from("academy_progress")
      .select("branch,data,updated_at")
      .then(function (res) {
        if (res.error) throw res.error;
        var map = {};
        (res.data || []).forEach(function (row) {
          map[row.branch] = { data: row.data, updated_at: row.updated_at };
        });
        return map;
      });
  }

  // Upsert one branch blob.
  function pushBranch(uid, branch, state) {
    return sb
      .from("academy_progress")
      .upsert(
        {
          user_id: uid,
          branch: branch,
          data: state,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,branch" }
      )
      .then(function (res) {
        if (res.error) throw res.error;
        return true;
      });
  }

  /* ---------- the merge/sync orchestration ---------- */

  // Merge local ⇄ server across all branches, write the merged result back to
  // localStorage AND to the server, then refresh the running engine if present.
  function syncAll() {
    if (!session || !session.user) return Promise.resolve(false);
    if (syncing) return Promise.resolve(false);
    syncing = true;
    var uid = session.user.id;
    var localAll = readAllLocal();

    return pullServer()
      .then(function (serverAll) {
        var branches = {};
        Object.keys(localAll).forEach(function (b) { branches[b] = 1; });
        Object.keys(serverAll).forEach(function (b) { branches[b] = 1; });

        var pushes = [];
        Object.keys(branches).forEach(function (b) {
          var localState = localAll[b] || null;
          var serverState = serverAll[b] ? serverAll[b].data : null;
          var merged = mergeState(localState, serverState);
          if (!merged) return;
          // write merged back to this device
          writeLocal(b, merged);
          // push merged up (idempotent upsert)
          pushes.push(pushBranch(uid, b, merged));
        });
        return Promise.all(pushes);
      })
      .then(function () {
        syncing = false;
        emit(); // let the app refresh the current screen from merged state
        return true;
      })
      .catch(function (err) {
        syncing = false;
        emit();
        throw err;
      });
  }

  // Push only the active branch (called after a study action when signed in).
  function pushActive(branch) {
    if (!enabled || !session || !session.user) return Promise.resolve(false);
    var state = readLocal(branch);
    if (!state) return Promise.resolve(false);
    return pushBranch(session.user.id, branch, state).catch(function () {
      return false;
    });
  }

  /* ---------- listeners ---------- */

  function emit() {
    listeners.slice().forEach(function (fn) {
      try { fn(publicState()); } catch (e) {}
    });
  }
  function onChange(fn) {
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (f) { return f !== fn; });
    };
  }
  function publicState() {
    return {
      enabled: enabled,
      signedIn: !!(session && session.user),
      email: session && session.user ? session.user.email : null,
      syncing: syncing,
    };
  }

  /* ---------- public API ---------- */

  // Send a 6-digit OTP (and magic link) to `email`.
  function requestCode(email) {
    return ensureClient().then(function () {
      return sb.auth
        .signInWithOtp({
          email: email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo:
              global.location.origin + global.location.pathname,
          },
        })
        .then(function (res) {
          if (res.error) throw res.error;
          return true;
        });
    });
  }

  // Verify the 6-digit `token` for `email`.
  function verifyCode(email, token) {
    return ensureClient().then(function () {
      return sb.auth
        .verifyOtp({ email: email, token: String(token).trim(), type: "email" })
        .then(function (res) {
          if (res.error) throw res.error;
          session = res.data.session || null;
          emit();
          return syncAll().then(function () { return true; });
        });
    });
  }

  function signOut() {
    if (!sb) return Promise.resolve();
    return sb.auth.signOut().then(function () {
      session = null;
      emit();
    });
  }

  // Best-effort: if a magic-link redirect lands us here already signed in,
  // ensureClient() picks up the session and fires onAuthStateChange.
  function init() {
    if (!enabled) { emit(); return; }
    ensureClient().catch(function () {});
  }

  global.BucketAuth = {
    enabled: enabled,
    init: init,
    onChange: onChange,
    state: publicState,
    requestCode: requestCode,
    verifyCode: verifyCode,
    signOut: signOut,
    sync: syncAll,
    pushActive: pushActive,
    // exposed for tests
    _mergeState: mergeState,
  };
})(typeof window !== "undefined" ? window : globalThis);
