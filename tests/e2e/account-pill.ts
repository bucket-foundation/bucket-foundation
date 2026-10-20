import { expect, type Locator } from "@playwright/test";

export async function expectSignedOutPill(header: Locator) {
  const pill = header.getByRole("button", { name: "Account menu", exact: true });
  await expect(pill).toBeVisible();
  await expect(pill).toHaveAttribute("aria-haspopup", "menu");
  await pill.click();
  const menu = header.getByRole("menu", { name: "Account" });
  await expect(menu.getByRole("menuitem")).toHaveText(["Sign in"]);
  await menu.getByRole("menuitem", { name: "Sign in" }).press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(pill).toBeFocused();
}
