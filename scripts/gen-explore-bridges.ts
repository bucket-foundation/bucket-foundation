import { writeFileSync } from "fs";
import path from "path";
import { getAllBridges } from "../src/lib/canon-bridges";
import { getAllDetectedBridges } from "../src/lib/canon-detected-bridges";

const bare = (b: string) => b.replace(/^\d+-/, "");

const curated = getAllBridges()
  .filter((b) => b.branches.length > 0).map((b) => ({
  id: `bridge:${b.slug}`,
  title: b.title,
  tier: b.tier,
  mass: b.mass,
  branches: b.branches.map((x) => bare(x.branch)),
}));

const detected = getAllDetectedBridges()
  .filter((b) => b.branches.length > 0).map((b) => ({
  id: `bridge:detected-${b.slug}`,
  title: b.name,
  tier: "detected",
  mass: b.size,
  branches: b.branches.map(bare),
  members: b.memberClaims.map((m) => ({ branch: bare(m.branch), concept: m.concept })),
}));

const out = path.join(process.cwd(), "src/lib/explore/fixtures/bridges.json");
writeFileSync(out, JSON.stringify({ curated, detected }));
console.log(`bridges: ${curated.length} curated, ${detected.length} detected`);
