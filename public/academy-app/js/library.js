/* Bucket Academy — custom-deck library.
 *
 * Generalizes the Academy from fixed built-in branches to "learn ANY topic, ANY
 * language". User-created decks (from the ✦ New… flow, produced by the Anthropic
 * generate route) are saved here so they persist:
 *   - to localStorage ALWAYS (offline-first, works signed-out)
 *   - ALSO synced to the server when signed in, via window.BucketAuth (if it exposes
 *     a deck API). If BucketAuth is absent we silently fall back to localStorage only.
 *
 * A "deck record" mirrors a manifest entry plus the full corpus payload:
 *   { id, file:null, pill, sub, kind?, languages?, generated:true, createdAt, data:{meta,atoms} }
 * The deck's corpus is loaded into the Engine via Engine.loadData(record.data, record.id)
 * — no network fetch, no file on disk. Built-in decks are untouched by this module.
 */
(function (global) {
  "use strict";

  var LS_KEY = "bucket-academy/custom-decks/v1";

  function read() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }
  function write(arr) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(arr));
    } catch (e) {}
  }

  // Does the connected auth global expose a deck-sync API? It's optional and
  // owned by another module; we feature-detect rather than depend on it.
  function auth() {
    return (typeof global !== "undefined" && global.BucketAuth) || null;
  }
  function authHas(fn) {
    var a = auth();
    return !!(a && typeof a[fn] === "function");
  }

  var Library = {
    LS_KEY: LS_KEY,

    // All locally-known custom deck records (newest first).
    list: function () {
      return read().slice().sort(function (a, b) {
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    },

    get: function (id) {
      return read().find(function (d) {
        return d.id === id;
      }) || null;
    },

    has: function (id) {
      return !!this.get(id);
    },

    // Build a fresh deck id from a slug, de-duplicating against built-ins + customs.
    makeId: function (slug, taken) {
      var base = "user:" + String(slug || "deck")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "user:deck";
      var id = base;
      var n = 2;
      var exists = function (x) {
        return (taken && taken.indexOf(x) !== -1) || Library.has(x);
      };
      while (exists(id)) {
        id = base + "-" + n++;
      }
      return id;
    },

    // Persist a record locally, then best-effort sync to the server.
    save: function (record) {
      var arr = read().filter(function (d) {
        return d.id !== record.id;
      });
      arr.push(record);
      write(arr);
      this._syncSave(record);
      return record;
    },

    remove: function (id) {
      write(
        read().filter(function (d) {
          return d.id !== id;
        })
      );
      this._syncRemove(id);
    },

    /* ---- server sync (best-effort, never blocks the UI) ---- */

    // Pull server-stored decks (when signed in) and merge into localStorage.
    // Resolves to the merged list; never throws.
    pull: function () {
      if (!authHas("listDecks")) return Promise.resolve(this.list());
      var self = this;
      return Promise.resolve()
        .then(function () {
          return auth().listDecks();
        })
        .then(function (remote) {
          if (Array.isArray(remote) && remote.length) {
            var local = read();
            var byId = {};
            local.forEach(function (d) {
              byId[d.id] = d;
            });
            remote.forEach(function (d) {
              if (d && d.id && d.data) byId[d.id] = d;
            });
            write(Object.keys(byId).map(function (k) {
              return byId[k];
            }));
          }
          return self.list();
        })
        .catch(function () {
          return self.list();
        });
    },

    _syncSave: function (record) {
      if (!authHas("saveDeck")) return;
      try {
        Promise.resolve(auth().saveDeck(record)).catch(function () {});
      } catch (e) {}
    },

    _syncRemove: function (id) {
      if (!authHas("deleteDeck")) return;
      try {
        Promise.resolve(auth().deleteDeck(id)).catch(function () {});
      } catch (e) {}
    },
  };

  global.BucketLibrary = Library;
})(typeof window !== "undefined" ? window : globalThis);
