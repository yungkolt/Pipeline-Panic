import type { GameSave } from "../types";
import { QUESTS, questById, BADGE_NAMES } from "../content/quests";
import type { Store } from "./store";

export function isCompleted(save: GameSave, id: string): boolean {
  return save.quests[id]?.status === "completed";
}

export function isActive(save: GameSave, id: string): boolean {
  return save.quests[id]?.status === "active";
}

export function isAvailable(save: GameSave, id: string): boolean {
  return save.quests[id]?.status === "available";
}

export function refreshLocks(save: GameSave): void {
  for (const q of QUESTS) {
    const prog = save.quests[q.id];
    if (!prog || prog.status === "completed" || prog.status === "active") continue;
    const ready = (q.requires ?? []).every((id) => save.quests[id]?.status === "completed");
    prog.status = ready ? "available" : "locked";
  }
}

export function activateQuest(store: Store, id: string): string {
  const save = store.get();
  const prog = save.quests[id];
  const def = questById(id);
  if (!prog || !def) return "Unknown quest.";
  if (prog.status === "completed") return `${def.title} is already complete.`;
  if (prog.status === "locked") return `${def.title} is still locked.`;
  prog.status = "active";
  store.emit();
  store.persist();
  return `Quest started: ${def.title}`;
}

export function completeStep(store: Store, questId: string, stepId: string): boolean {
  const save = store.get();
  const prog = save.quests[questId];
  const def = questById(questId);
  if (!prog || !def) return false;
  if (prog.status === "locked") return false;
  if (prog.status === "available") prog.status = "active";
  if (prog.steps[stepId]) return false;
  prog.steps[stepId] = true;
  const allDone = def.steps.every((s) => prog.steps[s.id]);
  if (allDone && prog.status !== "completed") {
    finishQuest(store, questId);
  } else {
    store.emit();
    store.persist();
  }
  return true;
}

export function finishQuest(store: Store, questId: string): void {
  const save = store.get();
  const prog = save.quests[questId];
  const def = questById(questId);
  if (!prog || !def || prog.status === "completed") return;
  prog.status = "completed";
  for (const s of def.steps) prog.steps[s.id] = true;
  save.player.xp += def.xp;
  if (def.unlockSkills) {
    for (const skill of def.unlockSkills) {
      if (!save.player.skills.includes(skill)) save.player.skills.push(skill);
    }
  }
  if (def.unlockBadge && !save.player.badges.includes(def.unlockBadge)) {
    save.player.badges.push(def.unlockBadge);
  }
  if (questId === "capstone") {
    save.campaignComplete = true;
    save.endlessUnlocked = true;
  }
  refreshLocks(save);
  save.flags.lastQuestReward = `${def.title} +${def.xp} XP${
    def.unlockBadge ? ` · ${BADGE_NAMES[def.unlockBadge]}` : ""
  }`;
  store.emit();
  store.persist();
}

export function activeQuests(save: GameSave) {
  return QUESTS.filter((q) => save.quests[q.id]?.status === "active");
}

export function visibleQuests(save: GameSave) {
  return QUESTS.filter((q) => {
    const st = save.quests[q.id]?.status;
    return st === "active" || st === "available" || st === "completed";
  });
}

export function campaignQuestStepForZone(
  save: GameSave,
  zone: string,
): { questId: string; stepId: string } | null {
  const mapping: Record<string, { questId: string; stepId: string }[]> = {
    boards: [
      { questId: "boards-flow", stepId: "incident-boards" },
      { questId: "boards-metrics", stepId: "incident-webhook" },
    ],
    repos: [{ questId: "repos-policies", stepId: "incident-policy" }],
    pipelines: [
      { questId: "pipelines-yaml", stepId: "incident-yaml" },
      { questId: "pipelines-aks", stepId: "incident-aks" },
      { questId: "pipelines-deploy", stepId: "incident-slot" },
      { questId: "pipelines-iac", stepId: "incident-bicep" },
    ],
    security: [
      { questId: "security-secrets", stepId: "incident-kv" },
      { questId: "security-oidc", stepId: "incident-oidc" },
    ],
    observability: [
      { questId: "observe-kql", stepId: "incident-kql" },
      { questId: "observe-alerts", stepId: "incident-alert" },
    ],
  };
  const list = mapping[zone] ?? [];
  for (const item of list) {
    const prog = save.quests[item.questId];
    if (!prog) continue;
    if (prog.status === "completed") continue;
    if (prog.status === "locked") continue;
    if (!prog.steps[item.stepId]) return item;
  }
  return null;
}
