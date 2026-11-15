import { WORLD_H, WORLD_W, type Arena, type Snake } from "@/lib/lobby/snake";
import { tokens } from "@/ui/tokens";

export function viewOf(c: HTMLCanvasElement, me: Snake): { x: number; y: number; w: number; h: number } {
  const dpr = Number(c.dataset.dpr ?? 1);
  const w = Math.min(WORLD_W, c.width / dpr);
  const h = Math.min(WORLD_H, c.height / dpr);
  const x = Math.max(0, Math.min(WORLD_W - w, me.body[0].x - w / 2));
  const y = Math.max(0, Math.min(WORLD_H - h, me.body[0].y - h / 2));
  return { x, y, w, h };
}

const C = tokens.color;
const KENTE: [number, number, number, number][] = [
  [0, 22, WORLD_W, 22],
  [0, WORLD_H - 22, WORLD_W, WORLD_H - 22],
  [22, 0, 22, WORLD_H],
  [WORLD_W - 22, 0, WORLD_W - 22, WORLD_H],
];
function kente(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, v: { x: number; y: number }) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  ctx.save();
  ctx.translate(x0 - v.x, y0 - v.y);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.globalAlpha = 0.5;
  const band = [C.ochre, C.malachite, C.ochre, C.vermilion, C.ochre, C.ink];
  for (let x = 0; x < len; x += 36) {
    ctx.fillStyle = band[Math.floor(x / 36) % band.length];
    ctx.fillRect(x, -22, 36, 44);
  }
  ctx.fillStyle = C.ink;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, -3, len, 6);
  ctx.restore();
}

function brush(ctx: CanvasRenderingContext2D, s: Snake, v: { x: number; y: number }) {
  const pts = s.body.map((p) => ({ x: p.x - v.x, y: p.y - v.y }));
  const n = pts.length;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const pass of [0, 1, 2]) {
    for (let i = n - 1; i > 0; i--) {
      const t = 1 - i / n;
      const w = 6 + 14 * Math.sqrt(t);
      ctx.strokeStyle = pass === 0 ? C.ink : pass === 1 ? s.color : C.paper;
      ctx.globalAlpha = pass === 2 ? 0.28 : 1;
      ctx.lineWidth = pass === 0 ? w + 4 : pass === 1 ? w : Math.max(1.5, w * 0.18);
      ctx.beginPath();
      const o = pass === 2 ? w * 0.22 : 0;
      ctx.moveTo(pts[i].x + o, pts[i].y - o);
      ctx.lineTo(pts[i - 1].x + o, pts[i - 1].y - o);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  const h = pts[0];
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.arc(h.x - 4, h.y - 3, 3.5, 0, 6.29);
  ctx.arc(h.x + 4, h.y - 3, 3.5, 0, 6.29);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(h.x - 4, h.y - 3, 1.6, 0, 6.29);
  ctx.arc(h.x + 4, h.y - 3, 1.6, 0, 6.29);
  ctx.fill();
}

function label(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, tilt: number) {
  const tw = ctx.measureText(text).width + 20;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.fillStyle = C.ink;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(-tw / 2 + 4, -12, tw, 30);
  ctx.globalAlpha = 1;
  ctx.fillStyle = C["paper-2"];
  ctx.beginPath();
  ctx.moveTo(-tw / 2, -15);
  for (let k = 1; k <= 8; k++) ctx.lineTo(-tw / 2 + (tw * k) / 8, -15 + (k % 2 ? 3 : -1));
  ctx.lineTo(tw / 2 - 2, 14);
  for (let k = 7; k >= 0; k--) ctx.lineTo(-tw / 2 + (tw * k) / 8, 14 + (k % 2 ? -3 : 1));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.tyrian;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

export function draw(c: HTMLCanvasElement | null, a: Arena, lang: string) {
  const ctx = c?.getContext("2d");
  const me = a.snakes.find((s) => s.id === "me");
  if (!c || !ctx || !me) return;
  const v = viewOf(c, me);
  const dpr = Number(c.dataset.dpr ?? 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = C.tyrian;
  ctx.fillRect(0, 0, v.w, v.h);
  ctx.strokeStyle = C.maya;
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 2;
  for (let gx = -(v.x % 90); gx < v.w + 90; gx += 90) {
    for (let gy = -(v.y % 90); gy < v.h + 90; gy += 90) {
      ctx.strokeRect(gx + 27, gy + 27, 36, 36);
      ctx.save();
      ctx.translate(gx + 45, gy + 45);
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-18, -18, 36, 36);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  for (const [x0, y0, x1, y1] of KENTE) kente(ctx, x0, y0, x1, y1, v);
  ctx.strokeStyle = C.ochre;
  ctx.lineWidth = 6;
  ctx.strokeRect(-v.x + 3, -v.y + 3, WORLD_W - 6, WORLD_H - 6);
  ctx.font = "800 16px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const w of a.words) {
    const x = w.x - v.x;
    const y = w.y - v.y;
    if (x < -80 || y < -30 || x > v.w + 80 || y > v.h + 30) continue;
    label(ctx, x, y, w.form, ((w.id % 7) - 3) * 0.03);
  }
  for (const s of a.snakes) {
    if (!s.alive) continue;
    brush(ctx, s, v);
    ctx.fillStyle = C.paper;
    ctx.font = "800 12px Nunito, sans-serif";
    ctx.fillText(`${s.name} ${s.length}`, s.body[0].x - v.x, s.body[0].y - v.y - 22);
    ctx.font = "800 16px Nunito, sans-serif";
  }
  ctx.fillStyle = C.paper;
  ctx.font = "700 12px 'Space Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText(`EAT ${lang.toUpperCase()}`, 12, 16);
}

