import { shareLines, type MilestoneProgress } from "./lang-milestones";

export const CARD_W = 1080;
export const CARD_H = 1350;

function fit(ctx: CanvasRenderingContext2D, text: string, max: number, size: number, weight: string): number {
  let s = size;
  ctx.font = `${weight} ${s}px system-ui, sans-serif`;
  while (s > 20 && ctx.measureText(text).width > max) {
    s -= 2;
    ctx.font = `${weight} ${s}px system-ui, sans-serif`;
  }
  return s;
}

export function drawMilestoneCard(canvas: HTMLCanvasElement, p: MilestoneProgress): void {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable in this browser.");
  const pad = 80;
  ctx.fillStyle = "#F6EEDC";
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = "#5B1A4A";
  ctx.fillRect(0, 0, CARD_W, 24);
  ctx.textBaseline = "top";
  ctx.fillStyle = "#8a6d2b";
  ctx.font = "700 32px system-ui, sans-serif";
  ctx.fillText("MILESTONE", pad, 96);
  ctx.fillStyle = "#231F20";
  fit(ctx, p.milestone.title, CARD_W - pad * 2, 84, "800");
  ctx.fillText(p.milestone.title, pad, 150);
  const lines = shareLines(p);
  const room = CARD_H - 330 - 160;
  const step = Math.min(220, Math.floor(room / Math.max(lines.length, 1)));
  lines.forEach((l, i) => {
    const y = 300 + i * step;
    ctx.fillStyle = "#5d5650";
    ctx.font = "600 34px system-ui, sans-serif";
    ctx.fillText(l.lang, pad, y);
    ctx.fillStyle = "#231F20";
    fit(ctx, l.text, CARD_W - pad * 2, 64, "700");
    ctx.fillText(l.text, pad, y + 46);
  });
  ctx.fillStyle = "#5B1A4A";
  ctx.font = "800 44px system-ui, sans-serif";
  ctx.fillText("Bucket", pad, CARD_H - 130);
  ctx.fillStyle = "#5d5650";
  ctx.font = "500 30px system-ui, sans-serif";
  ctx.fillText("bucket.foundation", pad, CARD_H - 76);
}

export function cardBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The card did not render."))), "image/png"));
}
