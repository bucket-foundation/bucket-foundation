import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const table = require("periodic-table-data-complete/pTable.json");

const rows = table.filter((e) => e.atomic_number <= 118).map((e) => ({
  z: e.atomic_number,
  symbol: e.symbol,
  name: e.name,
  mass: e.atomic_mass,
  shells: e.electrons_per_shell,
  config: e.electron_configuration_semantic,
  color: `#${e.cpk_hex || "cccccc"}`,
  group: e.group ?? null,
  period: e.period ?? null,
}));

writeFileSync(new URL("../src/lib/explore/fixtures/elements.json", import.meta.url), JSON.stringify(rows));
console.log(`elements: ${rows.length}`);
