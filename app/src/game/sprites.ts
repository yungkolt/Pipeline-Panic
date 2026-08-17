import type { MapEntity } from "../types";

export type Facing = "down" | "up" | "left" | "right";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h - 2, w * 0.42, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawEntity(
  ctx: CanvasRenderingContext2D,
  ent: MapEntity,
  x: number,
  y: number,
  t: number,
): void {
  switch (ent.kind) {
    case "npc":
      drawPerson(ctx, x, y, ent.w, ent.h, ent.color, "down");
      break;
    case "kiosk":
      drawKiosk(ctx, x, y, ent.w, ent.h, t);
      break;
    case "server":
      drawServer(ctx, x, y, ent.w, ent.h, t);
      break;
    case "desk":
      drawDesk(ctx, x, y, ent.w, ent.h, t);
      break;
    case "pager":
      drawPager(ctx, x, y, ent.w, ent.h, t);
      break;
    case "badge-case":
      drawBadgeCase(ctx, x, y, ent.w, ent.h);
      break;
    default:
      ctx.fillStyle = ent.color;
      roundRect(ctx, x, y, ent.w, ent.h, 6);
      ctx.fill();
  }
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 9px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(ent.name, x + ent.w / 2, y + ent.h + 3);
}

export function drawPerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  facing: Facing,
): void {
  shadow(ctx, x, y, w, h);
  const cx = x + w / 2;
  const bodyW = Math.max(12, w * 0.55);
  const bodyH = h * 0.42;
  const bodyY = y + h * 0.42;
  const headR = Math.max(6, w * 0.28);
  const headY = y + h * 0.28;

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(cx - 4, bodyY + bodyH - 4, 3, h * 0.28);
  ctx.fillRect(cx + 1, bodyY + bodyH - 4, 3, h * 0.28);

  ctx.fillStyle = color;
  roundRect(ctx, cx - bodyW / 2, bodyY, bodyW, bodyH, 4);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  roundRect(ctx, cx - bodyW / 2 + 2, bodyY + 2, bodyW - 4, 5, 2);
  ctx.fill();

  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = shade(color, -40);
  ctx.beginPath();
  ctx.ellipse(cx, headY - 3, headR * 0.9, headR * 0.45, 0, Math.PI, 0);
  ctx.fill();

          ctx.fillStyle = "#0f172a";
          const eyeY = facing === "up" ? headY - 1 : headY + 1;
          const eyeSpread = facing === "left" ? -2 : facing === "right" ? 2 : 0;
          ctx.beginPath();
          ctx.arc(cx - 3 + eyeSpread, eyeY, 1.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx + 3 + eyeSpread, eyeY, 1.2, 0, Math.PI * 2);
          ctx.fill();
}

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: Facing,
): void {
  drawPerson(ctx, x - 14, y - 20, 28, 36, "#0ea5e9", facing);
  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - 10, 8, 0, Math.PI * 2);
  ctx.stroke();
}

function drawKiosk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
): void {
  shadow(ctx, x, y, w, h);
  ctx.fillStyle = "#334155";
  roundRect(ctx, x + w * 0.28, y + h * 0.62, w * 0.44, h * 0.32, 3);
  ctx.fill();
  ctx.fillStyle = "#1e293b";
  roundRect(ctx, x + 4, y + 2, w - 8, h * 0.62, 5);
  ctx.fill();
  const glow = 0.35 + 0.2 * Math.sin(t / 280);
  ctx.fillStyle = `rgba(16, 185, 129, ${glow})`;
  roundRect(ctx, x + 8, y + 8, w - 16, h * 0.42, 3);
  ctx.fill();
  ctx.fillStyle = "#ecfdf5";
  ctx.font = "bold 10px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("AZ", x + w / 2, y + h * 0.28);
  ctx.fillStyle = "#64748b";
  ctx.fillRect(x + 8, y + h * 0.56, w - 16, 3);
}

function drawServer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
): void {
  shadow(ctx, x, y, w, h);
  ctx.fillStyle = "#111827";
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = "#334155";
  ctx.stroke();
  const rows = 5;
  for (let i = 0; i < rows; i++) {
    const ry = y + 6 + i * ((h - 16) / rows);
    ctx.fillStyle = "#1f2937";
    roundRect(ctx, x + 5, ry, w - 10, 7, 1);
    ctx.fill();
    const on = Math.sin(t / 180 + i * 1.3) > 0.1;
    ctx.fillStyle = on ? "#f87171" : "#3f3f46";
    ctx.beginPath();
    ctx.arc(x + 11, ry + 3.5, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = on ? "#34d399" : "#3f3f46";
    ctx.beginPath();
    ctx.arc(x + 16, ry + 3.5, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDesk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
): void {
  shadow(ctx, x, y, w, h);
  ctx.fillStyle = "#92400e";
  roundRect(ctx, x, y + h * 0.45, w, h * 0.4, 3);
  ctx.fill();
  ctx.fillStyle = "#1e293b";
  roundRect(ctx, x + 8, y, w - 16, h * 0.5, 3);
  ctx.fill();
  ctx.fillStyle = `rgba(56, 189, 248, ${0.4 + 0.2 * Math.sin(t / 320)})`;
  roundRect(ctx, x + 12, y + 4, w - 24, h * 0.36, 2);
  ctx.fill();
  ctx.fillStyle = "#64748b";
  ctx.fillRect(x + w / 2 - 4, y + h * 0.48, 8, 6);
}

function drawPager(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
): void {
  shadow(ctx, x, y, w, h);
  ctx.fillStyle = "#7f1d1d";
  roundRect(ctx, x + 6, y + h * 0.35, w - 12, h * 0.55, 4);
  ctx.fill();
  const pulse = 0.45 + 0.45 * Math.abs(Math.sin(t / 200));
  ctx.fillStyle = `rgba(248, 113, 113, ${pulse})`;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + 12, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(252, 165, 165, ${pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + 12, 12, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBadgeCase(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  shadow(ctx, x, y, w, h);
  ctx.fillStyle = "#78350f";
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.fillStyle = "rgba(253, 224, 71, 0.35)";
  roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 3);
  ctx.fill();
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 10);
  ctx.lineTo(x + w / 2 + 7, y + 22);
  ctx.lineTo(x + w / 2 - 7, y + 22);
  ctx.closePath();
  ctx.fill();
}

export function drawDoorTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  t: number,
): void {
  ctx.fillStyle = "#155e75";
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "#22d3ee";
  const pulse = 0.35 + 0.25 * Math.sin(t / 250);
  ctx.globalAlpha = pulse;
  ctx.fillRect(x + 4, y + 4, size - 8, size - 8);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ecfeff";
  ctx.font = "bold 12px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("▸", x + size / 2, y + size / 2);
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}
