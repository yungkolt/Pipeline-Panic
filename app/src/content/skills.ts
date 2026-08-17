import type { SkillDef } from "../types";

export const SKILLS: SkillDef[] = [
  {
    id: "help-basics",
    name: "Ops Basics",
    domain: "hub",
    description: "Terminal hygiene, help, and reading an incident brief.",
    commands: ["help", "clear", "status", "runbook"],
  },
  {
    id: "boards-flow",
    name: "GitHub Flow & Boards",
    domain: "boards",
    description: "Work item traceability, GitHub Flow, and Azure Boards.",
    commands: ["az boards work-item show", "az boards query"],
  },
  {
    id: "boards-metrics",
    name: "Flow Metrics",
    domain: "boards",
    description: "Cycle time, lead time, and MTTR dashboards.",
    commands: ["az boards metrics"],
  },
  {
    id: "git-basics",
    name: "Git & Branching",
    domain: "repos",
    description: "Trunk-based vs feature branches, status, and log.",
    commands: ["git status", "git branch", "git log"],
  },
  {
    id: "branch-policies",
    name: "Branch Policies",
    domain: "repos",
    description: "PR reviewers, build validation, and protection rules.",
    commands: ["az repos policy list", "az repos policy update"],
  },
  {
    id: "git-recover",
    name: "Git Recovery",
    domain: "repos",
    description: "Revert, restore, and purge leaked secrets from history.",
    commands: ["git revert", "git restore", "git filter-repo"],
  },
  {
    id: "yaml-pipelines",
    name: "YAML Pipelines",
    domain: "pipelines",
    description: "Azure Pipelines YAML, triggers, and templates.",
    commands: ["az pipelines show", "az pipelines run"],
  },
  {
    id: "pipeline-gates",
    name: "Quality Gates",
    domain: "pipelines",
    description: "Test, coverage, and security gates on environments.",
    commands: ["az pipelines checks list", "az pipelines checks update"],
  },
  {
    id: "github-actions",
    name: "GitHub Actions",
    domain: "pipelines",
    description: "Workflows, runners, and Actions ↔ Azure integration.",
    commands: ["gh run list", "gh run view"],
  },
  {
    id: "kubectl-basics",
    name: "kubectl Basics",
    domain: "pipelines",
    description: "Inspect pods, logs, and deployments on AKS.",
    commands: ["kubectl get pods", "kubectl logs", "kubectl describe"],
  },
  {
    id: "aks-ingress",
    name: "AKS Ingress",
    domain: "pipelines",
    description: "NGINX ingress, TLS secrets, probes, and rollouts.",
    commands: ["kubectl get secret", "kubectl create secret", "kubectl rollout restart"],
  },
  {
    id: "deployments",
    name: "Deployment Strategies",
    domain: "pipelines",
    description: "Blue-green, slots, canary, and feature flags.",
    commands: ["az webapp deployment slot list", "az webapp deployment slot swap"],
  },
  {
    id: "bicep-iac",
    name: "Bicep / IaC",
    domain: "pipelines",
    description: "Desired-state deploys with Bicep and ARM.",
    commands: ["az deployment group show", "az deployment group what-if", "az deployment group create"],
  },
  {
    id: "keyvault-secrets",
    name: "Key Vault Secrets",
    domain: "security",
    description: "Rotate secrets, expirations, and pipeline secretless auth.",
    commands: ["az keyvault secret show", "az keyvault secret set"],
  },
  {
    id: "oidc-federation",
    name: "OIDC / Workload Identity",
    domain: "security",
    description: "Federated credentials instead of long-lived PATs.",
    commands: ["az ad app federated-credential list", "az ad app federated-credential create"],
  },
  {
    id: "entra-identities",
    name: "Entra Identities",
    domain: "security",
    description: "Managed identities vs service principals.",
    commands: ["az identity show", "az role assignment list"],
  },
  {
    id: "ghas-scanning",
    name: "GHAS & Defender",
    domain: "security",
    description: "Secret scanning, CodeQL, Dependabot, Defender for Cloud.",
    commands: ["gh secret-scanning list", "gh codeql list"],
  },
  {
    id: "azure-monitor",
    name: "Azure Monitor",
    domain: "observability",
    description: "App Insights, Container Insights, and alert rules.",
    commands: ["az monitor app-insights show", "az monitor metrics list"],
  },
  {
    id: "kql-basics",
    name: "KQL",
    domain: "observability",
    description: "Query traces, exceptions, and latency in Log Analytics.",
    commands: ["az monitor app-insights query"],
  },
  {
    id: "pipeline-alerts",
    name: "Pipeline Alerts",
    domain: "observability",
    description: "Failed-run notifications for Actions and Azure Pipelines.",
    commands: ["az monitor action-rule list", "az monitor metrics alert create"],
  },
];

export function skillById(id: string): SkillDef | undefined {
  return SKILLS.find((s) => s.id === id);
}

export function skillsForDomain(domain: SkillDef["domain"]): SkillDef[] {
  return SKILLS.filter((s) => s.domain === domain);
}
