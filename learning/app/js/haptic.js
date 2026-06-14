/* Bucket Academy — cross-platform haptics.
 *
 * Android Chrome exposes navigator.vibrate(); iOS Safari exposes NO Vibration API.
 * The working iOS trick (Safari 17.4+, GRAPHICS-RENDERING.md §3.6): a
 * <input type="checkbox" switch> fires a SYSTEM haptic when toggled — so we create
 * one off-screen, toggle it, and reuse it. Everything degrades to a silent no-op.
 *
 * Public:  window.haptic(kind)  where kind ∈
 *   "tap" | "correct" | "wrong" | "unlock" | "celebrate" | "select"
 *
 * Honors prefers-reduced-motion (treats it as a "reduce feedback" signal too) and a
 * one-time capability probe so we never spam.
 */
(function (root) {
  "use strict";

  var reduce = false;
  try {
    reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  var canVibrate = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

  // iOS switch-haptic element, lazily created on first use (after a user gesture).
  var iosSwitch = null;
  var iosSupported = null; // null = untested
  function iosHapticSupported() {
    if (iosSupported !== null) return iosSupported;
    try {
      var i = document.createElement("input");
      i.setAttribute("type", "checkbox");
      // `switch` is the iOS-only attribute that turns a checkbox into a haptic switch
      i.setAttribute("switch", "");
      // feature-detect: Safari reflects the switch attribute; others ignore it
      iosSupported = "popover" in HTMLElement.prototype && /iphone|ipad|ipod/i.test(navigator.userAgent || "");
    } catch (e) {
      iosSupported = false;
    }
    return iosSupported;
  }
  function ensureIosSwitch() {
    if (iosSwitch) return iosSwitch;
    var i = document.createElement("input");
    i.type = "checkbox";
    i.setAttribute("switch", "");
    i.setAttribute("aria-hidden", "true");
    i.tabIndex = -1;
    i.style.cssText = "position:absolute;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.body.appendChild(i);
    iosSwitch = i;
    return i;
  }
  function iosTick() {
    try {
      var sw = ensureIosSwitch();
      sw.checked = !sw.checked; // toggling fires the system haptic
    } catch (e) {}
  }

  // vibration patterns per kind (ms). Short + crisp; "never red"/non-punishing ethos:
  // wrong is a gentle double-tap, not a harsh buzz.
  var PATTERNS = {
    tap: 8,
    select: 12,
    correct: [0, 18],
    wrong: [0, 14, 60, 14],
    unlock: [0, 22, 50, 12],
    celebrate: [0, 26, 40, 18, 40, 26],
  };

  function haptic(kind) {
    if (reduce) return;
    kind = kind || "tap";
    if (canVibrate) {
      try {
        navigator.vibrate(PATTERNS[kind] != null ? PATTERNS[kind] : 10);
        return;
      } catch (e) {}
    }
    if (iosHapticSupported()) {
      // iOS can only do single ticks; emit one (or two for emphatic kinds)
      iosTick();
      if (kind === "unlock" || kind === "celebrate" || kind === "wrong") setTimeout(iosTick, 70);
    }
  }

  root.haptic = haptic;
})(typeof window !== "undefined" ? window : this);
