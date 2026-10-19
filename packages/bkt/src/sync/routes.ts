import { heldAction, type ReviewEvent } from "../../../../src/lib/academy/review-sync";
import type { Route } from "../serve";
import { SyncError, type LoginPrompt, type RemoteSync } from "../../../../src/lib/academy/remote-sync";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const BRANCH_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function reviewOf(v: unknown): ReviewEvent | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  if (typeof r.card_id !== "string" || ![1, 2, 3, 4].includes(r.rating as number) || typeof r.level !== "string") return null;
  if (typeof r.reviewed_at !== "number" || typeof r.tz !== "string" || typeof r.atoms_version !== "string") return null;
  if (r.review_id !== undefined && typeof r.review_id !== "string") return null;
  return r as unknown as ReviewEvent;
}

export function syncRoutes(remote: RemoteSync, opts: { label: () => string; onError?: (m: string) => void } = { label: () => "desktop" }): Record<string, Route> {
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingLogin: LoginPrompt | null = null;
  const report = (e: unknown) => opts.onError?.(e instanceof Error ? e.message : String(e));
  const scheduleFlush = () => {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushTimer = null;
      remote.sync.flush().catch(report);
    }, 800);
  };

  return {
    "POST /local/review-log": async (req) => {
      const b = (await req.json().catch(() => null)) as { branch?: unknown; review?: unknown } | null;
      const review = reviewOf(b?.review);
      if (!b || typeof b.branch !== "string" || !BRANCH_RE.test(b.branch) || !review) return json({ error: "bad_request" }, 400);
      const q = remote.sync.appendReview(b.branch, review);
      scheduleFlush();
      return json({ review_id: q.review_id });
    },
    "GET /local/review-log": async () => {
      try {
        await remote.sync.flush();
        return json({ reviews: await remote.sync.pullLog(), pending: remote.sync.pending().length, held: remote.sync.held().length });
      } catch (e) {
        report(e);
        return json({ error: e instanceof SyncError ? e.code : "sync_failed" }, 502);
      }
    },
    "POST /local/review-log/held": async (req) => {
      const r = heldAction(remote.sync, await req.json().catch(() => null));
      if (r.status === 200 && r.body.restored) scheduleFlush();
      return json(r.body, r.status);
    },
    "GET /local/account": async () => {
      try {
        const s = await remote.session();
        return json({ signed_in: s !== null, user_id: s?.user_id ?? null, device_id: s?.device_id ?? null, pending_login: pendingLogin, mode: remote.sync.mode() });
      } catch (e) {
        report(e);
        return json({ error: e instanceof SyncError ? e.code : "account_failed" }, 502);
      }
    },
    "POST /local/account/login": async () => {
      if (pendingLogin) return json(pendingLogin);
      const prompt = await new Promise<LoginPrompt | Error>((resolve) => {
        remote
          .login("desktop", opts.label(), (p) => {
            pendingLogin = p;
            resolve(p);
          })
          .catch((e) => resolve(e as Error))
          .finally(() => {
            pendingLogin = null;
          });
      });
      return prompt instanceof Error ? json({ error: prompt instanceof SyncError ? prompt.code : "login_failed" }, 502) : json(prompt);
    },
    "POST /local/account/logout": async () => {
      await remote.logout();
      return json({ ok: true });
    },
  };
}
