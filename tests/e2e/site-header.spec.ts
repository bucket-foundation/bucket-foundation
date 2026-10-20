import { test, expect } from "@playwright/test";
import { expectSignedOutPill } from "./account-pill";

for (const width of [1280, 390]) {
  test(`at ${width} wide the header holds only the logo and the account pill`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/download");
    const header = page.locator("header").first();
    await expect(header.getByRole("link")).toHaveCount(1);
    await expect(header.getByRole("link", { name: "bucket.foundation" })).toHaveAttribute("href", "/");
    await expectSignedOutPill(header);
    for (const gone of ["Research OS", "Canon", "About"]) {
      await expect(header.getByRole("link", { name: gone, exact: true })).toHaveCount(0);
    }
    await expect(header.getByRole("link", { name: /GitHub/ })).toHaveCount(0);
  });
}

test("the full footer keeps the links the header dropped", async ({ page }) => {
  await page.goto("/canon");
  const footer = page.locator("footer");
  for (const [name, href] of <[string | RegExp, string][]>[["Research OS", "/research-os"], ["Canon", "/canon"], [/^What.s new$/, "/whats-new"], ["About", "/about"]]) {
    await expect(footer.getByRole("link", { name, exact: typeof name === "string" })).toHaveAttribute("href", href);
  }
  await expect(footer.getByRole("link", { name: "GitHub", exact: true })).toHaveAttribute("href", "https://github.com/bucket-foundation");
});
