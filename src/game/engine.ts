import type { MapEntity } from "../types";
import type { Store } from "../progress/store";
import {
  createCampusMap,
  isWall,
  TILE,
  ZONE_COLORS,
  ZONE_LABELS,
  type CampusMap,
} from "../content/map";
import { handleEntity, type Interaction } from "./interact";

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  map: CampusMap;
  store: Store;
  keys = new Set<string>();
  nearby: MapEntity | null = null;
  running = false;
  private raf = 0;
  onInteract: (result: Interaction, entity: MapEntity) => void = () => {};
  blocked = true;

  constructor(canvas: HTMLCanvasElement, store: Store) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");
    this.ctx = ctx;
    this.map = createCampusMap();
    this.store = store;
  }

  start(): void {
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.update();
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  bindInput(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  unbindInput(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    this.keys.add(key);
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
      if (!this.isTyping()) e.preventDefault();
    }
    if ((key === "e" || key === "enter") && this.nearby && !this.blocked && !this.isTyping()) {
      const result = handleEntity(this.store, this.nearby);
      this.onInteract(result, this.nearby);
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  isTyping(): boolean {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
  }

  private update(): void {
    if (this.blocked || this.isTyping()) {
      this.updateNearby();
      return;
    }
    const p = this.store.get().player;
    let dx = 0;
    let dy = 0;
    const speed = 3.1;
    if (this.keys.has("w") || this.keys.has("arrowup")) dy -= speed;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dy += speed;
    if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= speed;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx += speed;

    if (dx || dy) {
      const nx = p.x + dx;
      const ny = p.y + dy;
      if (!this.collides(nx, p.y)) p.x = nx;
      if (!this.collides(p.x, ny)) p.y = ny;
    }
    this.updateNearby();
  }

  private collides(x: number, y: number): boolean {
    const r = 10;
    const points = [
      [x - r, y - r],
      [x + r, y - r],
      [x - r, y + r],
      [x + r, y + r],
    ];
    for (const [px, py] of points) {
      if (isWall(this.map.tiles, px, py)) return true;
    }
    for (const ent of this.map.entities) {
      if (!ent.solid) continue;
      if (rectsOverlap(x - r, y - r, r * 2, r * 2, ent.x, ent.y, ent.w, ent.h)) {
        return true;
      }
    }
    return false;
  }

  private updateNearby(): void {
    const p = this.store.get().player;
    this.nearby = null;
    let best = 64;
    for (const ent of this.map.entities) {
      const cx = ent.x + ent.w / 2;
      const cy = ent.y + ent.h / 2;
      const d = Math.hypot(p.x - cx, p.y - cy);
      if (d < best) {
        best = d;
        this.nearby = ent;
      }
    }
  }

  private draw(): void {
    const { ctx, canvas, map } = this;
    const p = this.store.get().player;
    const camX = clamp(p.x - canvas.width / 2, 0, map.cols * TILE - canvas.width);
    const camY = clamp(p.y - canvas.height / 2, 0, map.rows * TILE - canvas.height);

    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const t0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const t1 = Math.min(map.cols, Math.ceil((camX + canvas.width) / TILE) + 1);
    const r0 = Math.max(0, Math.floor(camY / TILE) - 1);
    const r1 = Math.min(map.rows, Math.ceil((camY + canvas.height) / TILE) + 1);

    for (let ty = r0; ty < r1; ty++) {
      for (let tx = t0; tx < t1; tx++) {
        const v = map.tiles[ty][tx];
        ctx.fillStyle = ZONE_COLORS[v] ?? "#020617";
        ctx.fillRect(tx * TILE - camX, ty * TILE - camY, TILE, TILE);
        if (v !== 0 && v !== 2) {
          ctx.strokeStyle = "rgba(15,23,42,0.45)";
          ctx.strokeRect(tx * TILE - camX, ty * TILE - camY, TILE, TILE);
        }
      }
    }

    ctx.font = "bold 11px Inter, sans-serif";
    ctx.fillStyle = "rgba(226,232,240,0.55)";
    ctx.textAlign = "center";
    for (const label of ZONE_LABELS) {
      ctx.fillText(label.label, label.x * TILE - camX, label.y * TILE - camY);
    }

    for (const ent of map.entities) {
      const x = ent.x - camX;
      const y = ent.y - camY;
      ctx.fillStyle = ent.color;
      roundRect(ctx, x, y, ent.w, ent.h, 6);
      ctx.fill();
      if (ent.kind === "npc") {
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(x + ent.w / 2, y + ent.h / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "9px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(ent.name, x + ent.w / 2, y + ent.h + 12);
    }

    const px = p.x - camX;
    const py = p.y - camY;
    ctx.fillStyle = "#0ea5e9";
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7dd3fc";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

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
