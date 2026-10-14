import { test, expect } from "@playwright/test";

const APP_SHOTS = ["access", "awareness", "understanding", "internalization", "production"];

test("the hero holds one button over a blurred panel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/research-os");
  const hero = page.locator("section.ros-hero");
  await expect(hero.getByRole("heading", { level: 1 })).toContainText("Research OS for");
  await expect(hero.locator("a.ros-btn, button")).toHaveCount(1);
  await expect(hero.getByRole("link", { name: /Open Research OS/ })).toHaveAttribute("href", "/research-os/home");
  const blur = await hero.locator(".ros-panel").evaluate((el) => {
    const s = getComputedStyle(el, "::before");
    return s.backdropFilter || s.getPropertyValue("-webkit-backdrop-filter");
  });
  expect(blur).toMatch(/blur\(/);
});

test("the five states show the desktop app screenshots", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/research-os");
  const images = page.locator("#states .ros-image img");
  await expect(images).toHaveCount(APP_SHOTS.length);
  for (let i = 0; i < APP_SHOTS.length; i += 1) {
    const name = APP_SHOTS[i];
    const src = (await images.nth(i).getAttribute("src")) ?? "";
    expect(decodeURIComponent(src)).toContain(`/research-os/app-${name}.png`);
    const res = await request.get(`/research-os/app-${name}.png`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  }
});

test("at 390 wide the header keeps Download, GitHub, the account link and a menu button", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/research-os");
  const header = page.locator("header").first();
  await expect(header.getByRole("link", { name: "Download", exact: true })).toBeVisible();
  await expect(header.getByRole("link", { name: /Bucket Foundation on GitHub/ })).toBeVisible();
  await expect(header.getByRole("link", { name: /Sign in|Notify me/ })).toBeVisible();
  await expect(header.locator("nav")).toBeHidden();
  const menu = header.getByRole("button", { name: "Open menu" });
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.locator("#mobile-drawer").getByRole("link", { name: /Research OS/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the home variants route is gone", async ({ request }) => {
  for (const path of ["/research-os/home-variants", "/research-os/home-variants/v01"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).not.toBe(200);
  }
});
