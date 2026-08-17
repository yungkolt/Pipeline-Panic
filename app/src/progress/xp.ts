import type { RankDef } from "../types";

export const RANKS: RankDef[] = [
  { id: "intern", name: "Intern Cloud Engineer", minXp: 0 },
  { id: "junior", name: "Junior Cloud Engineer", minXp: 200 },
  { id: "engineer", name: "Cloud Engineer", minXp: 500 },
  { id: "devops", name: "DevOps Engineer", minXp: 1000 },
  { id: "senior", name: "Senior DevOps Engineer", minXp: 1800 },
  { id: "principal", name: "Principal DevOps Engineer", minXp: 3000 },
  { id: "commander", name: "AZ-400 Incident Commander", minXp: 5000 },
];

export function rankForXp(xp: number): RankDef {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (xp >= rank.minXp) current = rank;
  }
  return current;
}

export function nextRank(xp: number): RankDef | null {
  const current = rankForXp(xp);
  const idx = RANKS.findIndex((r) => r.id === current.id);
  return RANKS[idx + 1] ?? null;
}

export function xpProgress(xp: number): { current: number; next: number } {
  const current = rankForXp(xp);
  const upcoming = nextRank(xp);
  if (!upcoming) return { current: xp, next: current.minXp };
  return { current: xp, next: upcoming.minXp };
}
