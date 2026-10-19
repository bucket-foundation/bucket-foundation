import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("desktop video loads captions, plays and seeks", async ({ page, request }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Watch the desktop" }).click();
  const video = page.locator("video");
  await video.evaluate(async (element: HTMLVideoElement) => { element.muted = true; await element.play(); });
  await page.waitForFunction(() => document.querySelector("video")!.currentTime > .2);
  const duration = await video.evaluate((element: HTMLVideoElement) => { element.pause(); element.currentTime = element.duration / 2; return element.duration; });
  expect(duration).toBeGreaterThan(40);
  await page.waitForFunction(() => !document.querySelector("video")!.seeking);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.textTracks[0]?.cues?.length ?? 0)).toBeGreaterThan(5);
  const provenance = await request.get("/media/bucket-demo-v0.5/provenance.json");
  const metadata = await provenance.json();
  expect(metadata.desktop_version).toBe("0.5.0");
  expect(metadata.binary_sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(metadata)).not.toMatch(/\/home\/|\/tmp\//);
  await expect(page.getByRole("link", { name: "Read the transcript" })).toHaveAttribute("href", "/media/bucket-demo-v0.5/transcript.txt");
});

test("sample actions preserve signup and never post notes or data", async ({ page }) => {
  const writes: string[] = [];
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url() + " " + (request.postData() ?? "")));
  page.on("request", (request) => { if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) writes.push(request.url()); });
  await page.goto("/demo");
  await page.getByLabel("Email", { exact: true }).fill("ada@example.org");
  await page.getByLabel("Name", { exact: true }).fill("Ada");
  const nav = page.getByRole("navigation", { name: "Demo tools" });
  for (const button of await nav.getByRole("button").all()) await button.click();
  await nav.getByRole("button", { name: "Explore", exact: true }).click();
  await page.getByLabel("Search sample sources").fill("Shannon");
  await page.getByRole("button", { name: "Save to Notes +", exact: true }).click();
  await nav.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(page.getByLabel("Your sample note")).toHaveValue(/Shannon/);
  await page.getByLabel("Your sample note").fill("Private sample marker");
  const noteDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export note" }).click();
  expect(await readFile(await (await noteDownload).path() as string, "utf8")).toBe("Private sample marker");
  await page.getByRole("button", { name: "Watch the desktop" }).click();
  await expect(page.locator("video")).toHaveAttribute("preload", "none");
  await page.getByRole("button", { name: "Try it" }).click();
  await expect(page.getByLabel("Your sample note")).toHaveValue("Private sample marker");
  await nav.getByRole("button", { name: "Add your own", exact: true }).click();
  await page.getByLabel("Probabilities, one per row").fill("0\n.5\n1");
  await page.getByRole("button", { name: "Analyze these values" }).click();
  await expect(page.locator("[data-demo-pane]").getByRole("table")).toContainText("1.0000");
  await nav.getByRole("button", { name: "Add your own", exact: true }).click();
  await page.getByLabel("Probabilities, one per row").fill("5");
  await page.getByRole("button", { name: "Analyze these values" }).click();
  await expect(page.locator("[data-product-demo]").getByRole("alert")).toContainText("zero and one");
  await page.getByLabel("Or choose a numeric CSV").setInputFiles({ name: "private-probabilities.csv", mimeType: "text/csv", buffer: Buffer.from("probability\n0.123456789\n0.5\n") });
  await expect(page.locator("[data-demo-pane]").getByRole("table")).toContainText("0.123456789");
  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download sample CSV" }).click();
  expect(await readFile(await (await csvDownload).path() as string, "utf8")).toContain("0.123456789");
  expect(requests.some((request) => /Private(?:%20| )sample(?:%20| )marker|0\.123456789|private-probabilities/.test(request))).toBe(false);
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.locator("[data-entropy-output]")).toHaveText("1.00 bits");
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("ada@example.org");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Ada");
  await expect(page.locator("[data-download-form]")).toHaveCount(1);
  expect(writes.filter((url) => !url.includes("/__nextjs"))).toEqual([]);
  await page.reload();
  await nav.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(page.getByLabel("Your sample note")).not.toHaveValue(/Private sample marker/);
});

test.describe("on an Android phone", () => {
  test.use({ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36" });
  test("the download card leads with Android and lists the other devices", async ({ page }) => {
    await page.goto("/download");
    await expect(page.locator("[data-device-picker]")).toHaveAttribute("data-detected", "android");
    await expect(page.locator("[data-device-primary=android]")).toBeVisible();
    await expect(page.locator("[data-device-other]")).toHaveCount(7);
    await expect(page.locator("[data-device-other=web] a")).toHaveAttribute("href", "/research-os/learn");
  });
});

test.describe("on a Mac in Brave", () => {
  test.use({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36" });
  test("one Mac download button and no release-email form", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/download");
    const button = page.locator("[data-device-primary^=macos]");
    await expect(button).toHaveText(/^Download Bucket for (Intel )?Mac$/);
    await expect(button).toBeInViewport();
    await expect(page.locator("[data-polingual-line]")).toBeVisible();
    await expect(page.locator("[data-download-pane], [data-download-form], #flow-platform")).toHaveCount(0);
  });
});
