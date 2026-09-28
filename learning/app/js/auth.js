(function (global) {
  "use strict";

  var LS_BASE = "bucket-academy/v1";
  var SUPABASE_CDN =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

  var cfg = global.__BUCKET_SUPABASE || null;
  var enabled = !!(cfg && cfg.url && cfg.anonKey);

  var API_BASE =
    cfg && cfg.apiBase ? String(cfg.apiBase).replace(/\/$/, "") : "";
  var API_PROGRESS = API_BASE + "/api/academy/progress";
  var API_PROFILE = API_BASE + "/api/academy/profile";

  var sb = null;
  var framed = false;
  try { framed = global.parent && global.parent !== global; } catch (e) { framed = false; }
  var session = null;
  var listeners = [];
  var syncing = false;

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

  function mergeState(a, b) {
    if (!a) return b ? JSON.parse(JSON.stringify(b)) : a;
    if (!b) return JSON.parse(JSON.stringify(a));

    var out = {
      cards: {},
      settings: b.settings || a.settings || { newPerDay: 4, requestRetention: 0.9 },
      stats: { xp: 0, streak: 0, lastStudyDay: null, history: {} },
    };

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
    return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
  }

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
      sb.auth.onAuthStateChange(function (_event, s) {
        var was = !!session;
        session = s || null;
        if (!was && session) {
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

  function accessToken() {
    return session && session.access_token ? session.access_token : null;
  }

  function pullServer() {
    var tok = accessToken();
    if (!tok) return Promise.resolve({});
    return fetch(API_PROGRESS, {
      method: "GET",
      headers: { Authorization: "Bearer " + tok },
      credentials: "omit",
    }).then(function (res) {
      if (!res.ok) throw new Error("progress pull failed: " + res.status);
      return res.json().then(function (body) {
        return (body && body.branches) || {};
      });
    });
  }

  function pushBranch(uid, branch, state) {
    var tok = accessToken();
    if (!tok) return Promise.resolve(false);
    return fetch(API_PROGRESS, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + tok,
        "Content-Type": "application/json",
      },
      credentials: "omit",
      body: JSON.stringify({ branch: branch, data: state }),
    }).then(function (res) {
      if (!res.ok) throw new Error("progress push failed: " + res.status);
      return true;
    });
  }

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
          writeLocal(b, merged);
          pushes.push(pushBranch(uid, b, merged));
        });
        return Promise.all(pushes);
      })
      .then(function () {
        syncing = false;
        emit();
        return true;
      })
      .catch(function (err) {
        syncing = false;
        emit();
        throw err;
      });
  }

  function pushActive(branch) {
    if (!enabled || !session || !session.user) return Promise.resolve(false);
    var state = readLocal(branch);
    if (!state) return Promise.resolve(false);
    return pushBranch(session.user.id, branch, state).catch(function () {
      return false;
    });
  }

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
      framed: framed,
      signedIn: !!(session && session.user),
      email: session && session.user ? session.user.email : null,
      syncing: syncing,
    };
  }

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

  function getProfile() {
    var tok = accessToken();
    if (!enabled || !tok) return Promise.resolve(null);
    return fetch(API_PROFILE + "?me=1", {
      method: "GET",
      headers: { Authorization: "Bearer " + tok },
      credentials: "omit",
    }).then(function (res) {
      if (res.status === 503) return null;
      if (!res.ok) throw new Error("profile fetch failed: " + res.status);
      return res.json();
    });
  }

  function setProfile(patch) {
    var tok = accessToken();
    if (!enabled || !tok) return Promise.reject(new Error("not signed in"));
    return fetch(API_PROFILE, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + tok,
        "Content-Type": "application/json",
      },
      credentials: "omit",
      body: JSON.stringify(patch || {}),
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok || (body && body.error)) {
          var err = new Error((body && (body.message || body.error)) || ("HTTP " + res.status));
          err.code = body && body.error;
          throw err;
        }
        return body;
      });
    });
  }

  function adoptSession(s) {
    return ensureClient().then(function () {
      if (s && s.access_token && s.refresh_token) {
        return sb.auth.setSession({ access_token: s.access_token, refresh_token: s.refresh_token });
      }
      if (session) return sb.auth.signOut();
      return null;
    }).catch(function () {});
  }

  function listenToParent() {
    if (!framed || !enabled) return;
    global.addEventListener("message", function (e) {
      if (e.origin !== global.location.origin || e.source !== global.parent) return;
      var d = e.data;
      if (!d || d.type !== "bucket:session") return;
      adoptSession(d.session || null);
    });
    try {
      global.parent.postMessage({ type: "bucket:session-request" }, global.location.origin);
    } catch (e) {}
  }

  function init() {
    if (!enabled) { emit(); return; }
    ensureClient().catch(function () {});
    listenToParent();
  }

  global.BucketAuth = {
    enabled: enabled,
    init: init,
    onChange: onChange,
    state: publicState,
    requestCode: requestCode,
    verifyCode: verifyCode,
    signOut: signOut,
    adoptSession: adoptSession,
    sync: syncAll,
    pushActive: pushActive,
    getProfile: getProfile,
    accessToken: accessToken,
    setProfile: setProfile,
    _mergeState: mergeState,
  };
})(typeof window !== "undefined" ? window : globalThis);
