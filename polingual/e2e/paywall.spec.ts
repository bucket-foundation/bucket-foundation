import { expect, test } from "@playwright/test";
import { mockApi, seeded, signIn } from "./mock";

const SHOTS = process.env.PL_SHOTS_DIR;

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

for (const width of [1280, 390]) {
  test(`paywall without an App Store subscription at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 500 ? 800 : 844 });
    await mockApi(page, { entitled: false });
    await signIn(page);
    await expect(page.getByTestId("paywall")).toBeVisible();
    await expect(page.getByTestId("plan")).toHaveCount(1);
    await expect(page.getByTestId("per-week")).toHaveText("$1.15 a week");
    await expect(page.getByTestId("no-payment")).toHaveText("No payment now");
    await expect(page.getByTestId("trial-timeline")).toContainText("Day 5");
    await page.getByTestId("see-all-plans").click();
    await expect(page.getByTestId("plan")).toHaveCount(5);
    for (const price of ["$9.99", "$59.99", "$89.99", "$149.99", "$29.99"]) await expect(page.getByTestId("paywall")).toContainText(price);
    await expect(page.getByTestId("coming-soon")).toHaveCount(3);
    await expect(page.locator("[data-testid=plan][data-available=no]")).toContainText(["Family", "Lifetime", "Student"]);
    await expect(page.locator("[data-testid=plan] a, [data-testid=plan] button")).toHaveCount(2);
    await expect(page.getByTestId("checkout-monthly")).toBeVisible();
    await expect(page.getByTestId("checkout-yearly")).toBeVisible();
    await expect(page.getByTestId("app-store-link")).toHaveCount(0);
    await expect(page.getByTestId("new-system")).toHaveCount(0);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/paywall-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });

  test(`streak card reads Day N of 100 at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 500 ? 800 : 844 });
    const branches = { ...seeded(), "lang-sys-en-es-fr": { updated_at: new Date().toISOString(), data: { cards: {}, stats: { xp: 40, streak: 7, lastStudyDay: today(), history: {} } } } };
    await mockApi(page, { branches });
    await signIn(page);
    await expect(page.getByTestId("streak-day")).toHaveText("Day 7 of 100");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-streak-${width}.png` });
  });
}

test("web checkout sends the plan and goes to Stripe", async ({ page }) => {
  await mockApi(page, { entitled: false });
  let sent: unknown = null;
  await page.route("**/api/polingual/checkout", (route) => {
    sent = route.request().postDataJSON();
    return route.fulfill({ json: { url: "https://checkout.stripe.com/c/test" } });
  });
  await page.route("https://checkout.stripe.com/**", (route) => route.fulfill({ body: "stripe" }));
  await signIn(page);
  await page.getByTestId("checkout-yearly").click();
  await page.waitForURL("https://checkout.stripe.com/c/test");
  expect(sent).toEqual({ plan: "yearly", return_to: "app" });
});

test("closed web checkout shows the reason", async ({ page }) => {
  await mockApi(page, { entitled: false });
  await page.route("**/api/polingual/checkout", (route) => route.fulfill({ status: 503, json: { error: "checkout_unavailable" } }));
  await signIn(page);
  await page.getByTestId("see-all-plans").click();
  await page.getByTestId("checkout-monthly").click();
  await expect(page.getByTestId("checkout-error")).toContainText("not open yet");
});

test("an unreachable entitlement check shows the paywall with a retry", async ({ page }) => {
  await mockApi(page);
  await page.route("**/api/academy/entitlement", (route) => route.fulfill({ status: 503, json: { error: "unavailable" } }));
  await signIn(page);
  await expect(page.getByTestId("access-unknown")).toBeVisible();
  await page.unroute("**/api/academy/entitlement");
  await page.route("**/api/academy/entitlement", (route) => route.fulfill({ json: { active: true, productId: "com.polingual.monthly", expiresAt: null, trial: false } }));
  await page.getByTestId("recheck").click();
  await expect(page.getByTestId("new-system")).toBeVisible();
});
