import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

export const MAX_DISCUSSION_WORDS = 100;
export const MAX_IMAGE_BYTES = 400 * 1024;
const STATUSES = new Set(["merged", "open"]);

export function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function checkImage(src, publicDir, label, errors) {
  if (typeof src !== "string" || !src.startsWith("/")) {
    errors.push(`${label} must be a path under public/ starting with /`);
    return;
  }
  const file = join(publicDir, src);
  if (!existsSync(file)) {
    errors.push(`${label} ${src} is missing from public/`);
    return;
  }
  if (statSync(file).size > MAX_IMAGE_BYTES) errors.push(`${label} ${src} is over ${MAX_IMAGE_BYTES} bytes`);
}

export function validateProduction(entry, { publicDir = "public" } = {}) {
  const errors = [];
  for (const field of ["id", "date", "title", "summary", "plot_title", "discussion", "image", "image_alt", "status"]) {
    if (typeof entry[field] !== "string" || entry[field].trim() === "") errors.push(`${field} is required`);
  }
  if (entry.category !== "production") errors.push("category must be production");
  if (typeof entry.date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) errors.push("date must be YYYY-MM-DD");
  if (typeof entry.status === "string" && !STATUSES.has(entry.status)) errors.push("status must be merged or open");
  if (typeof entry.discussion === "string" && wordCount(entry.discussion) >= MAX_DISCUSSION_WORDS) {
    errors.push(`discussion has ${wordCount(entry.discussion)} words, the limit is under ${MAX_DISCUSSION_WORDS}`);
  }
  checkImage(entry.image, publicDir, "image", errors);
  for (const [i, extra] of (entry.extra_images ?? []).entries()) {
    checkImage(extra?.src, publicDir, `extra_images[${i}]`, errors);
    if (typeof extra?.alt !== "string" || extra.alt.trim() === "") errors.push(`extra_images[${i}].alt is required`);
  }
  if (!Array.isArray(entry.links) || entry.links.length === 0) errors.push("links needs at least one link");
  for (const [i, link] of (entry.links ?? []).entries()) {
    if (typeof link?.label !== "string" || link.label.trim() === "") errors.push(`links[${i}].label is required`);
    if (typeof link?.href !== "string" || !/^(?:https:\/\/|\/)/.test(link.href)) errors.push(`links[${i}].href must be https or site-relative`);
  }
  return errors;
}
