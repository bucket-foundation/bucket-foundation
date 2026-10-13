import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const out = resolve(process.argv[2]);
const pick = (name: string) => [join(out, name), join(out, `${name}.exe`)].find(existsSync)!;
const wasm = statSync(join(import.meta.dir, "rank.wasm")).size;
const withWasm = statSync(pick("app-wasm")).size;
const withTs = statSync(pick("app-ts")).size;
console.log(JSON.stringify({ target: `${process.platform}-${process.arch}`, bun: Bun.version, wasm_bytes: wasm, app_wasm_bytes: withWasm, app_ts_bytes: withTs, added_bytes: withWasm - withTs }));
