import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { ApiError, type UpdateOutcome, type UpdateView } from "./api";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());

const AVAILABLE: UpdateView = { current: "0.5.0", kind: "appimage", selfUpdate: true, instruction: null, result: { status: "available", version: "0.6.0", tag: "bkt-v0.6.0", asset: "Bucket-0.6.0-x86_64.AppImage", sha256: "a".repeat(64), url: "https://x" } };

async function mount(api: { checkUpdate: () => Promise<UpdateView>; installUpdate: () => Promise<UpdateOutcome> }) {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { UpdatePanel } = await import("./views/Settings");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<UpdatePanel api={api} />));
  const click = async (label: string) => {
    const b = [...host.querySelectorAll("button")].find((x) => x.textContent === label);
    if (!b) throw new Error(`no button ${label} in ${host.textContent}`);
    await act(async () => b.click());
    for (let i = 0; i < 5; i++) await act(async () => new Promise((r) => setTimeout(r, 0)));
  };
  const buttons = () => [...host.querySelectorAll("button")].map((b) => b.textContent);
  return { host, click, buttons, unmount: () => act(async () => root.unmount()) };
}

describe("update panel", () => {
  test("checks, offers the update and installs it", async () => {
    let installs = 0;
    const m = await mount({ checkUpdate: async () => AVAILABLE, installUpdate: async () => (installs++, { status: "installed", version: "0.6.0" }) });
    expect(m.buttons()).toEqual(["Check for updates"]);
    await m.click("Check for updates");
    expect(m.host.textContent).toContain("Bucket 0.6.0 is available. Its signature checks out.");
    await m.click("Update to 0.6.0");
    expect(installs).toBe(1);
    expect(m.host.querySelector(".status")!.textContent).toBe("Bucket 0.6.0 is installed. Quit Bucket and open it again to use it.");
    expect(m.buttons()).toEqual(["Check for updates"]);
    await m.unmount();
  });

  test("says when this copy is current", async () => {
    const m = await mount({ checkUpdate: async () => ({ ...AVAILABLE, result: { status: "current", version: "0.6.0" } }), installUpdate: async () => ({ status: "current", version: "0.6.0" }) });
    await m.click("Check for updates");
    expect(m.host.textContent).toContain("Bucket 0.6.0 is the latest release.");
    expect(m.buttons()).toEqual(["Check for updates"]);
    await m.unmount();
  });

  test("shows the instruction for installs that update elsewhere", async () => {
    const m = await mount({ checkUpdate: async () => ({ ...AVAILABLE, kind: "flatpak", selfUpdate: false, instruction: "Update Bucket with: flatpak update" }), installUpdate: async () => ({ status: "error", error: "x" }) });
    await m.click("Check for updates");
    expect(m.host.textContent).toContain("Update Bucket with: flatpak update");
    expect(m.buttons()).toEqual(["Check for updates"]);
    await m.unmount();
  });

  test("reports a failed check and a failed install", async () => {
    const bad = await mount({ checkUpdate: async () => ({ ...AVAILABLE, result: { status: "error", error: "signature check failed" } }), installUpdate: async () => ({ status: "error", error: "x" }) });
    await bad.click("Check for updates");
    expect(bad.host.querySelector(".error")!.textContent).toBe("The update check failed: signature check failed");
    await bad.unmount();

    const refused = await mount({ checkUpdate: async () => AVAILABLE, installUpdate: () => Promise.reject(new ApiError("the download does not match the signed checksum", 502)) });
    await refused.click("Check for updates");
    await refused.click("Update to 0.6.0");
    expect(refused.host.querySelector(".error")!.textContent).toBe("Bucket could not finish the update: the download does not match the signed checksum");
    await refused.unmount();
  });
});
