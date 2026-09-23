(function (root) {
  "use strict";

  var reduce = false;
  try {
    reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  var canVibrate = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

  var iosSwitch = null;
  var iosSupported = null;
  function iosHapticSupported() {
    if (iosSupported !== null) return iosSupported;
    try {
      var i = document.createElement("input");
      i.setAttribute("type", "checkbox");
      i.setAttribute("switch", "");
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
      sw.checked = !sw.checked;
    } catch (e) {}
  }

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
      iosTick();
      if (kind === "unlock" || kind === "celebrate" || kind === "wrong") setTimeout(iosTick, 70);
    }
  }

  root.haptic = haptic;
})(typeof window !== "undefined" ? window : this);
