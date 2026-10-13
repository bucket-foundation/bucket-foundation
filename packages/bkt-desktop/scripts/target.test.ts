import { expect, test } from "bun:test";
import { bunTarget, hostTriple, sidecarName } from "./target";

test("maps each release triple to a bun target", () => {
  expect(bunTarget("x86_64-unknown-linux-gnu")).toBe("bun-linux-x64");
  expect(bunTarget("aarch64-apple-darwin")).toBe("bun-darwin-arm64");
  expect(bunTarget("x86_64-pc-windows-msvc")).toBe("bun-windows-x64");
  expect(() => bunTarget("riscv64gc-unknown-linux-gnu")).toThrow();
});

test("names the sidecar the way tauri externalBin expects", () => {
  expect(sidecarName("x86_64-apple-darwin")).toBe("bkt-x86_64-apple-darwin");
  expect(sidecarName("x86_64-pc-windows-msvc")).toBe("bkt-x86_64-pc-windows-msvc.exe");
});

test("reads the host triple from rustc -vV", () => {
  expect(hostTriple("rustc 1.96.0\nbinary: rustc\nhost: x86_64-unknown-linux-gnu\nrelease: 1.96.0\n")).toBe("x86_64-unknown-linux-gnu");
  expect(() => hostTriple("rustc 1.96.0\n")).toThrow();
});
