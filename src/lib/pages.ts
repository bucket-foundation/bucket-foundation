import fs from "fs";
import path from "path";

export const PAGES_DIR = path.join(process.cwd(), "content", "pages");

export function stripComments(md: string): string {
  return md.replace(/<!--[\s\S]*?-->\n?/g, "");
}

export function readPage(name: string): string {
  const safe = name.replace(/[^A-Za-z0-9_-]/g, "");
  return stripComments(fs.readFileSync(path.join(PAGES_DIR, `${safe}.md`), "utf-8"));
}
