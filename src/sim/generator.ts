import type { Incident, IncidentTemplate, SlotValues } from "../types";
import { TEMPLATES } from "../content/incidents/templates";
import { createRng, pick } from "./rng";
import { deepClone } from "./path";
import { fillTemplate } from "../content/incidents/templates";

export interface GenerateOptions {
  seed: number;
  template?: IncidentTemplate;
  templateId?: string;
  rootCauseId?: string;
  campaign?: boolean;
  domain?: Incident["domain"];
  allowedSkills?: string[];
}

function fillSlots(template: IncidentTemplate, rng: () => number): SlotValues {
  const slots: SlotValues = { service: "app", region: "eastus" };
  for (const [key, options] of Object.entries(template.slotOptions)) {
    slots[key] = pick(rng, options);
  }
  return slots;
}

export function generateIncident(opts: GenerateOptions): Incident {
  const rng = createRng(opts.seed);
  let template = opts.template;
  if (!template && opts.templateId) {
    template = TEMPLATES.find((t) => t.id === opts.templateId);
  }
  if (!template && opts.domain) {
    const pool = TEMPLATES.filter((t) => t.domain === opts.domain);
    template = pick(rng, pool.length ? pool : TEMPLATES);
  }
  if (!template && opts.allowedSkills?.length) {
    const pool = TEMPLATES.filter((t) =>
      t.requiredSkills.every((s) => opts.allowedSkills!.includes(s)),
    );
    template = pick(rng, pool.length ? pool : TEMPLATES);
  }
  if (!template) template = pick(rng, TEMPLATES);

  const slots = fillSlots(template, rng);
  const root =
    template.rootCauses.find((r) => r.id === opts.rootCauseId) ??
    pick(rng, template.rootCauses);
  const herring = template.redHerrings.length
    ? pick(rng, template.redHerrings)
    : undefined;

  const state = deepClone(template.buildBaseState(slots));
  root.apply(state, slots);
  herring?.apply(state, slots);

  const sev = template.severity;
  const maxHp = sev === 1 ? 100 : sev === 2 ? 80 : 60;

  return {
    instanceId: `inc-${opts.seed.toString(16)}`,
    templateId: template.id,
    seed: opts.seed,
    title: fillTemplate(template.title, slots),
    severity: template.severity,
    domain: template.domain,
    environment: `${slots.region} · ${slots.service}`,
    brief: fillTemplate(template.brief, slots),
    logSnippet: fillTemplate(template.logSnippet, slots),
    skillTags: [...template.skillTags],
    requiredSkills: [...template.requiredSkills],
    state,
    revealed: [],
    productionHp: 100,
    productionMaxHp: 100,
    incidentHp: maxHp,
    incidentMaxHp: maxHp,
    win: deepClone(template.win),
    resumeBullet: fillTemplate(template.resumeBullet, slots),
    hint: fillTemplate(template.hint, slots),
    rootCauseId: root.id,
    redHerringId: herring?.id,
    resolved: false,
    failed: false,
    turns: 0,
    campaign: Boolean(opts.campaign),
  };
}

export function pickEndlessTemplate(
  seed: number,
  skills: string[],
  weakDomain?: Incident["domain"],
): IncidentTemplate {
  const rng = createRng(seed);
  const unlocked = TEMPLATES.filter((t) =>
    t.requiredSkills.every((s) => skills.includes(s)),
  );
  const pool = unlocked.length ? unlocked : TEMPLATES;
  if (weakDomain && rng() < 0.55) {
    const domainPool = pool.filter((t) => t.domain === weakDomain);
    if (domainPool.length) return pick(rng, domainPool);
  }
  return pick(rng, pool);
}
