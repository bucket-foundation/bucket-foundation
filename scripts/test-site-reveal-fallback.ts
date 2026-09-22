/**
 * A page may not hide its own body behind a script.
 *
 * The Research OS landing page reveals each of its five states with an
 * IntersectionObserver that adds `is-visible`. The CSS starts those rows
 * at `opacity: 0`, so with scripting off nothing ever adds the class and
 * the whole body of the page stays invisible: measured at 10 of 10
 * reveal elements transparent before the fallback landed.
 *
 * This reads the stylesheet, so it needs no browser and runs anywhere.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..");
const CSS = path.join(root, "src/app/research-os/landing.css");
const PAGE = path.join(root, "src/app/research-os/page.tsx");

/** The selectors a block sets `opacity: 0` on. */
function hiddenSelectors(css: string): string[] {
  const out: string[] = [];
  const rule = /([^{}]+)\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = rule.exec(css))) {
    if (!/opacity\s*:\s*0\s*[;}]/.test(m[2])) continue;
    for (const sel of m[1].split(",")) {
      const s = sel.trim();
      if (s && !s.startsWith("@")) out.push(s);
    }
  }
  return out;
}

/** The selectors a block sets `opacity: 1` on. */
function shownSelectors(css: string): string[] {
  const out: string[] = [];
  const rule = /([^{}]+)\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = rule.exec(css))) {
    if (!/opacity\s*:\s*1\s*[;}]/.test(m[2])) continue;
    for (const sel of m[1].split(",")) {
      const s = sel.trim();
      if (s && !s.startsWith("@")) out.push(s);
    }
  }
  return out;
}

/** The body of a media query, by its condition. */
function mediaBody(css: string, condition: string): string {
  const at = css.indexOf(`@media ${condition}`);
  if (at === -1) return "";
  let depth = 0;
  for (let i = css.indexOf("{", at); i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(css.indexOf("{", at) + 1, i);
    }
  }
  return "";
}

test("nothing the landing page hides stays hidden when scripting is off", () => {
  const css = fs.readFileSync(CSS, "utf8");
  const fallback = mediaBody(css, "(scripting: none)");
  assert.notEqual(fallback, "", "landing.css carries a @media (scripting: none) block");

  // The fallback's own rules are the cure, so they are read separately
  // from the rest of the file rather than counted as more hiding.
  const hidden = hiddenSelectors(css.split(fallback).join(""));
  const restored = shownSelectors(fallback);

  for (const sel of hidden) {
    assert.ok(
      restored.indexOf(sel) !== -1,
      `${sel} starts at opacity 0 and nothing restores it without scripting. Add it to the @media (scripting: none) block in landing.css. Restored today: ${restored.join(", ") || "none"}`,
    );
  }
  assert.ok(hidden.length > 0, "the check found the rules it is meant to police");
});

test("the page carries a noscript fallback for browsers without the media query", () => {
  const page = fs.readFileSync(PAGE, "utf8");
  assert.match(page, /<noscript>/, "page.tsx carries a noscript block");
  const block = page.slice(page.indexOf("<noscript>"), page.indexOf("</noscript>"));
  assert.match(block, /opacity\s*:\s*1/, "and that block restores opacity");
});
