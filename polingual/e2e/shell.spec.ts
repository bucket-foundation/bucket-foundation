import { expect, test } from "@playwright/test";
import { mockApi, signIn } from "./mock";

const SHOTS = process.env.PL_SHOTS_DIR;

for (const width of [1280, 390]) {
  test(`sign-in at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 500 ? 800 : 844 });
    const api = await mockApi(page);
    await page.goto("/app");
    await expect(page.getByTestId("sign-in")).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/sign-in-${width}.png` });
    await page.getByTestId("email").fill("learner@example.com");
    await page.getByRole("button", { name: "Email me a code" }).click();
    await page.getByTestId("code").fill("000000");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByTestId("sign-in-error")).toContainText("did not match");
    await page.getByTestId("code").fill("123456");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByTestId("sign-out")).toBeVisible();
    expect(api.sessions[0]).toEqual({ action: "otp", email: "learner@example.com", app: "polingual" });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(width);
  });
}

test("session survives reload and sign out returns to sign-in", async ({ page }) => {
  await mockApi(page);
  await signIn(page);
  await expect(page.getByTestId("sign-out")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("sign-out")).toBeVisible();
  await page.getByTestId("sign-out").click();
  await expect(page.getByTestId("sign-in")).toBeVisible();
});
