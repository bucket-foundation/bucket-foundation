import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { formatStars, loadStars } from "../src/lib/format-stars";

const root = path.join(__dirname, "..");
const BUTTON = fs.readFileSync(path.join(root, "src/components/GitHubStarButton.tsx"), "utf8");
const HEADER = fs.readFileSync(path.join(root, "src/components/HeaderV3.tsx"), "utf8");

test("button links to the public repo in a new tab", () => {
  assert.match(BUTTON, /GITHUB_URL = "https:\/\/github\.com\/bucket-foundation\/bucket-foundation"/);
  assert.match(BUTTON, /href=\{GITHUB_URL\}/);
  assert.match(BUTTON, /target="_blank"/);
  assert.match(BUTTON, /rel="noopener noreferrer"/);
});

test("header renders the button before the user menu", () => {
  const button = HEADER.indexOf("<GitHubStarButton />");
  const menu = HEADER.indexOf("<UserMenu");
  assert.ok(button > 0 && menu > button);
});

test("star counts format like the OpenScriva button", () => {
  assert.equal(formatStars(0), "0");
  assert.equal(formatStars(999), "999");
  assert.equal(formatStars(1234), "1.2k");
});

const okFetch = (body: unknown, ok = true) =>
  (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

test("loadStars returns the count on success", async () => {
  assert.equal(await loadStars("u", new AbortController().signal, okFetch({ stargazers_count: 42 })), 42);
});

test("loadStars returns null on a non-ok response", async () => {
  assert.equal(await loadStars("u", new AbortController().signal, okFetch({}, false)), null);
});

test("loadStars returns null when the body has no count", async () => {
  assert.equal(await loadStars("u", new AbortController().signal, okFetch({ message: "rate limited" })), null);
});

test("loadStars returns null when fetch rejects", async () => {
  const failing = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
  assert.equal(await loadStars("u", new AbortController().signal, failing), null);
});

test("loadStars passes the abort signal and returns null once aborted", async () => {
  const controller = new AbortController();
  const aborting = ((_: string, init?: RequestInit) =>
    new Promise((_r, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    })) as unknown as typeof fetch;
  const pending = loadStars("u", controller.signal, aborting);
  controller.abort();
  assert.equal(await pending, null);
});

test("button is a 44px square below sm with the star and count hidden", () => {
  assert.match(BUTTON, /h-11 w-11 sm:w-auto sm:px-3/);
  assert.match(BUTTON, /className="hidden sm:block"[^>]*viewBox="0 0 24 24"/);
  assert.match(BUTTON, /className="hidden sm:inline/);
  assert.match(BUTTON, /if \(!controller\.signal\.aborted\) setStars/);
});
