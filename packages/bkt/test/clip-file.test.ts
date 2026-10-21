import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clipFile, page } from "../src/serve";

function uiWithClip(): string {
  const dir = mkdtempSync(join(tmpdir(), "bkt-clip-"));
  mkdirSync(join(dir, "academy-app", "audio", "he"), { recursive: true });
  writeFileSync(join(dir, "academy-app", "audio", "index.json"), '{"he":["0123456789abcdef"]}');
  writeFileSync(join(dir, "academy-app", "audio", "he", "0123456789abcdef.mp3"), new Uint8Array([0xff, 0xfb, 0x90]));
  return dir;
}

test("clipFile serves the clip index and an mp3 from the window files", () => {
  const dir = uiWithClip();
  expect(clipFile(dir, "/academy-app/audio/index.json")?.type).toBe("application/json");
  const mp3 = clipFile(dir, "/academy-app/audio/he/0123456789abcdef.mp3");
  expect(mp3?.type).toBe("audio/mpeg");
  expect(mp3?.body.length).toBe(3);
});

test("clipFile refuses other paths and missing clips", () => {
  const dir = uiWithClip();
  for (const p of ["/academy-app/audio/../index.json", "/academy-app/audio/he/x.mp3", "/academy-app/audio/he/fedcba9876543210.mp3", "/academy-app/corpus/index.json"]) {
    expect(clipFile(dir, p)).toBeNull();
  }
  expect(clipFile(undefined, "/academy-app/audio/index.json")).toBeNull();
});

test("the window allows audio from the local server", () => {
  expect(page("n").csp).toContain("media-src 'self'");
});
