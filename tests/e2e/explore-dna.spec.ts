import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

async function ready(page: import("@playwright/test").Page, url: string) {
  await page.goto(url);
  await expect(page.getByTestId("space-view")).toHaveAttribute("data-ready", "true");
}

test("the sample genome renders on the helicoid with rungs and loci", async ({ page }) => {
  await ready(page, "/explore?data=dna-sample&space=helicoid");
  const view = page.getByTestId("helicoid-view");
  await expect(view).toBeVisible();
  await expect(view).toHaveAttribute("data-rungs", "96");
  expect(Number(await view.getAttribute("data-loci"))).toBeGreaterThan(3);
  await expect(page.getByTestId("data-switcher")).toHaveValue("dna-sample");
  await expect(page.getByTestId("basis-label")).toHaveText("own basis");
  await expect(page.getByTestId("space-current")).toContainText("chr1:");
  await expect(page.getByTestId("dna-status")).toContainText("never uploaded");
});

test("the scrubber steps along the sequence and the sweep bins are chromosomes", async ({ page }) => {
  await ready(page, "/explore?data=dna-sample&space=helicoid");
  await expect(page.getByTestId("helicoid-view")).toBeVisible();
  await page.getByRole("slider", { name: /observations/ }).focus();
  await page.keyboard.press("End");
  await expect(page.getByTestId("space-current")).toContainText("96 / 96");
  await page.keyboard.press("Home");
  await expect(page.getByTestId("space-current")).toContainText("1 / 96");
  await page.getByTestId("space-view").evaluate((el) => el.dispatchEvent(new WheelEvent("wheel", { deltaY: 40, bubbles: true, cancelable: true })));
  await expect(page.getByTestId("space-current")).toContainText("2 / 96");
  await page.getByRole("radio", { name: "slices", exact: true }).click();
  await expect(page.getByTestId("slice-stack")).toBeVisible();
  await expect(page.getByTestId("slice-current")).toContainText("chr");
});

test("windows with few variants carry the low coverage label", async ({ page }) => {
  await ready(page, "/explore?data=dna-sample&space=helicoid");
  await expect(page.getByTestId("helicoid-view")).toBeVisible();
  await page.getByRole("slider", { name: /observations/ }).focus();
  let seen = false;
  for (let i = 0; i < 40 && !seen; i++) {
    await page.keyboard.press("ArrowRight");
    seen = (await page.getByTestId("low-coverage").count()) > 0;
  }
  expect(seen).toBe(true);
  await expect(page.getByTestId("low-coverage")).toContainText("low coverage");
});

test("switching to DNA keeps the current view", async ({ page }) => {
  await ready(page, "/explore?space=helicoid");
  await expect(page.getByTestId("helicoid-view")).toHaveAttribute("data-rungs", /^\d+$/);
  const before = Number(await page.getByTestId("helicoid-view").getAttribute("data-rungs"));
  await page.getByTestId("data-switcher").selectOption("dna-sample");
  await expect(page.getByTestId("helicoid-view")).toHaveAttribute("data-rungs", "96");
  expect(before).not.toBe(96);
  await expect(page).toHaveURL(/data=dna-sample/);
});

const OWN = ["# rsid\tchromosome\tposition\tgenotype", "rs1801133\t1\t11856378\tCT", "rs4988235\t2\t136608646\tAG", "rs12345\t3\t5000000\tAA", "rs7\t3\t6000000\tCC", "rs8\t10\t9000000\tGT"].join("\n");

test("a user file is parsed in the browser and never sent anywhere", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") posts.push(r.url());
  });
  await ready(page, "/explore?space=helicoid");
  await page.getByTestId("dna-file").setInputFiles({ name: "mine.txt", mimeType: "text/plain", buffer: Buffer.from(OWN) });
  await expect(page.getByTestId("data-switcher")).toHaveValue("dna-upload");
  await expect(page.getByTestId("helicoid-view")).toHaveAttribute("data-rungs", "96");
  await expect(page.getByTestId("dna-status")).toContainText("your DNA");
  await expect(page.getByTestId("dna-status")).toContainText("Parsed in this browser and never uploaded");
  await expect(page.getByTestId("space-view").locator("..")).toBeVisible();
  expect(posts.filter((u) => !u.includes("_next") && !u.includes("/api/explore/space"))).toEqual([]);
});

test("a file that is not a genotype table reports why", async ({ page }) => {
  await ready(page, "/explore?space=helicoid");
  await page.getByTestId("dna-file").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello there\nnothing here\n") });
  await expect(page.getByTestId("dna-status")).toContainText("Could not read the file");
  await expect(page.getByTestId("data-switcher")).toHaveValue("canon");
});

test("the DNA data set shows in the full screen data widget", async ({ page }) => {
  await ready(page, "/explore?space=helicoid");
  await page.getByRole("button", { name: "expand to fullscreen" }).click();
  await page.locator('[data-widget="data"]').getByTestId("data-switcher").selectOption("dna-sample");
  await expect(page.getByTestId("helicoid-view")).toHaveAttribute("data-rungs", "96");
});
