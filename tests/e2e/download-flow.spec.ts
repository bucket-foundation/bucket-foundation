import { expect, test } from "@playwright/test";
import { INSTALL_COMMAND } from "../../src/lib/download/install";

const LINUX_UA = "Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0";
const MAC_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15";

test.describe("download flow on linux", () => {
  test.use({ userAgent: LINUX_UA });

  test("the installer stays locked until every required field and consent is complete", async ({ page }) => {
    const posts: Record<string, unknown>[] = [];
    await page.route("**/api/download", async (route) => {
      posts.push(route.request().postDataJSON());
      await route.fulfill({ json: { ok: true, email: "off" } });
    });
    await page.goto("/download");

    const button = page.locator("[data-download-button]");
    await expect(button).toBeDisabled();
    await expect(page.locator("[data-install-blocks]")).toHaveCount(0);
    await expect(page.getByText(INSTALL_COMMAND.linux)).toHaveCount(0);

    await page.getByLabel("Email", { exact: true }).fill("not-an-email");
    await page.getByLabel("Name", { exact: true }).fill("Ada Lovelace");
    await page.getByLabel("Agree to the privacy terms").check();
    await expect(button).toBeDisabled();

    await page.getByLabel("Email", { exact: true }).fill("ada@example.org");
    await page.getByLabel("Agree to the privacy terms").uncheck();
    await expect(button).toBeDisabled();

    await page.getByLabel("Agree to the privacy terms").check();
    await expect(button).toBeEnabled();
  });

  test("the demo keeps one signup form and one privacy link", async ({ page }) => {
    await page.goto("/download");
    await expect(page.locator("[data-download-form]")).toHaveCount(1);
    await expect(page.locator("[data-product-demo]")).toHaveCount(1);
    await expect(page.locator('main a[href="/privacy"]')).toHaveCount(1);
  });

  test("after submit the linux command is first and the signup is stored with its opt-ins", async ({ page }) => {
    const posts: Record<string, unknown>[] = [];
    await page.route("**/api/download", async (route) => {
      posts.push(route.request().postDataJSON());
      await route.fulfill({ json: { ok: true, email: "off" } });
    });
    await page.goto("/download");
    await page.getByLabel("Email", { exact: true }).fill("ada@example.org");
    await page.getByLabel("Name", { exact: true }).fill("Ada Lovelace");
    await page.getByText("Research interests and email updates", { exact: true }).click();
    await page.getByLabel("What do you research?").fill("protein folding");
    await page.getByLabel("Release notes").check();
    await page.getByLabel("Agree to the privacy terms").check();
    await page.locator("[data-download-button]").click();

    const blocks = page.locator("[data-install-blocks] [data-os]");
    await expect(blocks.first()).toHaveAttribute("data-os", "linux");
    await expect(blocks.first()).toContainText("install.sh");
    await expect(blocks.first().getByRole("note")).toHaveText("Open it from a terminal, never with Disks.");
    await expect(page.locator("[data-other-platforms]")).not.toHaveAttribute("open", "");

    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      email: "ada@example.org",
      name: "Ada Lovelace",
      platform: "linux-x64",
      research: "protein folding",
      consent: true,
      release_notes: true,
      whats_new_daily: false,
    });
  });
});

test.describe("download flow on macos", () => {
  test.use({ userAgent: MAC_UA });

  test("the macos command comes first", async ({ page }) => {
    await page.route("**/api/download", (route) => route.fulfill({ json: { ok: true, email: "off" } }));
    await page.goto("/download");
    await page.getByLabel("Email", { exact: true }).fill("ada@example.org");
    await page.getByLabel("Name", { exact: true }).fill("Ada");
    await page.getByLabel("Agree to the privacy terms").check();
    await page.locator("[data-download-button]").click();
    const first = page.locator("[data-install-blocks] [data-os]").first();
    await expect(first).toHaveAttribute("data-os", "macos");
    await expect(first).toContainText(INSTALL_COMMAND.macos);
  });

  test("windows gets the PowerShell line when chosen", async ({ page }) => {
    await page.route("**/api/download", (route) => route.fulfill({ json: { ok: true, email: "off" } }));
    await page.goto("/download");
    await page.getByLabel("Computer").selectOption("windows-x64");
    await page.getByLabel("Email", { exact: true }).fill("ada@example.org");
    await page.getByLabel("Name", { exact: true }).fill("Ada");
    await page.getByLabel("Agree to the privacy terms").check();
    await page.locator("[data-download-button]").click();
    const first = page.locator("[data-install-blocks] [data-os]").first();
    await expect(first).toHaveAttribute("data-os", "windows");
    await expect(first).toContainText("install.ps1 | iex");
  });
});
