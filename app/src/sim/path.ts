import type { WinCondition } from "../types";

export function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

export function setPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const keys = path.split(".");
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const next = cur[key];
    if (next == null || typeof next !== "object" || Array.isArray(next)) {
      cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
}

export function applyChanges(
  obj: Record<string, unknown>,
  changes: Record<string, unknown>,
): void {
  for (const [path, value] of Object.entries(changes)) {
    setPath(obj, path, value);
  }
}

export function evalWin(
  state: Record<string, unknown>,
  win: WinCondition,
): boolean {
  switch (win.type) {
    case "eq":
      return Object.is(getPath(state, win.path), win.value);
    case "neq":
      return !Object.is(getPath(state, win.path), win.value);
    case "all":
      return win.conditions.every((c) => evalWin(state, c));
    case "any":
      return win.conditions.some((c) => evalWin(state, c));
  }
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
