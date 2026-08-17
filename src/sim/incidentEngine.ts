import type { CommandResult, GameSave, Incident } from "../types";
import { applyChanges, evalWin } from "./path";
import { runCommand, tokenize } from "./commands";

export interface EngineTick {
  result: CommandResult;
  incident: Incident | null;
  resolvedNow: boolean;
  failedNow: boolean;
  consumeRunbook: boolean;
}

export function applyCommand(save: GameSave, raw: string): EngineTick {
  const incident = save.currentIncident;
  const result = runCommand({
    raw,
    tokens: tokenize(raw),
    skills: save.player.skills,
    incident,
    save,
  });

  const consumeRunbook = Boolean(result.stateChanges?.__consumeRunbook);
  if (result.stateChanges && "__consumeRunbook" in result.stateChanges) {
    delete result.stateChanges.__consumeRunbook;
  }

  if (!incident || incident.resolved || incident.failed || result.global) {
    return { result, incident, resolvedNow: false, failedNow: false, consumeRunbook };
  }

  incident.turns += 1;
  if (result.stateChanges) applyChanges(incident.state, result.stateChanges);
  if (result.reveal) {
    for (const id of result.reveal) {
      if (!incident.revealed.includes(id)) incident.revealed.push(id);
    }
  }
  if (result.damageIncident) {
    incident.incidentHp = Math.max(0, incident.incidentHp - result.damageIncident);
  }
  if (result.damageProduction) {
    incident.productionHp = Math.max(
      0,
      incident.productionHp - result.damageProduction,
    );
  }
  if (result.healProduction) {
    incident.productionHp = Math.min(
      incident.productionMaxHp,
      incident.productionHp + result.healProduction,
    );
  }

  const won = evalWin(incident.state, incident.win) || incident.incidentHp <= 0 && evalWin(incident.state, incident.win);
  const reallyWon = evalWin(incident.state, incident.win);
  const failed = incident.productionHp <= 0 && !reallyWon;

  let resolvedNow = false;
  let failedNow = false;
  if (reallyWon && !incident.resolved) {
    incident.resolved = true;
    incident.incidentHp = 0;
    resolvedNow = true;
  } else if (failed && !incident.failed) {
    incident.failed = true;
    failedNow = true;
  }

  return { result, incident, resolvedNow, failedNow, consumeRunbook };
}

/** Auto-heal ingress if root cause conditions already met before restart — used by tests. */
export function isWinning(incident: Incident): boolean {
  return evalWin(incident.state, incident.win);
}
