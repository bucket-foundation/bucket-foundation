import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { bunTarget, hostTriple, sidecarName } from "./target";

const here = resolve(import.meta.dir, "..");
const bkt = resolve(here, "../bkt");

function run(cmd: string[], cwd: string): string {
  const p = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "inherit" });
  if (p.exitCode !== 0) throw new Error(`${cmd.join(" ")} exited ${p.exitCode}`);
  return p.stdout.toString();
}

const triple = process.env.TAURI_TARGET_TRIPLE ?? hostTriple(run(["rustc", "-vV"], here));
const out = resolve(here, "src-tauri/binaries", sidecarName(triple));
mkdirSync(resolve(here, "src-tauri/binaries"), { recursive: true });
run(["bun", "install", "--frozen-lockfile"], bkt);
run(["bun", "run", "pack:content"], bkt);
run(["bun", "build", "--compile", "--minify", `--target=${bunTarget(triple)}`, "src/cli.tsx", "--outfile", out], bkt);
console.log(out);
