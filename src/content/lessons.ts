import type { Lesson } from "../types";

export const LESSONS: Lesson[] = [
  {
    id: "hub-orientation",
    zone: "hub",
    skill: "help-basics",
    questId: "onboarding",
    title: "How a Shift Works",
    body: [
      "You walk the Ops HQ with WASD (or arrows). Press E to talk or use a console.",
      "Training kiosks teach one AZ-400 idea, then unlock CLI moves. Server racks start incidents.",
      "Incidents are turn-based: diagnose first, then fix. Guessing a restart without evidence can hurt production HP.",
    ],
    quiz: {
      q: "What should you do before applying a production fix?",
      choices: [
        "Restart every deployment in the region",
        "Diagnose with evidence from the CLI / brief",
        "Delete the namespace to clear bad state",
        "Increase replica count immediately",
      ],
      answer: 1,
    },
  },
  {
    id: "boards-flow-lesson",
    zone: "boards",
    skill: "boards-flow",
    questId: "boards-flow",
    title: "GitHub Flow + Azure Boards",
    body: [
      "GitHub Flow: short-lived branches, PRs into main, review, then deploy from main.",
      "Traceability means work items (Azure Boards or GitHub Issues) are linked to commits and PRs.",
      "az boards work-item show and PR checklists prove a change has an owner and an acceptance path.",
    ],
    quiz: {
      q: "Which practice best supports source-to-work-item traceability?",
      choices: [
        "Commit directly to main with a witty message",
        "Link every PR to a Boards work item or GitHub Issue",
        "Keep requirements only in a slide deck",
        "Use a separate untracked spreadsheet of ticket IDs",
      ],
      answer: 1,
    },
  },
  {
    id: "boards-metrics-lesson",
    zone: "boards",
    skill: "boards-metrics",
    questId: "boards-metrics",
    title: "Flow Metrics that Matter",
    body: [
      "Cycle time: start of work → production. Lead time: request → production. MTTR: detect → recover.",
      "Dashboards should show the system (queues, wait time), not individual heroics.",
      "AZ-400 expects you to design metrics for planning, development, testing, security, delivery, and operations.",
    ],
    quiz: {
      q: "MTTR is best described as:",
      choices: [
        "Mean time between sprint planning meetings",
        "Mean time to recover after an incident is detected",
        "Maximum tickets remaining",
        "Minutes to rebase a feature branch",
      ],
      answer: 1,
    },
  },
  {
    id: "git-branch-lesson",
    zone: "repos",
    skill: "git-basics",
    questId: "repos-branching",
    title: "Trunk-Based Development",
    body: [
      "Trunk-based: main is always releasable. Feature branches are short-lived.",
      "Gitflow (develop + release + hotfix branches) adds lag — know when NOT to use it.",
      "git status / git log are how you inspect local truth before you touch policies.",
    ],
    quiz: {
      q: "Which branching strategy keeps main continuously releasable with short-lived branches?",
      choices: [
        "Gitflow with a long-lived develop branch",
        "Trunk-based development",
        "Per-environment forever branches",
        "Emailing zip files of source",
      ],
      answer: 1,
    },
  },
  {
    id: "policy-lesson",
    zone: "repos",
    skill: "branch-policies",
    questId: "repos-policies",
    title: "Branch Policies & Protection",
    body: [
      "Azure Repos policies and GitHub rulesets: required reviewers, build validation, deny force push.",
      "Minimum reviewers + linked work items + a green CI build is the default AZ-400 answer.",
      "Recovering leaked secrets may need history rewrite (filter-repo) plus rotation — revert is not enough if the secret was pushed.",
    ],
    quiz: {
      q: "A required reviewer policy on main is primarily meant to:",
      choices: [
        "Slow developers down for its own sake",
        "Enforce peer review before merge and keep main releasable",
        "Replace automated tests",
        "Block Git LFS",
      ],
      answer: 1,
    },
  },
  {
    id: "yaml-lesson",
    zone: "pipelines",
    skill: "yaml-pipelines",
    questId: "pipelines-yaml",
    title: "YAML Pipelines & Gates",
    body: [
      "Prefer YAML over classic. Use templates, variable groups, and environment checks/approvals.",
      "Triggers: CI on PR, CD on main, plus path filters and schedules.",
      "Gates: tests, coverage, security scans, and manual approvals on production environments.",
    ],
    quiz: {
      q: "Where should production approvals live in modern Azure Pipelines?",
      choices: [
        "In a classic UI release only",
        "As environment checks on a YAML-based environment",
        "In a README that people might read",
        "Hard-coded sleep tasks",
      ],
      answer: 1,
    },
  },
  {
    id: "k8s-lesson",
    zone: "pipelines",
    skill: "kubectl-basics",
    questId: "pipelines-aks",
    title: "AKS, Ingress, and 502s",
    body: [
      "Ingress controllers route HTTP(S) into cluster services. 502 often means upstream or TLS/secret failure — not 'the cluster is down'.",
      "Order: kubectl get pods → logs → describe/secret → fix config → rollout restart.",
      "Restarting without rotating an expired TLS secret just recreates the crash loop.",
    ],
    quiz: {
      q: "Pods in CrashLoopBackOff after a TLS error. Best next step?",
      choices: [
        "kubectl delete namespace --all",
        "Inspect logs/secrets, fix the expired TLS material, then rollout",
        "Scale the node pool to 100",
        "Disable ingress and hope DNS saves you",
      ],
      answer: 1,
    },
  },
  {
    id: "deploy-lesson",
    zone: "pipelines",
    skill: "deployments",
    questId: "pipelines-deploy",
    title: "Blue-Green, Slots, Canary",
    body: [
      "App Service deployment slots: deploy to staging, warm up, swap. Rollback = swap back.",
      "AKS: rolling, blue-green (two services), canary (weighted ingress), rings, feature flags (App Configuration).",
      "Hotfix path: keep a fast slot/ring so Sev-1 code fixes skip the full carnival.",
    ],
    quiz: {
      q: "A slot swap is useful because it:",
      choices: [
        "Deletes the previous production code forever",
        "Lets you warm a staging slot then atomically swap, with easy swap-back rollback",
        "Avoids needing tests",
        "Only works for on-prem IIS",
      ],
      answer: 1,
    },
  },
  {
    id: "bicep-lesson",
    zone: "pipelines",
    skill: "bicep-iac",
    questId: "pipelines-iac",
    title: "Bicep Desired State",
    body: [
      "IaC: Bicep/ARM (Azure-native), plus Terraform in the real world. Store templates in Git and test them in the pipeline.",
      "what-if previews destructive changes. Failed deploys are often SKU, region, or parameter mismatches.",
      "Desired state configuration should be automated — not click-ops in the portal.",
    ],
    quiz: {
      q: "Before applying a Bicep change to production you should:",
      choices: [
        "Run az deployment group what-if and review diffs",
        "Apply twice to be sure",
        "Only use the portal so it is 'visible'",
        "Disable resource locks always",
      ],
      answer: 0,
    },
  },
  {
    id: "kv-lesson",
    zone: "security",
    skill: "keyvault-secrets",
    questId: "security-secrets",
    title: "Key Vault & Secretless Pipelines",
    body: [
      "Store secrets in Key Vault. Prefer workload identity / OIDC over PATs and client secrets in variable groups.",
      "Set expirations and rotate. Pipelines should reference Key Vault, not paste values into YAML.",
      "Managed identities (system or user assigned) beat service principals when the workload runs on Azure.",
    ],
    quiz: {
      q: "The AZ-400-preferred way to authenticate a GitHub Action to Azure is:",
      choices: [
        "A 10-year client secret in repo variables",
        "Workload identity federation (OIDC) with a federated credential",
        "Emailing a PAT to the intern",
        "Putting the secret in the workflow YAML as a default",
      ],
      answer: 1,
    },
  },
  {
    id: "oidc-lesson",
    zone: "security",
    skill: "oidc-federation",
    questId: "security-oidc",
    title: "OIDC Subjects & GHAS",
    body: [
      "Federated credential subject must match the GitHub repo/environment (repo:org/name:environment:prod).",
      "GHAS: secret scanning, CodeQL, Dependabot. Defender for Cloud DevOps Security aggregates that signal.",
      "If a secret leaked, rotate it AND purge history — scanning alone is not a fix.",
    ],
    quiz: {
      q: "A GitHub OIDC login fails with AADSTS70021. Most likely cause?",
      choices: [
        "The federated credential subject does not match the workflow's repo/environment",
        "YAML indentation",
        "AKS node image is stale",
        "Boards iteration path",
      ],
      answer: 0,
    },
  },
  {
    id: "kql-lesson",
    zone: "observability",
    skill: "kql-basics",
    questId: "observe-kql",
    title: "Monitor, Insights, KQL",
    body: [
      "App Insights: requests, dependencies, exceptions, traces. Container Insights for AKS node/pod metrics.",
      "KQL example: exceptions | where timestamp > ago(1h) | summarize count() by type, bin(timestamp, 5m)",
      "Distributed tracing (operation_Id) beats grepping random VM logs.",
    ],
    quiz: {
      q: "Which KQL snippet counts exceptions in the last hour?",
      choices: [
        "SELECT * FROM exceptions",
        "exceptions | where timestamp > ago(1h) | summarize count() by type",
        "console.log(errors)",
        "kubectl logs --kql",
      ],
      answer: 1,
    },
  },
  {
    id: "alert-lesson",
    zone: "observability",
    skill: "pipeline-alerts",
    questId: "observe-alerts",
    title: "Alert on Failed Runs",
    body: [
      "Instrument GitHub Actions and Azure Pipelines: notify on failed, long-running, or flaky runs.",
      "Azure Monitor metric alerts + action groups (Teams/email/webhook). GitHub: Actions notifications and repo insights.",
      "If nobody is paged, it is not a monitored system.",
    ],
    quiz: {
      q: "A pipeline that fails silently overnight is missing:",
      choices: [
        "More YAML comments",
        "An alert/action group (or GitHub notification) on failed runs",
        "A second self-hosted agent in the same subnet",
        "CalVer tags",
      ],
      answer: 1,
    },
  },
];

export function lessonsForZone(zone: Lesson["zone"]): Lesson[] {
  return LESSONS.filter((l) => l.zone === zone);
}
