import type { MapEntity, Zone } from "../types";

export const TILE = 32;
export const COLS = 54;
export const ROWS = 38;

/** 0 void, 1 hub, 2 wall, 3 boards, 4 repos, 5 security, 6 observe, 7 pipelines */
export const TILE_HUB = 1;
export const TILE_WALL = 2;
export const TILE_BOARDS = 3;
export const TILE_REPOS = 4;
export const TILE_SECURITY = 5;
export const TILE_OBSERVE = 6;
export const TILE_PIPELINES = 7;

export const ZONE_COLORS: Record<number, string> = {
  0: "#020617",
  [TILE_HUB]: "#1e293b",
  [TILE_WALL]: "#0b1220",
  [TILE_BOARDS]: "#14532d",
  [TILE_REPOS]: "#1e3a5f",
  [TILE_SECURITY]: "#4a1d1d",
  [TILE_OBSERVE]: "#164e63",
  [TILE_PIPELINES]: "#3b1d4a",
};

export interface CampusMap {
  cols: number;
  rows: number;
  tiles: number[][];
  entities: MapEntity[];
  spawn: { x: number; y: number };
}

function fill(
  tiles: number[][],
  x: number,
  y: number,
  w: number,
  h: number,
  v: number,
): void {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      if (j >= 0 && j < ROWS && i >= 0 && i < COLS) tiles[j][i] = v;
    }
  }
}

function frame(
  tiles: number[][],
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  fill(tiles, x, y, w, 1, TILE_WALL);
  fill(tiles, x, y + h - 1, w, 1, TILE_WALL);
  fill(tiles, x, y, 1, h, TILE_WALL);
  fill(tiles, x + w - 1, y, 1, h, TILE_WALL);
}

function doorH(tiles: number[][], x: number, y: number, width = 2): void {
  fill(tiles, x, y, width, 1, TILE_HUB);
}

function doorV(tiles: number[][], x: number, y: number, height = 2): void {
  fill(tiles, x, y, 1, height, TILE_HUB);
}

export function createCampusMap(): CampusMap {
  const tiles: number[][] = Array.from({ length: ROWS }, () =>
    Array<number>(COLS).fill(0),
  );

  // Hub center
  fill(tiles, 20, 10, 14, 13, TILE_HUB);
  frame(tiles, 20, 10, 14, 13);

  // Boards NW
  fill(tiles, 1, 1, 18, 10, TILE_BOARDS);
  frame(tiles, 1, 1, 18, 10);

  // Repos NE
  fill(tiles, 35, 1, 18, 10, TILE_REPOS);
  frame(tiles, 35, 1, 18, 10);

  // Security W
  fill(tiles, 1, 12, 18, 11, TILE_SECURITY);
  frame(tiles, 1, 12, 18, 11);

  // Observe E
  fill(tiles, 35, 12, 18, 11, TILE_OBSERVE);
  frame(tiles, 35, 12, 18, 11);

  // Pipelines S (largest)
  fill(tiles, 1, 24, 52, 13, TILE_PIPELINES);
  frame(tiles, 1, 24, 52, 13);

  // Doorways into hub
  doorH(tiles, 26, 10, 3); // hub north (from boards/repos hall)
  doorH(tiles, 8, 10, 3); // boards south
  doorH(tiles, 43, 10, 3); // repos south
  doorV(tiles, 20, 15, 3); // hub west
  doorV(tiles, 18, 15, 1); // security east
  doorV(tiles, 33, 15, 3); // hub east
  doorV(tiles, 35, 15, 1); // observe west
  doorH(tiles, 26, 22, 3); // hub south
  doorH(tiles, 26, 24, 3); // pipelines north

  // Corridors
  fill(tiles, 8, 10, 3, 1, TILE_BOARDS);
  fill(tiles, 43, 10, 3, 1, TILE_REPOS);
  fill(tiles, 18, 15, 3, 3, TILE_SECURITY);
  fill(tiles, 33, 15, 3, 3, TILE_OBSERVE);
  fill(tiles, 26, 22, 3, 3, TILE_HUB);

  const entities: MapEntity[] = [
    npc("riley", "Riley", 26 * TILE + 4, 16 * TILE, "#38bdf8", "hub"),
    npc("maya", "Maya", 6 * TILE, 4 * TILE, "#34d399", "boards"),
    npc("glen", "Glen", 44 * TILE, 4 * TILE, "#60a5fa", "repos"),
    npc("priya", "Priya", 8 * TILE, 28 * TILE, "#c084fc", "pipelines"),
    npc("nate", "Nate", 40 * TILE, 30 * TILE, "#a78bfa", "pipelines"),
    npc("sofia", "Sofia", 6 * TILE, 16 * TILE, "#f87171", "security"),
    npc("omar", "Omar", 44 * TILE, 16 * TILE, "#22d3ee", "observability"),

    kiosk("kiosk-hub", "Hub Kiosk", 22 * TILE, 12 * TILE, "hub", "#10b981"),
    kiosk("kiosk-boards", "Boards Kiosk", 4 * TILE, 7 * TILE, "boards", "#10b981"),
    kiosk("kiosk-repos", "Repos Kiosk", 48 * TILE, 7 * TILE, "repos", "#10b981"),
    kiosk("kiosk-pipelines", "Pipelines Kiosk", 24 * TILE, 27 * TILE, "pipelines", "#10b981"),
    kiosk("kiosk-security", "Security Kiosk", 4 * TILE, 19 * TILE, "security", "#10b981"),
    kiosk("kiosk-observe", "Observe Kiosk", 48 * TILE, 19 * TILE, "observability", "#10b981"),

    server("server-boards", "Boards Incident Rack", 14 * TILE, 4 * TILE, "boards"),
    server("server-repos", "Repos Incident Rack", 38 * TILE, 4 * TILE, "repos"),
    server("server-pipelines", "Prod Server Rack", 18 * TILE, 32 * TILE, "pipelines"),
    server("server-security", "Vault Incident Rack", 14 * TILE, 16 * TILE, "security"),
    server("server-observe", "Telemetry Rack", 38 * TILE, 16 * TILE, "observability"),

    {
      id: "desk-hub",
      kind: "desk",
      name: "CLI Workstation",
      x: 30 * TILE,
      y: 18 * TILE,
      w: 56,
      h: 36,
      color: "#f59e0b",
      zone: "hub",
      solid: true,
    },
    {
      id: "pager",
      kind: "pager",
      name: "On-Call Pager",
      x: 22 * TILE,
      y: 18 * TILE,
      w: 40,
      h: 40,
      color: "#ef4444",
      zone: "hub",
      solid: true,
    },
    {
      id: "badge-case",
      kind: "badge-case",
      name: "Badge Case",
      x: 31 * TILE,
      y: 12 * TILE,
      w: 40,
      h: 36,
      color: "#eab308",
      zone: "hub",
      solid: true,
    },
  ];

  return {
    cols: COLS,
    rows: ROWS,
    tiles,
    entities,
    spawn: { x: 27 * TILE + 16, y: 16 * TILE + 16 },
  };
}

function npc(
  id: string,
  name: string,
  x: number,
  y: number,
  color: string,
  zone: Zone,
): MapEntity {
  return {
    id,
    kind: "npc",
    npcId: id,
    name,
    x,
    y,
    w: 28,
    h: 28,
    color,
    zone,
    solid: true,
  };
}

function kiosk(
  id: string,
  name: string,
  x: number,
  y: number,
  zone: Zone,
  color: string,
): MapEntity {
  return { id, kind: "kiosk", name, x, y, w: 40, h: 44, color, zone, solid: true };
}

function server(
  id: string,
  name: string,
  x: number,
  y: number,
  zone: Zone,
): MapEntity {
  return {
    id,
    kind: "server",
    name,
    x,
    y,
    w: 48,
    h: 56,
    color: "#ef4444",
    zone,
    solid: true,
  };
}

export function zoneFromTile(v: number): Zone | null {
  switch (v) {
    case TILE_HUB:
      return "hub";
    case TILE_BOARDS:
      return "boards";
    case TILE_REPOS:
      return "repos";
    case TILE_SECURITY:
      return "security";
    case TILE_OBSERVE:
      return "observability";
    case TILE_PIPELINES:
      return "pipelines";
    default:
      return null;
  }
}

export function isWall(tiles: number[][], px: number, py: number): boolean {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (ty < 0 || tx < 0 || ty >= tiles.length || tx >= tiles[0].length) return true;
  const v = tiles[ty][tx];
  return v === 0 || v === TILE_WALL;
}

export const ZONE_LABELS: { zone: Zone; x: number; y: number; label: string }[] = [
  { zone: "hub", x: 27, y: 11, label: "OPS HQ HUB" },
  { zone: "boards", x: 10, y: 2, label: "BOARDS WING" },
  { zone: "repos", x: 44, y: 2, label: "REPOS WING" },
  { zone: "security", x: 10, y: 13, label: "SECURITY VAULT" },
  { zone: "observability", x: 44, y: 13, label: "OBSERVABILITY DECK" },
  { zone: "pipelines", x: 27, y: 25, label: "PIPELINES ARENA" },
];
