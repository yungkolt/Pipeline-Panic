import { describe, expect, it } from "vitest";
import {
  COLS,
  ROWS,
  TILE,
  createCampusMap,
  isWalkableTile,
} from "./map";

function neighbors(x: number, y: number): [number, number][] {
  return [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ];
}

function reachable(
  tiles: number[][],
  from: { x: number; y: number },
  to: { x: number; y: number },
): boolean {
  const sx = Math.floor(from.x / TILE);
  const sy = Math.floor(from.y / TILE);
  const tx = Math.floor(to.x / TILE);
  const ty = Math.floor(to.y / TILE);
  const seen = new Set<string>([`${sx},${sy}`]);
  const q = [[sx, sy]];
  while (q.length) {
    const [cx, cy] = q.shift()!;
    if (cx === tx && cy === ty) return true;
    for (const [nx, ny] of neighbors(cx, cy)) {
      if (ny < 0 || nx < 0 || ny >= ROWS || nx >= COLS) continue;
      const key = `${nx},${ny}`;
      if (seen.has(key)) continue;
      if (!isWalkableTile(tiles[ny][nx])) continue;
      seen.add(key);
      q.push([nx, ny]);
    }
  }
  return false;
}

describe("campus map", () => {
  const map = createCampusMap();
  const maya = map.entities.find((e) => e.id === "maya")!;
  const glen = map.entities.find((e) => e.id === "glen")!;
  const priya = map.entities.find((e) => e.id === "priya")!;
  const sofia = map.entities.find((e) => e.id === "sofia")!;
  const omar = map.entities.find((e) => e.id === "omar")!;

  it("connects the hub spawn to Boards (Maya) and Repos (Glen)", () => {
    expect(reachable(map.tiles, map.spawn, maya)).toBe(true);
    expect(reachable(map.tiles, map.spawn, glen)).toBe(true);
  });

  it("still connects Pipelines, Security, and Observability", () => {
    expect(reachable(map.tiles, map.spawn, priya)).toBe(true);
    expect(reachable(map.tiles, map.spawn, sofia)).toBe(true);
    expect(reachable(map.tiles, map.spawn, omar)).toBe(true);
  });
});
