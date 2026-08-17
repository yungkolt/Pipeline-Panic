import type { Domain, DomainStats, GameSave } from "../types";
import { QUESTS } from "../content/quests";
import { TILE } from "../content/map";
import { refreshLocks } from "./quests";

const DOMAINS: Domain[] = [
  "boards",
  "repos",
  "pipelines",
  "security",
  "observability",
];

function emptyStats(): Record<Domain, DomainStats> {
  return {
    boards: { attempts: 0, wins: 0, fails: 0 },
    repos: { attempts: 0, wins: 0, fails: 0 },
    pipelines: { attempts: 0, wins: 0, fails: 0 },
    security: { attempts: 0, wins: 0, fails: 0 },
    observability: { attempts: 0, wins: 0, fails: 0 },
  };
}

export function newGameSave(spawn: { x: number; y: number }): GameSave {
  const quests: GameSave["quests"] = {};
  for (const q of QUESTS) {
    const locked = Boolean(q.requires?.length);
    quests[q.id] = {
      status: locked ? "locked" : "available",
      steps: Object.fromEntries(q.steps.map((s) => [s.id, false])),
    };
  }
  return {
    version: 1,
    player: {
      x: spawn.x,
      y: spawn.y,
      xp: 0,
      skills: ["help-basics"],
      badges: [],
      runbooks: 3,
      resumeBullets: [],
    },
    quests,
    domainStats: emptyStats(),
    campaignComplete: false,
    endlessUnlocked: false,
    endlessStreak: 0,
    currentIncident: null,
    flags: {},
  };
}

export function weakDomain(save: GameSave): Domain | undefined {
  let worst: Domain | undefined;
  let worstRate = 2;
  for (const d of DOMAINS) {
    const s = save.domainStats[d];
    if (s.attempts < 1) continue;
    const rate = s.wins / s.attempts;
    if (rate < worstRate) {
      worstRate = rate;
      worst = d;
    }
  }
  return worst;
}

export function defaultSpawn(): { x: number; y: number } {
  return { x: 27 * TILE + 16, y: 16 * TILE + 16 };
}

export function migrateSave(save: GameSave): GameSave {
  const baseline = newGameSave(defaultSpawn());
  for (const q of QUESTS) {
    const existing = save.quests[q.id];
    if (!existing) {
      save.quests[q.id] = baseline.quests[q.id];
      continue;
    }
    for (const step of q.steps) {
      if (typeof existing.steps[step.id] !== "boolean") existing.steps[step.id] = false;
    }
    if (q.steps.every((s) => existing.steps[s.id]) && existing.status !== "completed") {
      existing.status = "completed";
    }
  }
  if (!save.player.skills.includes("help-basics")) save.player.skills.unshift("help-basics");
  refreshLocks(save);
  return save;
}
