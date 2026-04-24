import type { MetadataRoute } from "next";

const BASE = "https://www.bucket.foundation";

// Every agent allowed. Free to read, paid to cite.
const AI_AGENTS = [
  "Googlebot",
  "Googlebot-Image",
  "Bingbot",
  "DuckDuckBot",
  "Google-Extended",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Applebot",
  "Applebot-Extended",
  "cohere-ai",
  "CCBot",
  "FacebookBot",
  "Bytespider",
  "Amazonbot",
  "YouBot",
  "Meta-ExternalAgent",
  "Diffbot",
  "DeepSeekBot",
  "MistralAI-User",
  "Gemini",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/kruse/"] },
      ...AI_AGENTS.map((ua) => ({ userAgent: ua, allow: "/" })),
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
