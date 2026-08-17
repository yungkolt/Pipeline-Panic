import type { QuestDef } from "../types";

export const QUESTS: QuestDef[] = [
  {
    id: "onboarding",
    title: "Badge, Desk, Repeat",
    description:
      "Riley needs you oriented before anyone trusts you with production. Learn to walk the floor and open a kiosk.",
    steps: [
      { id: "talk-riley", text: "Talk to Riley at reception" },
      { id: "visit-kiosk", text: "Interact with the Hub training kiosk" },
    ],
    xp: 60,
  },
  {
    id: "boards-flow",
    title: "Trace the Work",
    domain: "boards",
    description:
      "Maya wants GitHub Flow wired to Azure Boards so every PR has a work item.",
    steps: [
      { id: "talk-maya", text: "Talk to Maya in Boards Wing" },
      { id: "train-boards", text: "Complete the Boards kiosk lesson" },
      { id: "incident-boards", text: "Fix the unlinked work-item incident" },
    ],
    unlockSkills: ["boards-flow"],
    requires: ["onboarding"],
    xp: 90,
  },
  {
    id: "boards-metrics",
    title: "Show the Flow",
    domain: "boards",
    description: "Design cycle-time and MTTR queries so leadership can see the system, not the heroics.",
    steps: [
      { id: "talk-maya-2", text: "Get the metrics brief from Maya" },
      { id: "train-metrics", text: "Pass the flow-metrics quiz" },
      { id: "incident-webhook", text: "Repair the Teams webhook integration" },
    ],
    unlockSkills: ["boards-metrics"],
    unlockBadge: "boards",
    requires: ["boards-flow"],
    xp: 100,
  },
  {
    id: "repos-branching",
    title: "Protect Main",
    domain: "repos",
    description: "Glen wants a trunk-based strategy with short-lived feature branches.",
    steps: [
      { id: "talk-glen", text: "Talk to Glen in Repos Wing" },
      { id: "train-git", text: "Complete the Git branching lesson" },
      { id: "inspect-repo", text: "Run git status on the CLI workstation" },
    ],
    unlockSkills: ["git-basics"],
    requires: ["onboarding"],
    xp: 90,
  },
  {
    id: "repos-policies",
    title: "No Force Pushes",
    domain: "repos",
    description: "Add required reviewers and build validation so main stays releasable.",
    steps: [
      { id: "talk-glen-2", text: "Review policy gaps with Glen" },
      { id: "train-policy", text: "Complete the branch-policy lesson" },
      { id: "incident-policy", text: "Restore the missing PR policy" },
    ],
    unlockSkills: ["branch-policies", "git-recover"],
    unlockBadge: "repos",
    requires: ["repos-branching"],
    xp: 110,
  },
  {
    id: "pipelines-yaml",
    title: "YAML or It Didn't Happen",
    domain: "pipelines",
    description: "Priya is done with classic pipelines. Learn YAML triggers and templates.",
    steps: [
      { id: "talk-priya", text: "Talk to Priya in Pipelines Arena" },
      { id: "train-yaml", text: "Complete the YAML pipeline lesson" },
      { id: "incident-yaml", text: "Unbreak the failing YAML pipeline" },
    ],
    unlockSkills: ["yaml-pipelines", "pipeline-gates", "github-actions"],
    requires: ["repos-policies"],
    xp: 120,
  },
  {
    id: "pipelines-aks",
    title: "502 at the Edge",
    domain: "pipelines",
    description: "Sev-1: AKS ingress is throwing 502s. Diagnose, then fix — don't just restart.",
    steps: [
      { id: "train-k8s", text: "Complete kubectl + ingress training" },
      { id: "incident-aks", text: "Resolve the AKS ingress outage" },
    ],
    unlockSkills: ["kubectl-basics", "aks-ingress"],
    requires: ["pipelines-yaml"],
    xp: 150,
  },
  {
    id: "pipelines-deploy",
    title: "Swap Without Sweat",
    domain: "pipelines",
    description: "Practice blue-green using App Service slots so hotfixes don't torch production.",
    steps: [
      { id: "talk-priya-2", text: "Get the deployment brief from Priya" },
      { id: "train-deploy", text: "Complete the deployment-strategy lesson" },
      { id: "incident-slot", text: "Recover the failed slot swap" },
    ],
    unlockSkills: ["deployments"],
    requires: ["pipelines-aks"],
    xp: 120,
  },
  {
    id: "pipelines-iac",
    title: "Desired State or Bust",
    domain: "pipelines",
    description: "Nate's Bicep deploy drifted. What-if, then apply.",
    steps: [
      { id: "talk-nate", text: "Talk to Nate about the failed Bicep run" },
      { id: "train-bicep", text: "Complete the IaC lesson" },
      { id: "incident-bicep", text: "Fix the Bicep parameter/SKU failure" },
    ],
    unlockSkills: ["bicep-iac"],
    unlockBadge: "pipelines",
    requires: ["pipelines-deploy"],
    xp: 130,
  },
  {
    id: "security-secrets",
    title: "No More PATs in YAML",
    domain: "security",
    description: "Sofia caught an expired Key Vault secret taking down a pipeline.",
    steps: [
      { id: "talk-sofia", text: "Talk to Sofia in the Security Vault" },
      { id: "train-kv", text: "Complete the Key Vault lesson" },
      { id: "incident-kv", text: "Rotate the expired secret" },
    ],
    unlockSkills: ["keyvault-secrets", "entra-identities"],
    requires: ["pipelines-yaml"],
    xp: 120,
  },
  {
    id: "security-oidc",
    title: "Federate or Perish",
    domain: "security",
    description: "Replace a leaked service principal secret with workload identity federation.",
    steps: [
      { id: "talk-sofia-2", text: "Review the OIDC failure with Sofia" },
      { id: "train-oidc", text: "Complete the OIDC / GHAS lesson" },
      { id: "incident-oidc", text: "Fix the federated credential subject" },
    ],
    unlockSkills: ["oidc-federation", "ghas-scanning"],
    unlockBadge: "security",
    requires: ["security-secrets"],
    xp: 140,
  },
  {
    id: "observe-kql",
    title: "Read the Traces",
    domain: "observability",
    description: "Omar wants exceptions queried in KQL, not guessed from Slack screenshots.",
    steps: [
      { id: "talk-omar", text: "Talk to Omar on the Observability Deck" },
      { id: "train-kql", text: "Complete the Monitor + KQL lesson" },
      { id: "incident-kql", text: "Find the exception spike with KQL" },
    ],
    unlockSkills: ["azure-monitor", "kql-basics"],
    requires: ["pipelines-aks"],
    xp: 110,
  },
  {
    id: "observe-alerts",
    title: "Page the Pipeline",
    domain: "observability",
    description: "Nobody knew the nightly deploy failed. Add an alert.",
    steps: [
      { id: "talk-omar-2", text: "Get the alert gap from Omar" },
      { id: "train-alerts", text: "Complete the pipeline-alerts lesson" },
      { id: "incident-alert", text: "Create the missing failure alert" },
    ],
    unlockSkills: ["pipeline-alerts"],
    unlockBadge: "observability",
    requires: ["observe-kql"],
    xp: 110,
  },
  {
    id: "capstone",
    title: "Go On-Call",
    description:
      "Riley signs off on your campus tour. Endless On-Call is unlocked — incidents never stop.",
    steps: [
      { id: "talk-riley-capstone", text: "Report back to Riley" },
      { id: "touch-pager", text: "Arm the on-call pager in the hub" },
    ],
    requires: [
      "boards-metrics",
      "repos-policies",
      "pipelines-iac",
      "security-oidc",
      "observe-alerts",
    ],
    xp: 200,
  },
];

export function questById(id: string): QuestDef | undefined {
  return QUESTS.find((q) => q.id === id);
}

export const BADGE_NAMES: Record<string, string> = {
  boards: "Boards Badge",
  repos: "Repos Badge",
  pipelines: "Pipelines Badge",
  security: "Security Badge",
  observability: "Observability Badge",
};
