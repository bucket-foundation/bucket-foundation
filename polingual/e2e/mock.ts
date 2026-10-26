import type { Page } from "@playwright/test";

export const USER = "00000000-0000-4000-8000-000000000001";

export interface MockApi {
  sessions: Record<string, unknown>[];
  posts: { branch: string; data: unknown }[];
  branches: Record<string, { data: unknown; updated_at: string }>;
}

export async function mockApi(page: Page, opts: { branches?: MockApi["branches"] } = {}): Promise<MockApi> {
  const api: MockApi = { sessions: [], posts: [], branches: opts.branches ?? {} };
  await page.route("**/api/academy/session", async (route) => {
    const b = route.request().postDataJSON() as Record<string, unknown>;
    api.sessions.push(b);
    if (b.action === "otp") return route.fulfill({ json: { ok: true } });
    if (b.action === "verify" && b.code === "123456") return route.fulfill({ json: { access_token: "test-access", refresh_token: "test-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600, user_id: USER } });
    return route.fulfill({ status: 400, json: { error: "bad_code" } });
  });
  await page.route("**/api/academy/progress", async (route) => {
    if (route.request().headers().authorization !== "Bearer test-access") return route.fulfill({ status: 401, json: { error: "unauthorized" } });
    if (route.request().method() === "POST") {
      const b = route.request().postDataJSON() as { branch: string; data: unknown };
      api.posts.push(b);
      api.branches[b.branch] = { data: b.data, updated_at: new Date().toISOString() };
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: { branches: api.branches } });
  });
  await page.route("**/api/academy/review-log**", (route) => route.fulfill({ status: 404, json: { error: "not_found" } }));
  await page.route("**/api/academy/event**", (route) => route.fulfill({ json: { ok: true } }));
  return api;
}

export async function signIn(page: Page): Promise<void> {
  await page.goto("/app");
  await page.getByTestId("email").fill("learner@example.com");
  await page.getByRole("button", { name: "Email me a code" }).click();
  await page.getByTestId("code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
}
