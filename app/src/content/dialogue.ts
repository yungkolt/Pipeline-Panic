import type { GameSave } from "../types";
import { isActive, isAvailable, isCompleted, nextObjective } from "../progress/quests";

export interface DialogueSession {
  speaker: string;
  role: string;
  lines: string[];
  onComplete?: (save: GameSave) => void;
  startQuest?: string;
  completeStep?: { questId: string; stepId: string };
}

export function npcDialogue(npcId: string, save: GameSave): DialogueSession {
  switch (npcId) {
    case "riley":
      return riley(save);
    case "maya":
      return maya(save);
    case "glen":
      return glen(save);
    case "priya":
      return priya(save);
    case "nate":
      return nate(save);
    case "sofia":
      return sofia(save);
    case "omar":
      return omar(save);
    default:
      return {
        speaker: "Someone",
        role: "NPC",
        lines: ["..."],
      };
  }
}

function riley(save: GameSave): DialogueSession {
  if (isAvailable(save, "onboarding") || (isActive(save, "onboarding") && !save.quests.onboarding.steps["talk-riley"])) {
    return {
      speaker: "Riley",
      role: "Reception · Intern wrangler",
      lines: [
        "Badge printer's jammed, so you're going in as Intern Cloud Engineer. Congrats.",
        "WASD to walk. E to interact. Kiosks teach. Racks catch fire. Terminal on the right is your Poké— your runbook.",
        "Hit the Hub kiosk, then we'll talk domains. AZ-400 isn't a multiple-choice vibe. It's 'why is prod 502'.",
      ],
      startQuest: "onboarding",
      completeStep: { questId: "onboarding", stepId: "talk-riley" },
    };
  }
  if (isActive(save, "onboarding")) {
    return {
      speaker: "Riley",
      role: "Reception",
      lines: ["Kiosk first. Then you may look at a server without summoning an outage."],
    };
  }
  if (isAvailable(save, "capstone") || isActive(save, "capstone")) {
    return {
      speaker: "Riley",
      role: "Reception",
      lines: [
        "Five badges. YAML scars. You didn't page me once with a screenshot of the portal. I'm proud-ish.",
        "Arm the red pager when you're ready. Endless On-Call generates fresh incidents forever. Study loop, not a boss fight.",
      ],
      startQuest: "capstone",
      completeStep: { questId: "capstone", stepId: "talk-riley-capstone" },
    };
  }
  if (save.endlessUnlocked) {
    return {
      speaker: "Riley",
      role: "Reception",
      lines: [
        "Pager's live. Weak domains spawn more incidents — that's spaced repetition with worse lighting.",
        "Don't forget: diagnose, then fix. Restart is not a personality.",
      ],
    };
  }
  return {
    speaker: "Riley",
    role: "Reception",
    lines: [
      "Orientation's done. Walk the glowing cyan doorways — they are the only holes in the walls.",
      "Northwest: Maya in Boards (green). Northeast: Glen in Repos (blue). South: Priya in the big purple Pipelines arena.",
      `Next on the board: ${nextObjective(save)}`,
    ],
  };
}

function maya(save: GameSave): DialogueSession {
  if (!isCompleted(save, "onboarding") && !isActive(save, "boards-flow") && !isAvailable(save, "boards-flow")) {
    return {
      speaker: "Maya",
      role: "Boards · Flow of work",
      lines: ["Finish orientation with Riley. I don't assign work items to ghosts."],
    };
  }
  if (!save.quests["boards-flow"].steps["talk-maya"]) {
    return {
      speaker: "Maya",
      role: "Boards · Flow of work",
      lines: [
        "GitHub Flow: branch, PR, review, merge to main. Azure Boards tracks the why.",
        "If a PR has no work item, auditors invent a personality for you. Take the kiosk, then fix the unlinked PR rack.",
      ],
      startQuest: "boards-flow",
      completeStep: { questId: "boards-flow", stepId: "talk-maya" },
    };
  }
  if (!isCompleted(save, "boards-flow")) {
    return {
      speaker: "Maya",
      role: "Boards",
      lines: ["Kiosk, then the red rack. az boards work-item show, then relation add."],
    };
  }
  if (!save.quests["boards-metrics"]?.steps["talk-maya-2"]) {
    return {
      speaker: "Maya",
      role: "Boards · Metrics",
      lines: [
        "Leadership wants cycle time, not a burn-down of your sleep.",
        "MTTR, lead time, flow. Then someone broke the Teams webhook — notifications are part of the feedback cycle.",
      ],
      startQuest: "boards-metrics",
      completeStep: { questId: "boards-metrics", stepId: "talk-maya-2" },
    };
  }
  return {
    speaker: "Maya",
    role: "Boards",
    lines: ["Dashboards don't page people. Webhooks do. Keep both honest."],
  };
}

function glen(save: GameSave): DialogueSession {
  if (!isCompleted(save, "onboarding")) {
    return {
      speaker: "Glen",
      role: "Repos · Source control",
      lines: ["Badge first. I don't debug intern git config until Riley signs the waiver."],
    };
  }
  if (!save.quests["repos-branching"].steps["talk-glen"]) {
    return {
      speaker: "Glen",
      role: "Repos · Source control",
      lines: [
        "Trunk-based. Main is always releasable. Feature branches should be shorter than a stand-up.",
        "Kiosk, then hit the workstation with git status so I know you can see a repo.",
      ],
      startQuest: "repos-branching",
      completeStep: { questId: "repos-branching", stepId: "talk-glen" },
    };
  }
  if (!isCompleted(save, "repos-branching")) {
    return {
      speaker: "Glen",
      role: "Repos",
      lines: ["Train, then git status on any incident or the desk. I need the inspect step checked."],
    };
  }
  if (!save.quests["repos-policies"]?.steps["talk-glen-2"]) {
    return {
      speaker: "Glen",
      role: "Repos · Policies",
      lines: [
        "Someone yeeted required reviewers off main. That's not 'moving fast'. That's vandalism.",
        "Policies: reviewers, build validation, no force-push. If a PAT hits git, rotate AND purge history.",
      ],
      startQuest: "repos-policies",
      completeStep: { questId: "repos-policies", stepId: "talk-glen-2" },
    };
  }
  return {
    speaker: "Glen",
    role: "Repos",
    lines: ["Revert is not a time machine for secrets. filter-repo plus rotation. Write that on your badge."],
  };
}

function priya(save: GameSave): DialogueSession {
  if (!isCompleted(save, "repos-policies") && !isAvailable(save, "pipelines-yaml") && !isActive(save, "pipelines-yaml")) {
    return {
      speaker: "Priya",
      role: "Pipelines · CI/CD",
      lines: ["Repos policies first. I don't let unprotected main into YAML."],
    };
  }
  if (!save.quests["pipelines-yaml"].steps["talk-priya"]) {
    return {
      speaker: "Priya",
      role: "Pipelines · CI/CD",
      lines: [
        "Classic pipelines are a jump scare. YAML, templates, environment checks.",
        "Half of AZ-400 is this room. Take the kiosk. Then unbreak the CI compile.",
      ],
      startQuest: "pipelines-yaml",
      completeStep: { questId: "pipelines-yaml", stepId: "talk-priya" },
    };
  }
  if (!isCompleted(save, "pipelines-yaml")) {
    return {
      speaker: "Priya",
      role: "Pipelines",
      lines: ["az pipelines show, fix vmImage or template path, then az pipelines run."],
    };
  }
  if (isActive(save, "pipelines-aks") || isAvailable(save, "pipelines-aks")) {
    if (!isCompleted(save, "pipelines-aks")) {
      return {
        speaker: "Priya",
        role: "Pipelines · AKS",
        lines: [
          "Sev-1. Ingress 502. Don't restart as a personality trait.",
          "Kiosk for kubectl, then the big red rack. Logs before rollouts.",
        ],
        startQuest: "pipelines-aks",
      };
    }
  }
  if (!save.quests["pipelines-deploy"]?.steps["talk-priya-2"] && (isAvailable(save, "pipelines-deploy") || isActive(save, "pipelines-deploy") || isCompleted(save, "pipelines-aks"))) {
    if (isCompleted(save, "pipelines-aks") && !isCompleted(save, "pipelines-deploy")) {
      return {
        speaker: "Priya",
        role: "Pipelines · Deploy",
        lines: [
          "Blue-green via App Service slots. Warm staging, swap, swap back if you mess up.",
          "That's your hotfix path. Canary and rings are the grown-up version.",
        ],
        startQuest: "pipelines-deploy",
        completeStep: { questId: "pipelines-deploy", stepId: "talk-priya-2" },
      };
    }
  }
  return {
    speaker: "Priya",
    role: "Pipelines",
    lines: ["Gates exist so prod doesn't meet your vibes. Nate has the Bicep dumpster fire when you're ready."],
  };
}

function nate(save: GameSave): DialogueSession {
  if (!isCompleted(save, "pipelines-deploy") && !isAvailable(save, "pipelines-iac")) {
    return {
      speaker: "Nate",
      role: "IaC · Bicep",
      lines: ["Slot swaps first. I don't what-if for people who still click-ops App Service."],
    };
  }
  if (!save.quests["pipelines-iac"]?.steps["talk-nate"]) {
    return {
      speaker: "Nate",
      role: "IaC · Bicep",
      lines: [
        "Desired state. Git. what-if. Then create.",
        "SKU P5 is a fictional flex. Use a SKU the region actually has. Parameters from Key Vault, not Slack.",
      ],
      startQuest: "pipelines-iac",
      completeStep: { questId: "pipelines-iac", stepId: "talk-nate" },
    };
  }
  return {
    speaker: "Nate",
    role: "IaC",
    lines: ["If what-if looks like a crime scene, do not apply. That's the whole certification."],
  };
}

function sofia(save: GameSave): DialogueSession {
  if (!isCompleted(save, "pipelines-yaml") && !isAvailable(save, "security-secrets")) {
    return {
      speaker: "Sofia",
      role: "Security Vault",
      lines: ["Come back after YAML. I don't hand Key Vault to people who store secrets in pipeline variables named 'password2'."],
    };
  }
  if (!save.quests["security-secrets"]?.steps["talk-sofia"]) {
    return {
      speaker: "Sofia",
      role: "Security · Secrets",
      lines: [
        "Expired secret, pipeline down. Key Vault with expiry beats a PAT in YAML.",
        "Managed identity when you can. OIDC for GitHub Actions. Kiosk, then rotate.",
      ],
      startQuest: "security-secrets",
      completeStep: { questId: "security-secrets", stepId: "talk-sofia" },
    };
  }
  if (!isCompleted(save, "security-secrets")) {
    return {
      speaker: "Sofia",
      role: "Security",
      lines: ["az keyvault secret show, then set. Don't screenshot the value into Teams."],
    };
  }
  if (!save.quests["security-oidc"]?.steps["talk-sofia-2"]) {
    return {
      speaker: "Sofia",
      role: "Security · OIDC + GHAS",
      lines: [
        "AADSTS70021 means the federated subject is a liar. Match repo and environment.",
        "GHAS + Defender for Cloud DevOps Security: fix Dependabot and CodeQL, don't swipe away the toast.",
      ],
      startQuest: "security-oidc",
      completeStep: { questId: "security-oidc", stepId: "talk-sofia-2" },
    };
  }
  return {
    speaker: "Sofia",
    role: "Security",
    lines: ["Secretless or it didn't happen. Client secrets are how horror movies start."],
  };
}

function omar(save: GameSave): DialogueSession {
  if (!isCompleted(save, "pipelines-aks") && !isAvailable(save, "observe-kql")) {
    return {
      speaker: "Omar",
      role: "SRE · Observability",
      lines: ["AKS 502 first. I won't teach KQL until you've looked at a real log line."],
    };
  }
  if (!save.quests["observe-kql"]?.steps["talk-omar"]) {
    return {
      speaker: "Omar",
      role: "SRE · KQL",
      lines: [
        "App Insights is not a fireplace. Query it.",
        "exceptions | where timestamp > ago(1h) | summarize count() by type. Then mitigate with evidence.",
      ],
      startQuest: "observe-kql",
      completeStep: { questId: "observe-kql", stepId: "talk-omar" },
    };
  }
  if (!isCompleted(save, "observe-kql")) {
    return {
      speaker: "Omar",
      role: "SRE",
      lines: ["Query, then az appconfig feature set to kill the bad flag. CPU graphs are a red herring today."],
    };
  }
  if (!save.quests["observe-alerts"]?.steps["talk-omar-2"]) {
    return {
      speaker: "Omar",
      role: "SRE · Alerts",
      lines: [
        "Nightly pipeline failed. Humans noticed at standup. That's not instrumentation, that's folklore.",
        "Attach an action group. Page someone. AZ-400 calls this 'configure alerts for events in GitHub Actions and Azure Pipelines'.",
      ],
      startQuest: "observe-alerts",
      completeStep: { questId: "observe-alerts", stepId: "talk-omar-2" },
    };
  }
  return {
    speaker: "Omar",
    role: "SRE",
    lines: ["If nobody is paged, it is not a monitored system. Stick that on a mug."],
  };
}
