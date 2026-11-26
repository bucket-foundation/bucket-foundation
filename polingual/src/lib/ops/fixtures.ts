import type { PostPatch, PostWriter, SocialPost } from "./ops";

export const POST_ID = "0b6f1d2e-8a4c-4f3e-9d2a-1c5b7e9f0a12";

export function post(over: Partial<SocialPost> = {}): SocialPost {
  return {
    id: POST_ID, slug: "night", platform: "tiktok", scheduled_for: "2026-12-01T15:00:00Z", status: "ready", caption: "Night, Nacht, noche.", hashtags: "#etymology #spanish",
    slides: ["night/slide-1.jpg", "night/slide-2.jpg"], sent: {}, preview_url: null, views: 0, likes: 0, shares: 0, approved_at: null, approved_by: null, updated_at: "2026-11-26T00:00:00Z", ...over,
  };
}

export function memWriter(rows: SocialPost[]): PostWriter & { patches: PostPatch[] } {
  const patches: PostPatch[] = [];
  return {
    patches,
    find: async (id) => rows.find((r) => r.id === id) ?? null,
    update: async (id, patch) => {
      const r = rows.find((x) => x.id === id);
      if (!r) return false;
      if (!patch.sent && r.status === "posted") return false;
      if (patch.status !== "skipped" && r.status === "skipped") return false;
      patches.push(patch);
      Object.assign(r, patch);
      return true;
    },
  };
}
