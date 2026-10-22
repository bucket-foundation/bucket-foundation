import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { activeWorkspaceType, parseWorkspaceType, WEB_WORKSPACE_TYPES, WORKSPACE_TABS, workspaceHref } from "../src/lib/research-os/workspace-tabs";
import { workspaceItems } from "../src/lib/research-os/workspace-items";

const root = path.join(__dirname, "..");
const DESKTOP_ROUTER = fs.readFileSync(path.join(root, "packages/bkt-ui/src/router.ts"), "utf8");

test("study is the first tab and lives at the workspace root", () => {
  assert.equal(WEB_WORKSPACE_TYPES[0], "study");
  assert.equal(workspaceHref("study"), "/research-os/workspace");
  assert.equal(activeWorkspaceType("/research-os/workspace"), "study");
  assert.equal(activeWorkspaceType("/research-os/workspace/"), "study");
});

test("every list tab has its own path and reads back from it", () => {
  for (const type of WEB_WORKSPACE_TYPES.filter((t) => t !== "study")) {
    assert.equal(workspaceHref(type), `/research-os/workspace/${type}`);
    assert.equal(activeWorkspaceType(workspaceHref(type)), type);
  }
});

test("unknown and nested paths select no tab", () => {
  assert.equal(parseWorkspaceType("people"), null);
  assert.equal(parseWorkspaceType("my-data"), null);
  assert.equal(activeWorkspaceType("/research-os/workspace/maps/edtech"), null);
  assert.equal(activeWorkspaceType("/research-os/workspacex"), null);
  assert.equal(activeWorkspaceType("/research-os/home"), null);
});

const WEB_ONLY = new Set(["study", "datasets"]);

test("web tabs share desktop names only where they hold the same data", () => {
  const match = DESKTOP_ROUTER.match(/WORKSPACE_TYPES = \[([^\]]+)\]/);
  assert.ok(match);
  const desktop = match[1].split(",").map((s) => s.trim().replace(/"/g, ""));
  for (const type of WEB_WORKSPACE_TYPES) assert.ok(WEB_ONLY.has(type) !== desktop.includes(type), type);
  assert.equal(parseWorkspaceType("records"), null);
});

test("each list tab opens with rows in plain words and links to an existing page", () => {
  for (const type of ["figures", "maps", "datasets"] as const) {
    const items = workspaceItems(type);
    assert.ok(items.length > 0, type);
    assert.equal(new Set(items.map((i) => i.id)).size, items.length, type);
    for (const item of items) {
      assert.ok(item.title.length > 0 && item.line.length > 0, `${type}:${item.id}`);
      assert.ok(!item.line.trim().startsWith("{"), `${type}:${item.id}`);
      assert.ok(item.href.startsWith("/research/"), item.href);
    }
  }
  assert.ok(Object.values(WORKSPACE_TABS).every((t) => t.title && t.about));
});

test("map items point at map pages that exist", () => {
  for (const item of workspaceItems("maps")) {
    const dir = path.join(root, "src/app", item.href);
    assert.ok(fs.existsSync(path.join(dir, "page.tsx")), item.href);
  }
});
