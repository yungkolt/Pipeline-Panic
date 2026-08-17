export type Domain =
  | "boards"
  | "repos"
  | "pipelines"
  | "security"
  | "observability";

export type Zone = Domain | "hub";

export type QuestStatus = "locked" | "available" | "active" | "completed";

export type WinCondition =
  | { type: "eq"; path: string; value: unknown }
  | { type: "neq"; path: string; value: unknown }
  | { type: "all"; conditions: WinCondition[] }
  | { type: "any"; conditions: WinCondition[] };

export interface QuestProgress {
  status: QuestStatus;
  steps: Record<string, boolean>;
}

export interface DomainStats {
  attempts: number;
  wins: number;
  fails: number;
}

export interface Incident {
  instanceId: string;
  templateId: string;
  seed: number;
  title: string;
  severity: 1 | 2 | 3;
  domain: Domain;
  environment: string;
  brief: string;
  logSnippet: string;
  skillTags: string[];
  requiredSkills: string[];
  state: Record<string, unknown>;
  revealed: string[];
  productionHp: number;
  productionMaxHp: number;
  incidentHp: number;
  incidentMaxHp: number;
  win: WinCondition;
  resumeBullet: string;
  hint: string;
  rootCauseId: string;
  redHerringId?: string;
  resolved: boolean;
  failed: boolean;
  turns: number;
  campaign: boolean;
}

export interface GameSave {
  version: 1;
  player: {
    x: number;
    y: number;
    xp: number;
    skills: string[];
    badges: string[];
    runbooks: number;
    resumeBullets: string[];
  };
  quests: Record<string, QuestProgress>;
  domainStats: Record<Domain, DomainStats>;
  campaignComplete: boolean;
  endlessUnlocked: boolean;
  endlessStreak: number;
  currentIncident: Incident | null;
  flags: Record<string, boolean | string | number>;
}

export interface CommandResult {
  output: string;
  stateChanges?: Record<string, unknown>;
  reveal?: string[];
  damageIncident?: number;
  damageProduction?: number;
  healProduction?: number;
  skillBlocked?: string;
  global?: boolean;
}

export interface SlotValues {
  service: string;
  region: string;
  [key: string]: string;
}

export interface RootCause {
  id: string;
  label: string;
  apply: (state: Record<string, unknown>, slots: SlotValues) => void;
}

export interface RedHerring {
  id: string;
  apply: (state: Record<string, unknown>, slots: SlotValues) => void;
}

export interface IncidentTemplate {
  id: string;
  domain: Domain;
  skillTags: string[];
  requiredSkills: string[];
  title: string;
  severity: 1 | 2 | 3;
  brief: string;
  logSnippet: string;
  hint: string;
  resumeBullet: string;
  slotOptions: Record<string, string[]>;
  rootCauses: RootCause[];
  redHerrings: RedHerring[];
  win: WinCondition;
  buildBaseState: (slots: SlotValues) => Record<string, unknown>;
}

export interface SkillDef {
  id: string;
  name: string;
  domain: Zone;
  description: string;
  commands: string[];
}

export interface QuestStepDef {
  id: string;
  text: string;
}

export interface QuestDef {
  id: string;
  title: string;
  domain?: Domain;
  description: string;
  steps: QuestStepDef[];
  unlockSkills?: string[];
  unlockBadge?: string;
  xp: number;
  requires?: string[];
}

export interface Lesson {
  id: string;
  zone: Zone;
  skill: string;
  questId: string;
  title: string;
  body: string[];
  quiz: { q: string; choices: string[]; answer: number };
}

export interface MapEntity {
  id: string;
  kind: "npc" | "kiosk" | "server" | "desk" | "pager" | "badge-case";
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  zone: Zone;
  npcId?: string;
  solid?: boolean;
}

export interface RankDef {
  id: string;
  name: string;
  minXp: number;
}
