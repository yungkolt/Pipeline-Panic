import type { Incident, Lesson, MapEntity, Zone } from "../types";
import type { Store } from "../progress/store";
import { npcDialogue, type DialogueSession } from "../content/dialogue";
import { lessonsForZone } from "../content/lessons";
import { CAMPAIGN_INCIDENTS } from "../content/incidents/templates";
import { generateIncident, pickEndlessTemplate } from "../sim/generator";
import { hashString } from "../sim/rng";
import {
  activateQuest,
  campaignQuestStepForZone,
  completeStep,
} from "../progress/quests";
import { questById } from "../content/quests";
import { weakDomain } from "../progress/save";

export type Interaction =
  | { type: "dialogue"; session: DialogueSession }
  | { type: "lesson"; lesson: Lesson }
  | { type: "incident"; incident: Incident; message: string }
  | { type: "message"; text: string; toast?: string }
  | { type: "focus-terminal" };

export function handleEntity(store: Store, entity: MapEntity): Interaction {
  switch (entity.kind) {
    case "npc":
      return talk(store, entity.npcId ?? entity.id);
    case "kiosk":
      return openKiosk(store, entity.zone);
    case "server":
      return openRack(store, entity.zone);
    case "desk":
      return { type: "focus-terminal" };
    case "pager":
      return openPager(store);
    case "badge-case":
      return badges(store);
    default:
      return { type: "message", text: "Nothing happens." };
  }
}

function talk(store: Store, npcId: string): Interaction {
  const save = store.get();
  const session = npcDialogue(npcId, save);
  return { type: "dialogue", session };
}

export function applyDialogueFinish(store: Store, session: DialogueSession): string[] {
  const notes: string[] = [];
  if (session.startQuest) {
    notes.push(activateQuest(store, session.startQuest));
  }
  if (session.completeStep) {
    completeStep(store, session.completeStep.questId, session.completeStep.stepId);
  }
  session.onComplete?.(store.get());
  store.persist();
  return notes.filter(Boolean);
}

function openKiosk(store: Store, zone: Zone): Interaction {
  const save = store.get();
  const lessons = lessonsForZone(zone);
  const lesson =
    lessons.find((l) => {
      const prog = save.quests[l.questId];
      if (!prog) return false;
      if (prog.status === "locked" || prog.status === "completed") return false;
      const def = questById(l.questId);
      const trainStep = def?.steps.find(
        (s) => s.id.startsWith("train") || s.id === "visit-kiosk",
      );
      if (!trainStep) return true;
      return !prog.steps[trainStep.id];
    }) ?? lessons[0];

  if (!lesson) {
    return { type: "message", text: "This kiosk is dark. Try another wing." };
  }

  const prog = save.quests[lesson.questId];
  if (prog?.status === "locked") {
    return {
      type: "message",
      text: "This lesson is locked. Talk to the wing mentor (or Riley) first.",
    };
  }

  if (zone === "hub") {
    completeStep(store, "onboarding", "visit-kiosk");
  }

  return { type: "lesson", lesson };
}

export function passLesson(store: Store, lesson: Lesson): string {
  const save = store.get();
  if (!save.player.skills.includes(lesson.skill)) {
    save.player.skills.push(lesson.skill);
  }
  const def = questById(lesson.questId);
  if (def?.unlockSkills) {
    for (const s of def.unlockSkills) {
      if (!save.player.skills.includes(s)) save.player.skills.push(s);
    }
  }
  save.player.xp += 25;
  if (def) {
    const trainStep = def.steps.find(
      (s) => s.id.startsWith("train") || s.id === "visit-kiosk",
    );
    if (trainStep) completeStep(store, lesson.questId, trainStep.id);
  }
  store.emit();
  store.persist();
  return `Unlocked ${lesson.skill}. +25 XP`;
}

function openRack(store: Store, zone: Zone): Interaction {
  const save = store.get();
  if (save.currentIncident && !save.currentIncident.resolved && !save.currentIncident.failed) {
    return {
      type: "incident",
      incident: save.currentIncident,
      message: `Still on ${save.currentIncident.title}. Diagnose in the terminal.`,
    };
  }

  if (zone === "hub") {
    return { type: "message", text: "Hub racks are decorative. Use a domain wing rack or the pager." };
  }

  const step = campaignQuestStepForZone(save, zone);
  if (step) {
    const spec = CAMPAIGN_INCIDENTS[step.stepId];
    if (!spec) {
      return { type: "message", text: "No campaign incident wired for this rack." };
    }
    const required = questById(step.questId)?.unlockSkills ?? [];
    const missing = required.filter((s) => !save.player.skills.includes(s));
    // Allow incident if they have at least the template's required skills
    const incident = generateIncident({
      seed: hashString(`${step.questId}:${step.stepId}:${save.player.xp}`),
      templateId: spec.templateId,
      rootCauseId: spec.rootCauseId,
      campaign: true,
    });
    const need = incident.requiredSkills.filter((s) => !save.player.skills.includes(s));
    if (need.length) {
      return {
        type: "message",
        text: `This rack wants skills you don't have yet: ${need.join(", ")}. Finish the wing kiosk.`,
      };
    }
    save.currentIncident = incident;
    save.domainStats[incident.domain].attempts += 1;
    save.flags.campaignStep = `${step.questId}:${step.stepId}`;
    store.emit();
    store.persist();
    return {
      type: "incident",
      incident,
      message: missing.length
        ? `Incident loaded. Suggested extra skills: ${missing.join(", ")}`
        : `Incident loaded: ${incident.title}`,
    };
  }

  if (save.endlessUnlocked) {
    return spawnEndless(store, zone);
  }

  return {
    type: "message",
    text: "No campaign incident in this wing right now. Talk to the mentor or finish training.",
  };
}

function openPager(store: Store): Interaction {
  const save = store.get();
  if (!save.endlessUnlocked) {
    if (save.quests.capstone?.status === "active" || save.quests.capstone?.status === "available") {
      completeStep(store, "capstone", "touch-pager");
      save.endlessUnlocked = true;
      save.campaignComplete = true;
      store.emit();
      store.persist();
      return spawnEndless(store);
    }
    return {
      type: "message",
      text: "Pager is locked until Riley signs off (complete all five domain badges).",
    };
  }
  return spawnEndless(store);
}

function spawnEndless(store: Store, zone?: Zone): Interaction {
  const save = store.get();
  const seed = (Date.now() ^ save.player.xp ^ save.endlessStreak) >>> 0;
  const weak = weakDomain(save);
  const template = pickEndlessTemplate(
    seed,
    save.player.skills,
    zone && zone !== "hub" ? zone : weak,
  );
  const incident = generateIncident({
    seed,
    template,
    allowedSkills: save.player.skills,
  });
  const need = incident.requiredSkills.filter((s) => !save.player.skills.includes(s));
  if (need.length) {
    return {
      type: "message",
      text: `Endless incident needs ${need.join(", ")}. Train more wings.`,
    };
  }
  save.currentIncident = incident;
  save.domainStats[incident.domain].attempts += 1;
  save.flags.campaignStep = "";
  store.emit();
  store.persist();
  return {
    type: "incident",
    incident,
    message: `Endless On-Call: ${incident.title} (seed ${incident.seed})`,
  };
}

function badges(store: Store): Interaction {
  const save = store.get();
  const list = save.player.badges.length
    ? save.player.badges.join(", ")
    : "none yet";
  return {
    type: "message",
    text: `Badge case: ${list}. Five domain badges unlock Endless On-Call.`,
  };
}

export function resolveIncidentRewards(store: Store, incident: Incident, won: boolean): string {
  const save = store.get();
  if (won) {
    const xp = incident.severity === 1 ? 120 : incident.severity === 2 ? 80 : 50;
    save.player.xp += xp;
    save.domainStats[incident.domain].wins += 1;
    if (!save.player.resumeBullets.includes(incident.resumeBullet)) {
      save.player.resumeBullets.push(incident.resumeBullet);
    }
    if (Math.random() < 0.4) save.player.runbooks = Math.min(5, save.player.runbooks + 1);
    if (!incident.campaign) save.endlessStreak += 1;
    const flag = String(save.flags.campaignStep ?? "");
    if (flag.includes(":")) {
      const [questId, stepId] = flag.split(":");
      completeStep(store, questId, stepId);
    }
    store.emit();
    store.persist();
    return `Incident resolved. +${xp} XP. Resume bullet earned.`;
  }
  save.domainStats[incident.domain].fails += 1;
  save.endlessStreak = 0;
  store.emit();
  store.persist();
  return "Incident failed. Production HP hit 0. Re-engage the rack to retry.";
}
