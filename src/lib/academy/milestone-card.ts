import { shareLines, type MilestoneProgress } from "./lang-milestones";

export const CARD_W = 1080;
export const CARD_H = 1350;
export const PAD = 80;
export const MIN_FONT = 28;

export type Measure = (text: string, font: string) => number;

export interface TextOp {
  text: string;
  x: number;
  y: number;
  font: string;
  color: string;
  align: "left" | "right";
  direction: "ltr" | "rtl";
}

const font = (weight: number, size: number) => `${weight} ${size}px system-ui, sans-serif`;

export function fitText(text: string, max: number, size: number, weight: number, measure: Measure): { text: string; font: string } {
  let s = size;
  while (s > MIN_FONT && measure(text, font(weight, s)) > max) s -= 2;
  const f = font(weight, s);
  if (measure(text, f) <= max) return { text, font: f };
  const chars = Array.from(text);
  let n = chars.length;
  while (n > 1 && measure(chars.slice(0, n).join("") + "…", f) > max) n--;
  return { text: chars.slice(0, n).join("") + "…", font: f };
}

export function layoutCard(p: MilestoneProgress, measure: Measure): TextOp[] {
  const max = CARD_W - PAD * 2;
  const ops: TextOp[] = [];
  const ltr = (text: string, y: number, f: string, color: string): TextOp => ({ text, x: PAD, y, font: f, color, align: "left", direction: "ltr" });
  ops.push(ltr("MILESTONE", 96, font(700, 32), "#8a6d2b"));
  const title = fitText(p.milestone.title, max, 84, 800, measure);
  ops.push(ltr(title.text, 150, title.font, "#231F20"));
  const lines = shareLines(p);
  const step = Math.min(220, Math.floor((CARD_H - 330 - 160) / Math.max(lines.length, 1)));
  lines.forEach((l, i) => {
    const y = 300 + i * step;
    ops.push(ltr(l.lang, y, font(600, 34), "#5d5650"));
    const t = fitText(l.text, max, 64, 700, measure);
    ops.push({ text: t.text, x: l.rtl ? CARD_W - PAD : PAD, y: y + 46, font: t.font, color: "#231F20", align: l.rtl ? "right" : "left", direction: l.rtl ? "rtl" : "ltr" });
  });
  ops.push(ltr("Bucket", CARD_H - 130, font(800, 44), "#5B1A4A"));
  ops.push(ltr("bucket.foundation", CARD_H - 76, font(500, 30), "#5d5650"));
  return ops;
}

export function drawMilestoneCard(canvas: HTMLCanvasElement, p: MilestoneProgress): void {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable in this browser.");
  ctx.fillStyle = "#F6EEDC";
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = "#5B1A4A";
  ctx.fillRect(0, 0, CARD_W, 24);
  ctx.textBaseline = "top";
  const measure: Measure = (text, f) => {
    ctx.font = f;
    return ctx.measureText(text).width;
  };
  for (const op of layoutCard(p, measure)) {
    ctx.font = op.font;
    ctx.fillStyle = op.color;
    ctx.textAlign = op.align;
    ctx.direction = op.direction;
    ctx.fillText(op.text, op.x, op.y);
  }
}

export function cardBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The card did not render."))), "image/png"));
}
