import { describe, expect, test } from "bun:test";
import { applySkin, FROZEN_ROUTES, skinFor } from "./skin";
import type { Route } from "./router";

describe("skin", () => {
  test("study and placement screens under the polingual freeze keep the classic skin", () => {
    const frozen: Route[] = [{ name: "deck", deck: "03-chemistry" }, { name: "words", deck: "ar", lesson: 1 }, { name: "review" }, { name: "place", deck: "03-chemistry" }, { name: "assess", deck: "03-chemistry" }, { name: "langPlace", system: "romance" }, { name: "langStudy", system: "romance" }];
    for (const r of frozen) expect(skinFor(r)).toBe("classic");
    expect(FROZEN_ROUTES.size).toBe(frozen.length);
  });

  test("every other screen wears the brand skin", () => {
    for (const r of [{ name: "learn" }, { name: "progress" }, { name: "profile" }, { name: "settings" }, { name: "languages" }] as Route[]) expect(skinFor(r)).toBe("brand");
  });

  test("applySkin sets the scheme for brand and clears both attributes for classic", () => {
    const root = { dataset: {} as DOMStringMap } as HTMLElement;
    applySkin(root, "brand", true);
    expect(root.dataset.skin).toBe("brand");
    expect(root.dataset.scheme).toBe("dark");
    applySkin(root, "brand", false);
    expect(root.dataset.scheme).toBe("light");
    applySkin(root, "classic", true);
    expect(root.dataset.skin).toBeUndefined();
    expect(root.dataset.scheme).toBeUndefined();
  });
});
