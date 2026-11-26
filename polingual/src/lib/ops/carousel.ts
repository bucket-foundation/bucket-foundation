export type CarouselFiles = { meta: string; caption: string; hashtags: string; slides: string[] };
export type Carousel = { slug: string; platform: string; postDate: string; caption: string; hashtags: string; slideFiles: string[]; slides: string[] };

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

function slideNumber(f: string): number {
  return Number(/^slide-(\d+)\.png$/.exec(f)?.[1] ?? NaN);
}

export function parseCarousel(folder: string, files: CarouselFiles): Carousel {
  const meta = JSON.parse(files.meta || "{}") as { slug?: unknown; platform?: unknown; post_date?: unknown };
  const slug = typeof meta.slug === "string" && SLUG.test(meta.slug) ? meta.slug : folder.replace(/^\d{3}-/, "");
  if (!SLUG.test(slug)) throw new Error(`${folder}: bad slug`);
  const postDate = typeof meta.post_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(meta.post_date) ? meta.post_date : null;
  if (!postDate) throw new Error(`${folder}: meta.json needs post_date YYYY-MM-DD`);
  const hashtags = files.hashtags.trim().split(/\s+/).filter((t) => t.startsWith("#")).join(" ");
  const lines = files.caption.trim().split("\n");
  while (lines.length && (lines.at(-1)!.trim() === "" || (hashtags && lines.at(-1)!.trim() === hashtags))) lines.pop();
  const slideFiles = files.slides.filter((f) => Number.isFinite(slideNumber(f))).sort((a, b) => slideNumber(a) - slideNumber(b));
  if (slideFiles.length === 0) throw new Error(`${folder}: no slide-N.png files`);
  return {
    slug,
    platform: typeof meta.platform === "string" ? meta.platform : "tiktok",
    postDate,
    caption: lines.join("\n").trim(),
    hashtags,
    slideFiles,
    slides: slideFiles.map((f) => `${slug}/slide-${slideNumber(f)}.jpg`),
  };
}

export function carouselRow(c: Carousel) {
  return {
    slug: c.slug,
    platform: c.platform,
    scheduled_for: `${c.postDate}T15:00:00Z`,
    status: "ready" as const,
    caption: c.caption,
    hashtags: c.hashtags,
    slides: c.slides,
    preview_url: null,
  };
}
