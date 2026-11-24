import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Results, SIGN_IN_TO_SAVE } from "../../app/(site)/play/daily/DailyWorld";
import type { DailyResult } from "./store";

const result: DailyResult = { game: "daily-set", day: "2026-11-24", score: 4, total: 6, pattern: "110110", savedAt: 0, words: [] };

test("a device-only save offers a sign-in link that lands in the web app", () => {
  const html = renderToStaticMarkup(<Results title="Daily Set" result={result} url="https://polingual.com/play/daily-set" saved="device" />);
  assert.match(html, /Saved on this device\. Sign in to keep it\./);
  assert.ok(html.includes(`href="${SIGN_IN_TO_SAVE}"`));
  assert.equal(SIGN_IN_TO_SAVE, "/app?from=daily");
});

test("an account save shows no sign-in link", () => {
  const html = renderToStaticMarkup(<Results title="Daily Set" result={result} url="https://polingual.com/play/daily-set" saved="account" />);
  assert.ok(!html.includes("daily-sign-in"));
});
