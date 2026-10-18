import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export default async function globalSetup(): Promise<() => Promise<void>> {
  const home = mkdtempSync(join(tmpdir(), "ux-freeze-"));
  const child = spawn("bun", ["src/cli.tsx", "serve", "--keyring", "passphrase", "--passphrase-fd", "3"], {
    cwd: resolve(here, "../../bkt"),
    env: { ...process.env, BKT_HOME: join(home, "data"), XDG_RUNTIME_DIR: join(home, "run"), BKT_OFFLINE: "1", BKT_UI_DIR: resolve(here, "../dist") },
    stdio: ["ignore", "pipe", "inherit", "pipe"],
  });
  const fd3 = child.stdio[3] as NodeJS.WritableStream;
  fd3.end("ux-freeze-passphrase\n");
  const url = await new Promise<string>((done, fail) => {
    let out = "";
    const timer = setTimeout(() => fail(new Error(`bkt serve printed no URL: ${out}`)), 60_000);
    child.stdout!.on("data", (b: Buffer) => {
      out += b.toString();
      const m = out.match(/http:\/\/127\.0\.0\.1:\d+\//);
      if (m) {
        clearTimeout(timer);
        done(m[0]);
      }
    });
    child.on("exit", (code) => fail(new Error(`bkt serve exited ${code}: ${out}`)));
  });
  process.env.UX_FREEZE_URL = url;
  return async () => {
    child.kill();
    rmSync(home, { recursive: true, force: true });
  };
}
