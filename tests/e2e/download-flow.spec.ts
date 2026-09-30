import { expect, test } from "@playwright/test";

const LINUX_UA = "Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0";
const MAC_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15";
const LINUX_COMMAND = "curl -fsSL https://raw.githubusercontent.com/bucket-foundation/bucket-foundation/main/scripts/install.sh | sh";

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
    await expect(page.getByText(LINUX_COMMAND)).toHaveCount(0);
    await expect(page.locator("[data-download-missing]")).toContainText("email and name");

    await page.getByLabel("email address, required").fill("not-an-email");
    await page.getByLabel("name, required").fill("Ada Lovelace");
    await page.getByLabel(/Required: store my email/).check();
    await expect(button).toBeDisabled();

    await page.getByLabel("email address, required").fill("ada@example.org");
    await page.getByLabel(/Required: store my email/).uncheck();
    await expect(button).toBeDisabled();
    await expect(page.locator("[data-download-missing]")).toContainText("the data consent");

    await page.getByLabel(/Required: store my email/).check();
    await expect(button).toBeEnabled();
    await expect(page.locator("[data-download-missing]")).toHaveCount(0);
  });

  test("after submit the linux command is first and the signup is stored with its opt-ins", async ({ page }) => {
    const posts: Record<string, unknown>[] = [];
    await page.route("**/api/download", async (route) => {
      posts.push(route.request().postDataJSON());
      await route.fulfill({ json: { ok: true, email: "off" } });
    });
    await page.goto("/download");
    await page.getByLabel("email address, required").fill("ada@example.org");
    await page.getByLabel("name, required").fill("Ada Lovelace");
    await page.getByLabel("what you research or study, optional").fill("protein folding");
    await page.getByLabel(/Email me release notes/).check();
    await page.getByLabel(/Required: store my email/).check();
    await page.locator("[data-download-button]").click();

    const blocks = page.locator("[data-install-blocks] [data-os]");
    await expect(blocks.first()).toHaveAttribute("data-os", "linux");
    await expect(blocks.first()).toContainText(LINUX_COMMAND);

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
    await page.getByLabel("email address, required").fill("ada@example.org");
    await page.getByLabel("name, required").fill("Ada");
    await page.getByLabel(/Required: store my email/).check();
    await page.locator("[data-download-button]").click();
    const first = page.locator("[data-install-blocks] [data-os]").first();
    await expect(first).toHaveAttribute("data-os", "macos");
    await expect(first).toContainText(LINUX_COMMAND);
  });

  test("windows gets the PowerShell line when chosen", async ({ page }) => {
    await page.route("**/api/download", (route) => route.fulfill({ json: { ok: true, email: "off" } }));
    await page.goto("/download");
    await page.getByLabel("your computer, required").selectOption("windows-x64");
    await page.getByLabel("email address, required").fill("ada@example.org");
    await page.getByLabel("name, required").fill("Ada");
    await page.getByLabel(/Required: store my email/).check();
    await page.locator("[data-download-button]").click();
    const first = page.locator("[data-install-blocks] [data-os]").first();
    await expect(first).toHaveAttribute("data-os", "windows");
    await expect(first).toContainText("install.ps1 | iex");
  });
});
