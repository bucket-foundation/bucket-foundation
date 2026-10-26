import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "src-tauri");
const conf = JSON.parse(readFileSync(join(root, "tauri.conf.json"), "utf8"));
const cargo = readFileSync(join(root, "Cargo.toml"), "utf8");
const pkg = JSON.parse(readFileSync(join(import.meta.dir, "..", "package.json"), "utf8"));

test("the app carries the Polingual name and bundle id", () => {
  expect(conf.productName).toBe("Polingual");
  expect(conf.identifier).toBe("com.polingual.desktop");
  expect(conf.app.windows[0].title).toBe("Polingual");
});

test("versions agree across tauri, cargo and package.json", () => {
  expect(cargo).toContain(`version = "${conf.version}"`);
  expect(pkg.version).toBe(conf.version);
});

test("the polingual scheme is registered", () => {
  expect(conf.plugins["deep-link"].desktop.schemes).toEqual(["polingual"]);
});

test("every bundle icon exists", () => {
  for (const icon of conf.bundle.icon) expect(existsSync(join(root, icon))).toBe(true);
});

test("the Linux and Windows installers are built", () => {
  expect(conf.bundle.targets).toEqual(expect.arrayContaining(["deb", "rpm", "appimage", "msi"]));
});

test("the splash ships offline with its mark", () => {
  const splash = join(root, conf.build.frontendDist);
  for (const f of ["index.html", "splash.css", "mark.svg"]) expect(existsSync(join(splash, f))).toBe(true);
});

test("the shell holds no Bucket identifiers", () => {
  const raw = JSON.stringify(conf);
  expect(raw).not.toContain("foundation.bucket");
  expect(raw).not.toContain("bucket://");
  expect(conf.bundle.externalBin).toBeUndefined();
});

test("the main window is built in Rust so its navigation guards apply", () => {
  expect(conf.app.windows[0].label).toBe("main");
  expect(conf.app.windows[0].create).toBe(false);
});
