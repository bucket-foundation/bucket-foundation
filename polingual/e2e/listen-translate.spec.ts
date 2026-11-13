import { expect, test, type Page } from "@playwright/test";
import { mockCorpus } from "./daily-mock";
import { mockApi, seeded, signIn } from "./mock";

const STATIONS = [
  { stationuuid: "s1", name: "Radio Uno", url_resolved: "https://stream.test/uno", country: "Spain", countrycode: "ES", tags: "news,talk", favicon: "", votes: 120 },
  { stationuuid: "s2", name: "Onda Dos", url_resolved: "https://stream.test/dos", country: "Mexico", countrycode: "MX", tags: "music", favicon: "", votes: 80 },
];

async function mockRadio(page: Page) {
  await page.route("https://all.api.radio-browser.info/**", (r) => r.fulfill({ json: [{ name: "de1.api.radio-browser.info" }] }));
  await page.route("https://*.api.radio-browser.info/json/stations/search**", (r) => r.fulfill({ json: STATIONS }));
  await page.route("https://stream.test/**", (r) => r.fulfill({ status: 200, contentType: "audio/mpeg", body: "" }));
}

for (const width of [390, 1440]) {
  test.describe(`at ${width}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: width > 500 ? 900 : 844 });
      await mockCorpus(page);
      await mockRadio(page);
      await page.addInitScript(() => {
        addEventListener("DOMContentLoaded", () => {
          const st = document.createElement("style");
          st.textContent = "nextjs-portal{display:none!important}";
          document.head.appendChild(st);
        });
      });
    });

    test("translate finds a word in my languages, swaps and links to its page", async ({ page }) => {
      await page.goto("/app/translate");
      await expect(page.getByTestId("translate")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("app-nav")).toBeVisible();
      await expect(page.getByTestId("nav-translate")).toHaveAttribute("aria-current", "page");
      await page.getByTestId("translate-input").fill("hundred");
      await expect(page.getByTestId("translate-go")).toBeEnabled({ timeout: 60_000 });
      await page.getByTestId("translate-go").click();
      await expect(page.getByTestId("translate-results")).toContainText("cien");
      await expect(page.getByTestId("translate-word-link").first()).toHaveAttribute("href", "/word/hundred");
      await page.getByTestId("swap").click();
      await expect(page.getByTestId("pick-source")).toHaveText("Spanish");
      await page.getByTestId("translate-input").fill("cien");
      await page.getByTestId("translate-go").click();
      await expect(page.getByTestId("translate-results")).toContainText("hundred");
      await page.getByTestId("pick-target").click();
      await page.getByTestId("pick-target-search").fill("germ");
      await page.getByTestId("pick-target-de").click();
      await expect(page.getByTestId("pick-target")).toHaveText("German");
      await page.getByTestId("translate-go").click();
      await expect(page.getByTestId("translate-results")).toContainText("hundert");
      await page.getByTestId("translate-input").fill("zzzz");
      await page.getByTestId("translate-go").click();
      await expect(page.getByTestId("translate-none")).toBeVisible();
    });

    test("listen plays a station and the ticket follows across the app", async ({ page }) => {
      await mockApi(page, { branches: seeded() });
      await signIn(page);
      await page.getByTestId("nav-listen").click();
      await expect(page.getByTestId("listen")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("radio-lang-es")).toHaveAttribute("aria-selected", "true");
      await page.getByTestId("station").first().click();
      await expect(page.getByTestId("now-playing")).toContainText("Radio Uno");
      await expect(page.getByTestId("now-word")).toContainText("oír");
      await page.getByTestId("nav-translate").click();
      await expect(page.getByTestId("translate")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("mini-player")).toContainText("Radio Uno");
      await page.getByTestId("nav-home").click();
      await expect(page.getByTestId("mini-player")).toBeVisible();
    });
  });
}
