import type { Route } from "./router";

export type Skin = "brand" | "classic";

export const FROZEN_ROUTES: ReadonlySet<Route["name"]> = new Set();

export function skinFor(route: Route): Skin {
  return FROZEN_ROUTES.has(route.name) ? "classic" : "brand";
}

export function applySkin(root: HTMLElement, skin: Skin, dark: boolean): void {
  if (skin === "classic") {
    delete root.dataset.skin;
    delete root.dataset.scheme;
    return;
  }
  root.dataset.skin = "brand";
  root.dataset.scheme = dark ? "dark" : "light";
}
