import { expect, test } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

test.use({ launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } });
let server: Server;
let origin: string;

test.beforeAll(async () => {
  const html = await readFile(resolve("tools/download-demo/recorder.html"));
  const chapters = await readFile(resolve("tools/download-demo/chapters.json"));
  server = createServer((request, response) => {
    if (request.url === "/chapters.json") response.writeHead(200, { "content-type": "application/json" }).end(chapters);
    else if (request.url === "/recorder.html") response.writeHead(200, { "content-type": "text/html" }).end(html);
    else response.writeHead(404).end();
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});

test.afterAll(async () => { await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done())); });

test("recording recovers from denial and saves a local take with stopped tracks", async ({ page }) => {
  await page.addInitScript(() => {
    const media = navigator.mediaDevices;
    const base = media.getUserMedia.bind(media);
    const streams: MediaStream[] = [];
    Object.assign(window, { recordingStreams: streams });
    let first = true;
    media.getUserMedia = async (constraints) => {
      if (first) { first = false; throw new DOMException("Test denial", "NotAllowedError"); }
      const stream = await base(constraints);
      streams.push(stream);
      return stream;
    };
  });
  const requests: { method: string; url: string }[] = [];
  page.on("request", (request) => requests.push({ method: request.method(), url: request.url() }));
  await page.goto(`${origin}/recorder.html`);
  await expect(page.locator("#script")).toContainText("A fair coin has one bit of uncertainty");
  await page.getByRole("button", { name: "Record this section" }).click();
  await expect(page.getByRole("status")).toContainText("Microphone unavailable");
  for (let take = 0; take < 2; take++) {
    await page.getByRole("button", { name: "Record this section" }).click();
    await expect(page.getByRole("status")).toContainText("Recording.");
    await page.waitForTimeout(350);
    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Take ready");
    expect(await page.evaluate(() => (window as unknown as { recordingStreams: MediaStream[] }).recordingStreams.every((stream) => stream.getTracks().every((track) => track.readyState === "ended")))).toBe(true);
  }
  await expect(page.locator("audio")).toHaveCount(2);
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Save this take" }).first().click();
  const take = await download;
  expect(take.suggestedFilename()).toMatch(/^intro-.*\.(webm|ogg|m4a)$/);
  expect((await readFile(await take.path() as string)).length).toBeGreaterThan(100);
  expect(requests.every((request) => request.method === "GET" && (request.url.startsWith(origin + "/") || request.url.startsWith("blob:")))).toBe(true);
});
