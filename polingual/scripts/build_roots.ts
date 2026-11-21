import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildLearnIndex } from "../src/lib/lobby/learn-index";
import { WORDS } from "../src/lib/words";

const ROOTS_FILE = join(__dirname, "../public/play/roots.json");

mkdirSync(dirname(ROOTS_FILE), { recursive: true });
writeFileSync(ROOTS_FILE, JSON.stringify(buildLearnIndex(WORDS)));
console.log(`wrote ${ROOTS_FILE}`);
