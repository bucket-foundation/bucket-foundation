import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Avatar, DEFAULT_LOOK, LAYERS, LAYER_ORDER, frameForTier, isValidLook, lookFromSeed, normalizeLook, type Look } from "../ui/avatar";

test("lookFromSeed is deterministic and valid", () => {
  for (const name of ["gio.polly", "Brave Otter", "kenji", "", "Ana Sol", "ñandú", "李"]) {
    const a = lookFromSeed(name);
    assert.deepEqual(a, lookFromSeed(name));
    assert.deepEqual(a, lookFromSeed(`  ${name.toUpperCase()} `.toLowerCase()));
    assert.ok(isValidLook(a), name);
    assert.notEqual(a.color, a.plinth);
  }
});

test("seeds spread across looks", () => {
  const seen = new Set(Array.from({ length: 60 }, (_, i) => JSON.stringify(lookFromSeed(`player-${i}`))));
  assert.ok(seen.size > 50);
  const colors = new Set(Array.from({ length: 60 }, (_, i) => lookFromSeed(`p${i}`).color));
  assert.ok(colors.size >= 4);
});

test("default and normalized looks are valid", () => {
  assert.ok(isValidLook(DEFAULT_LOOK));
  assert.equal(isValidLook({ ...DEFAULT_LOOK, hat: "tophat" }), false);
  const n = normalizeLook({ hat: "tophat", color: "#26428B", face: "wow", plinth: 4 });
  assert.equal(n.hat, DEFAULT_LOOK.hat);
  assert.equal(n.color, "lapis");
  assert.equal(n.face, "wow");
  assert.equal(n.plinth, DEFAULT_LOOK.plinth);
  for (let t = 0; t <= 9; t++) assert.ok((LAYERS.frame as readonly string[]).includes(frameForTier(t)));
});

test("every layer option renders in fixed z-order", () => {
  for (const layer of LAYER_ORDER) {
    for (const v of LAYERS[layer]) {
      const look = { ...DEFAULT_LOOK, backdrop: "maya", outfit: "scarf", hat: "beret", accessory: "glasses", frame: "ring", [layer]: v } as Look;
      for (const variant of ["full", "head"] as const) {
        const html = renderToStaticMarkup(<Avatar look={look} size={64} variant={variant} />);
        assert.match(html, /^<svg/);
        const order = [...html.matchAll(/data-layer="([a-z-]+)"/g)].map((m) => m[1]);
        const rank = variant === "full" ? ["backdrop", "plinth", "outfit-back", "shape", "skin", "outfit", "head", "face", "hat", "accessory", "frame"] : ["backdrop", "outfit-back", "shape", "skin", "outfit", "head", "face", "accessory", "frame", "hat"];
        const idx = order.map((o) => rank.indexOf(o));
        assert.ok(idx.every((x) => x >= 0), order.join(","));
        assert.deepEqual(idx, [...idx].sort((a, b) => a - b), `${layer}=${v} ${variant}: ${order.join(",")}`);
        assert.equal(order.includes("plinth"), variant === "full");
      }
    }
  }
});

test("sizes clamp and head variant is square", () => {
  assert.match(renderToStaticMarkup(<Avatar seed="x" size="chip" variant="head" />), /width="24" height="24"/);
  assert.match(renderToStaticMarkup(<Avatar seed="x" size="hero" />), /width="220" height="257"/);
});
