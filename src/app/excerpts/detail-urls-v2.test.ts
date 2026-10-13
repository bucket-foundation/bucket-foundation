import assert from "node:assert/strict";
import { canonIndex } from "@/lib/canon-search";
import { detailStaticParams, resolveDetail } from "./detail-params-v2";

const indexed = canonIndex();
assert.ok(indexed.length > 0, "canon search index is empty");

const routed = new Set(detailStaticParams().map((p) => `${p.concept}/${p.slug}`));
const missing: string[] = [];
const unresolved: string[] = [];
for (const e of indexed) {
  const key = `${e.concept}/${e.slug}`;
  if (!routed.has(key)) missing.push(key);
  if (!resolveDetail(e.concept, e.slug)) unresolved.push(key);
}
assert.deepEqual(missing.slice(0, 5), [], `${missing.length} canon search URLs lack a static detail route`);
assert.deepEqual(unresolved.slice(0, 5), [], `${unresolved.length} canon search URLs resolve to no excerpt`);
console.log(`detail urls ok: ${indexed.length} indexed, ${routed.size} routed`);
