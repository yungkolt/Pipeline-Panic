import type { MapEntity } from "../types";
import type { Store } from "../progress/store";
import {
  createCampusMap,
  isWall,
  TILE,
  TILE_DOOR,
  TILE_WALL,
  ZONE_COLORS,
  ZONE_LABELS,
  type CampusMap,
} from "../content/map";
import { handleEntity, type Interaction } from "./interact";
import { drawDoorTile, drawEntity, drawPlayer, type Facing } from "./sprites";

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  map: CampusMap;
  store: Store;
  keys = new Set<string>();
  nearby: MapEntity | null = null;
  running = false;
  facing: Facing = "down";
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
    const p = store.get().player;
    if (isWall(this.map.tiles, p.x, p.y)) {
      p.x = this.map.spawn.x;
      p.y = this.map.spawn.y;
    }
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
      if (Math.abs(dx) > Math.abs(dy)) this.facing = dx < 0 ? "left" : "right";
      else this.facing = dy < 0 ? "up" : "down";
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
    let best = 72;
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
    const t = performance.now();

    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const t0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const t1 = Math.min(map.cols, Math.ceil((camX + canvas.width) / TILE) + 1);
    const r0 = Math.max(0, Math.floor(camY / TILE) - 1);
    const r1 = Math.min(map.rows, Math.ceil((camY + canvas.height) / TILE) + 1);

    for (let ty = r0; ty < r1; ty++) {
      for (let tx = t0; tx < t1; tx++) {
        const v = map.tiles[ty][tx];
        const x = tx * TILE - camX;
        const y = ty * TILE - camY;
        if (v === TILE_DOOR) {
          drawDoorTile(ctx, x, y, TILE, t);
        } else {
          ctx.fillStyle = ZONE_COLORS[v] ?? "#020617";
          ctx.fillRect(x, y, TILE, TILE);
          if (v !== 0 && v !== TILE_WALL) {
            ctx.strokeStyle = "rgba(15,23,42,0.45)";
            ctx.strokeRect(x, y, TILE, TILE);
          }
        }
      }
    }

    ctx.font = "bold 11px Inter, sans-serif";
    ctx.fillStyle = "rgba(226,232,240,0.7)";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    for (const label of ZONE_LABELS) {
      ctx.fillText(label.label, label.x * TILE - camX, label.y * TILE - camY);
    }

    for (const ent of map.entities) {
      drawEntity(ctx, ent, ent.x - camX, ent.y - camY, t);
    }

    drawPlayer(ctx, p.x - camX, p.y - camY, this.facing);
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
