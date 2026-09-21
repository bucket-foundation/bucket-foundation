// Pyodide check of the research tools (ros-workbench 0).
//
// Loads Pyodide under Node, installs the packages the candidate tools import,
// copies the tool modules into Pyodide's file system, replays every payload in
// the baseline from baseline.py, and compares each result to the CPython one.
//
// Setup, in any scratch directory outside this repository:
//
//   npm install pyodide@314.0.7
//
// Run from services/research-tools/:
//
//   python3 pyodide/baseline.py /path/to/baseline.json
//   node pyodide/check.mjs /path/to/node_modules/pyodide /path/to/baseline.json
//
// Pyodide reads each package wheel from the pyodide directory when the file is
// there and from its CDN otherwise. Exits 1 when any tool fails to run.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const [pyodideDir, baselinePath] = process.argv.slice(2);
if (!pyodideDir || !baselinePath) {
  console.error("usage: node pyodide/check.mjs <pyodide dir> <baseline.json>");
  process.exit(2);
}
const toolsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { loadPyodide } = await import(pathToFileURL(path.join(path.resolve(pyodideDir), "pyodide.mjs")).href);

const started = Date.now();
const py = await loadPyodide();
await py.loadPackage(["numpy", "scipy", "networkx", "scikit-image"]);
console.log(`pyodide ${py.version}, packages loaded in ${((Date.now() - started) / 1000).toFixed(1)} s`);

py.FS.mkdirTree("/tools");
for (const name of fs.readdirSync(toolsDir)) {
  if (/^tools_.*\.py$/.test(name) || name === "llm_client.py") {
    py.FS.writeFile(`/tools/${name}`, fs.readFileSync(path.join(toolsDir, name), "utf8"));
  }
}
py.FS.writeFile("/baseline.json", fs.readFileSync(baselinePath, "utf8"));

const rows = JSON.parse(
  await py.runPythonAsync(`
import importlib, json, math, sys, time
sys.path.insert(0, "/tools")
CLOCK = {"elapsed_ms", "runtime_ms", "generated_at", "timestamp"}

def norm(x):
    if isinstance(x, float):
        return None if math.isnan(x) else float(f"{x:.6g}")
    if isinstance(x, dict):
        return {k: norm(v) for k, v in x.items() if k not in CLOCK}
    if isinstance(x, (list, tuple)):
        return [norm(v) for v in x]
    return x

def diff(a, b, where=""):
    if type(a) is not type(b):
        return [where or "/"]
    if isinstance(a, dict):
        out = []
        for k in sorted(set(a) | set(b)):
            out += [f"{where}/{k}"] if (k not in a or k not in b) else diff(a[k], b[k], f"{where}/{k}")
        return out
    if isinstance(a, list):
        if len(a) != len(b):
            return [f"{where} length {len(a)} against {len(b)}"]
        out = []
        for i, (x, y) in enumerate(zip(a, b)):
            out += diff(x, y, f"{where}[{i}]")
        return out
    return [] if a == b else [where]

rows = []
for tool, case in json.load(open("/baseline.json")).items():
    t0 = time.time()
    try:
        fn = getattr(importlib.import_module(case["module"]), case["fn"])
        got = json.loads(json.dumps(norm(fn(case["payload"])), default=str))
        d = diff(case["expected"], got)
        rows.append([tool, "ran", round((time.time() - t0) * 1000), "identical" if not d else "differs at " + ", ".join(d[:4])])
    except Exception as e:
        rows.append([tool, "failed", 0, f"{type(e).__name__}: {str(e)[:160]}"])
json.dumps(rows)
`),
);

let failures = 0;
for (const [tool, status, ms, note] of rows) {
  if (status !== "ran") failures += 1;
  console.log(`${tool}\t${status}\t${ms} ms\t${note}`);
}
const identical = rows.filter((r) => r[3] === "identical").length;
console.log(`${rows.length} tools, ${rows.length - failures} ran, ${identical} identical to CPython, ${failures} failed`);
process.exit(failures ? 1 : 0);
