import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const EXCLUDED = {
  "scripts/test-permanence.ts": "dry run against Base Sepolia and Irys devnet",
  "scripts/test-research-os-evidence-worker-live.ts": "needs the live evidence worker, run by test:evidence-live",
  "scripts/test-research-route.ts": "excluded from tsconfig and from every suite",
};

const SUITES = {
  unit: {
    files: [
      "scripts/test-kruse-token.ts",
      "scripts/test-auth-paths.ts",
      "scripts/test-waitlist.ts",
      "scripts/test-academy-{engine,diagnostic,assess,mastery}.ts",
      "scripts/test-canon-allbranch-index.ts",
      "scripts/test-tutor-provider.ts",
      "scripts/test-llm-contract.ts",
      "scripts/test-mcp-route.ts",
      "scripts/test-research-os-{dedup,merge-actions}.ts",
      "scripts/test-beads-dispatch.ts",
    ],
  },
  db: {
    files: ["scripts/test-research-os-{evidence-append,evidence-admissions-db,connections-paging,access-paging,quote-receipts-db,read-access-routes,import-files-db,evidence-route-access}.ts"],
  },
  "research-os": {
    files: [
      "scripts/test-research-os-*.ts",
      "scripts/research-os/ingest/test-*.ts",
      "scripts/test-canon-*signoff.ts",
      "scripts/test-code-citations.mjs",
      "scripts/test-site-reveal-fallback.ts",
      "scripts/test-migration-versions.ts",
      "scripts/test-research-tools-routes.ts",
    ],
    exclude: [
      "scripts/test-research-os-{dedup,merge-actions}.ts",
      "scripts/test-research-os-{evidence-append,evidence-admissions-db,connections-paging,access-paging,quote-receipts-db,read-access-routes,import-files-db,evidence-route-access}.ts",
    ],
    commands: [
      ["node", "scripts/check-code-citations.mjs"],
      ["npm", "run", "test:polingual-roots"],
      ["npm", "run", "test:nsm-exponents"],
    ],
  },
};

const TEST_FILE = /(^|\/)test-[^/]*\.(ts|mjs)$/;

function walk(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return e.name === "node_modules" || rel === "scripts/lib" ? [] : walk(rel);
    return [rel];
  });
}

function expandBraces(pattern) {
  const m = /\{([^}]*)\}/.exec(pattern);
  if (!m) return [pattern];
  return m[1].split(",").flatMap((alt) => expandBraces(pattern.slice(0, m.index) + alt + pattern.slice(m.index + m[0].length)));
}

function toRegex(pattern) {
  const body = pattern
    .split("**/")
    .map((part) => part.replace(/[.+^$()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]"))
    .join("(?:[^/]+/)*");
  return new RegExp(`^${body}$`);
}

function match(patterns, files) {
  const res = patterns.flatMap(expandBraces).map(toRegex);
  return files.filter((f) => res.some((r) => r.test(f)));
}

function resolveSuites(allFiles) {
  const tests = allFiles.filter((f) => TEST_FILE.test(f));
  const out = {};
  for (const [name, suite] of Object.entries(SUITES)) {
    const excluded = new Set(match(suite.exclude ?? [], tests));
    const files = match(suite.files, tests).filter((f) => !excluded.has(f) && !EXCLUDED[f]).sort();
    for (const pattern of suite.files.flatMap(expandBraces)) {
      if (match([pattern], tests).length === 0) throw new Error(`suite ${name}: ${pattern} matches no test file`);
    }
    out[name] = { files, commands: suite.commands ?? [] };
  }
  return { tests, suites: out };
}

function orphanCheck(tests, suites) {
  const owner = new Map();
  const problems = [];
  for (const [name, suite] of Object.entries(suites)) {
    for (const f of suite.files) {
      if (owner.has(f)) problems.push(`${f} is in both ${owner.get(f)} and ${name}`);
      owner.set(f, name);
    }
  }
  for (const f of Object.keys(EXCLUDED)) {
    if (!tests.includes(f)) problems.push(`excluded file ${f} does not exist`);
  }
  for (const f of tests) {
    if (!owner.has(f) && !EXCLUDED[f]) problems.push(`${f} is in no suite and not excluded`);
  }
  return problems;
}

function stepFor(file) {
  if (file.endsWith(".mjs")) return { argv: [process.execPath, "--test", file], env: {} };
  return {
    argv: [
      process.execPath,
      path.join(ROOT, "node_modules/ts-node/dist/bin.js"),
      "-r",
      "tsconfig-paths/register",
      "--compiler-options",
      JSON.stringify({ module: "commonjs", baseUrl: "." }),
      file,
    ],
    env: { TS_NODE_BASEURL: "./" },
  };
}

function runStep(label, argv, env) {
  process.stdout.write(`\n>>> ${label}\n`);
  const r = spawnSync(argv[0], argv.slice(1), { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...env } });
  return r.status === 0 && r.signal === null;
}

function parseArgs(argv) {
  const suites = [];
  let list = false;
  let check = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--suite") suites.push(argv[++i]);
    else if (argv[i] === "--list") list = true;
    else if (argv[i] === "--check") check = true;
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  return { suites, list, check };
}

function main() {
  const { suites: wanted, list, check } = parseArgs(process.argv.slice(2));
  const { tests, suites } = resolveSuites(walk("scripts"));
  const problems = orphanCheck(tests, suites);
  if (problems.length > 0) {
    for (const p of problems) process.stderr.write(`run-tests: ${p}\n`);
    process.exit(1);
  }
  if (check) {
    process.stdout.write(`run-tests: ${tests.length} test files, every one in a suite or excluded\n`);
    return;
  }
  for (const name of wanted) {
    if (!suites[name]) throw new Error(`unknown suite ${name}; known: ${Object.keys(suites).join(", ")}`);
  }
  if (wanted.length === 0) throw new Error("pass --suite <name>, --list or --check");
  if (list) {
    for (const name of wanted) {
      for (const f of suites[name].files) process.stdout.write(`${name}\t${f}\n`);
      for (const c of suites[name].commands) process.stdout.write(`${name}\t${c.join(" ")}\n`);
    }
    return;
  }
  for (const name of wanted) {
    const { files, commands } = suites[name];
    for (const f of files) {
      const { argv, env } = stepFor(f);
      if (!runStep(f, argv, env)) {
        process.stderr.write(`\nrun-tests: ${name} failed at ${f}\n`);
        process.exit(1);
      }
    }
    for (const c of commands) {
      if (!runStep(c.join(" "), c, {})) {
        process.stderr.write(`\nrun-tests: ${name} failed at ${c.join(" ")}\n`);
        process.exit(1);
      }
    }
    process.stdout.write(`\nrun-tests: ${name} passed, ${files.length} files and ${commands.length} commands\n`);
  }
}

try {
  main();
} catch (e) {
  process.stderr.write(`run-tests: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
}
