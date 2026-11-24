import { NextResponse, type NextRequest } from "next/server";
import SLUGS from "./data/word-slugs.json";
import SITE_LANGS from "./lib/site-langs.json";

const WORD_SLUGS = new Set<string>(SLUGS);
const LANGS = new Set<string>(SITE_LANGS);

export function knownWordPath(pathname: string): boolean {
  const [, lang, word, slug, rest] = pathname.split("/");
  return word === "word" && rest === undefined && LANGS.has(lang) && WORD_SLUGS.has(slug);
}

export function middleware(req: NextRequest): NextResponse {
  if (knownWordPath(req.nextUrl.pathname)) return NextResponse.next();
  return new NextResponse("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

export const config = { matcher: "/:lang/word/:slug" };
