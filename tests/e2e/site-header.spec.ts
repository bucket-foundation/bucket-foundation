import { test, expect } from "@playwright/test";

for (const width of [1280, 390]) {
  test(`at ${width} wide the header holds only the logo, the account link and Download`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/download");
    const header = page.locator("header").first();
    const links = header.getByRole("link");
    await expect(links).toHaveCount(3);
    await expect(header.getByRole("link", { name: "bucket.foundation" })).toHaveAttribute("href", "/");
    await expect(header.getByRole("link", { name: /Sign in|Notify me/ })).toBeVisible();
    await expect(header.getByRole("link", { name: "Download", exact: true })).toHaveAttribute("href", "/download");
    for (const gone of ["Research OS", "Canon", "About"]) {
      await expect(header.getByRole("link", { name: gone, exact: true })).toHaveCount(0);
    }
    await expect(header.getByRole("link", { name: /GitHub/ })).toHaveCount(0);
  });
}

test("the footer keeps the links the header dropped", async ({ page }) => {
  await page.goto("/download");
  const footer = page.locator("footer");
  for (const [name, href] of <[string | RegExp, string][]>[["Research OS", "/research-os"], ["Canon", "/canon"], [/^What.s new$/, "/whats-new"], ["About", "/about"]]) {
    await expect(footer.getByRole("link", { name, exact: typeof name === "string" })).toHaveAttribute("href", href);
  }
  await expect(footer.getByRole("link", { name: "GitHub", exact: true })).toHaveAttribute("href", "https://github.com/bucket-foundation");
});

test("the download page shows the web and desktop comparison under the download form", async ({ page }) => {
  await page.goto("/download");
  const table = page.locator("#web-and-desktop");
  await expect(table.getByRole("heading", { name: "Web and desktop" })).toBeVisible();
  for (const row of ["Offline", "Sync", "Deck library", "Updates"]) {
    await expect(table.getByRole("rowheader", { name: row, exact: true })).toBeVisible();
  }
  const card = await page.locator("[data-download-pane]").boundingBox();
  const box = await table.boundingBox();
  expect(box!.y).toBeGreaterThan(card!.y);
});
