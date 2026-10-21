import { describe, expect, test } from "bun:test";
import { applySkin, FROZEN_ROUTES, skinFor } from "./skin";
import type { Route } from "./router";

describe("skin", () => {
  test("every screen, study and placement included, wears the brand skin", () => {
    for (const r of [{ name: "learn" }, { name: "progress" }, { name: "profile" }, { name: "settings" }, { name: "languages" }, { name: "deck", deck: "03-chemistry" }, { name: "words", deck: "ar", lesson: 1 }, { name: "review" }, { name: "place", deck: "03-chemistry" }, { name: "langStudy", system: "romance" }] as Route[]) expect(skinFor(r)).toBe("brand");
  });

  test("no route is held on the classic skin", () => expect(FROZEN_ROUTES.size).toBe(0));

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

