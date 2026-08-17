import type { IncidentTemplate, SlotValues } from "../../types";

const regions = ["eastus", "westus2", "northeurope", "centralus"];
const services = [
  "frontend-shop",
  "checkout-api",
  "catalog-web",
  "billing-gateway",
  "ops-portal",
];

function interpolate(template: string, slots: SlotValues): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => slots[key] ?? `{${key}}`);
}

export function fillTemplate(text: string, slots: SlotValues): string {
  return interpolate(text, slots);
}

export const TEMPLATES: IncidentTemplate[] = [
  {
    id: "ingress-502",
    domain: "pipelines",
    skillTags: ["aks", "ingress", "secrets"],
    requiredSkills: ["kubectl-basics"],
    title: "INC-{service}: AKS Ingress 502",
    severity: 1,
    brief:
      "Users hitting {service} in {region} get intermittent 502 Bad Gateway. NGINX ingress pods are unhealthy.",
    logSnippet:
      "[error] upstream prematurely closed connection / TLS secret '{secretName}' failed to mount",
    hint: "Inspect pods and logs first. If the TLS secret is expired, rotate it before rollout restart — restart alone will crashloop again.",
    resumeBullet:
      "Diagnosed Sev-1 AKS ingress 502s on {service} ({region}) by tracing CrashLoopBackOff to TLS/secret or probe misconfig, then restoring a healthy rollout.",
    slotOptions: {
      service: services,
      region: regions,
      secretName: ["tls-ingress-secret", "wildcard-tls", "ingress-cert"],
      cluster: ["prod-cluster-eus", "prod-aks-core", "shop-aks"],
    },
    buildBaseState: (slots) => ({
      cluster: { name: slots.cluster, region: slots.region, powerState: "Running" },
      namespace: "ingress-basic",
      pods: [
        {
          name: "nginx-ingress-controller-7598b-8xw22",
          ready: "0/1",
          status: "CrashLoopBackOff",
          restarts: 12,
        },
        {
          name: `${slots.service}-6489-abc`,
          ready: "1/1",
          status: "Running",
          restarts: 0,
        },
      ],
      logs: {
        ingress:
          "[ERROR] upstream prematurely closed connection while reading response header from upstream",
      },
      secrets: {
        [slots.secretName]: { expired: false, exists: true },
      },
      ingress: { healthy: false, error: "502" },
      probes: { readinessTimeout: 1 },
      annotations: { proxyReadTimeout: "5" },
      nodes: { pressure: false },
      quota: { exceeded: false },
      rootCause: "",
    }),
    rootCauses: [
      {
        id: "expiredTlsSecret",
        label: "Expired TLS secret",
        apply: (state, slots) => {
          const secrets = state.secrets as Record<string, { expired: boolean }>;
          secrets[slots.secretName].expired = true;
          (state.logs as Record<string, string>).ingress +=
            `\n[WARN] Secret '${slots.secretName}' expired or invalid mounting path.`;
          state.rootCause = "expiredTlsSecret";
        },
      },
      {
        id: "badProbe",
        label: "Readiness probe too aggressive",
        apply: (state) => {
          state.probes = { readinessTimeout: 1 };
          (state.logs as Record<string, string>).ingress +=
            "\n[WARN] Readiness probe failed: timeout after 1s (upstream warmup 3s).";
          state.rootCause = "badProbe";
        },
      },
      {
        id: "upstreamTimeout",
        label: "Proxy read timeout too low",
        apply: (state) => {
          state.annotations = { proxyReadTimeout: "5" };
          (state.logs as Record<string, string>).ingress +=
            "\n[WARN] upstream timed out (5s) waiting for {service} headers.";
          state.rootCause = "upstreamTimeout";
        },
      },
    ],
    redHerrings: [
      {
        id: "nodePressure",
        apply: (state) => {
          state.nodes = { pressure: true };
        },
      },
      {
        id: "quota",
        apply: (state) => {
          state.quota = { exceeded: false, warning: "90% CPU on one noisy neighbor (not causal)" };
        },
      },
    ],
    win: {
      type: "all",
      conditions: [
        { type: "eq", path: "ingress.healthy", value: true },
        { type: "eq", path: "pods.0.status", value: "Running" },
      ],
    },
  },
  {
    id: "yaml-var-break",
    domain: "pipelines",
    skillTags: ["yaml", "variables", "templates"],
    requiredSkills: ["yaml-pipelines"],
    title: "INC-{service}: YAML pipeline broken",
    severity: 2,
    brief:
      "The {service} CI pipeline in {region} fails on every PR. Template or variable group looks wrong.",
    logSnippet:
      "##[error] The pipeline is missing a variable 'vmImage' / template path azure-pipelines/build.yml not found",
    hint: "az pipelines show, then inspect variables. A missing vmImage or broken template path will fail before any test runs.",
    resumeBullet:
      "Restored a failing Azure Pipelines YAML for {service} by correcting template paths and variable groups used as quality gates.",
    slotOptions: {
      service: services,
      region: regions,
      pipeline: ["ci-build", "pr-validation", "release-app"],
    },
    buildBaseState: (slots) => ({
      pipeline: {
        name: `${slots.service}-${slots.pipeline}`,
        status: "failed",
        yamlError: true,
        vmImage: "",
        templatePath: "azure-pipelines/missing.yml",
        gates: { tests: "skipped", security: "notRun" },
      },
      rootCause: "",
    }),
    rootCauses: [
      {
        id: "missingVmImage",
        label: "Empty vmImage variable",
        apply: (state) => {
          const p = state.pipeline as Record<string, unknown>;
          p.vmImage = "";
          p.yamlError = true;
          state.rootCause = "missingVmImage";
        },
      },
      {
        id: "badTemplatePath",
        label: "Wrong template path",
        apply: (state) => {
          const p = state.pipeline as Record<string, unknown>;
          p.templatePath = "azure-pipelines/missing.yml";
          p.yamlError = true;
          state.rootCause = "badTemplatePath";
        },
      },
    ],
    redHerrings: [
      {
        id: "agentPoolBusy",
        apply: (state) => {
          state.agentPool = { queued: 2, note: "Queue exists but jobs fail at compile, not wait." };
        },
      },
    ],
    win: {
      type: "all",
      conditions: [
        { type: "eq", path: "pipeline.yamlError", value: false },
        { type: "eq", path: "pipeline.status", value: "succeeded" },
      ],
    },
  },
  {
    id: "gate-failed",
    domain: "pipelines",
    skillTags: ["gates", "tests", "security"],
    requiredSkills: ["pipeline-gates"],
    title: "INC-{service}: Production gate blocked",
    severity: 2,
    brief:
      "Release of {service} is stuck on the production environment. A quality or security gate is failing.",
    logSnippet:
      "Environment 'prod' check failed: coverage 42% (min 80%) OR Defender scan high severity",
    hint: "List environment checks. Don't bypass prod approvals — fix the failing gate (tests/coverage or scan).",
    resumeBullet:
      "Unblocked a YAML environment gate for {service} by remediating failing tests/coverage and security scans instead of skipping approvals.",
    slotOptions: {
      service: services,
      region: regions,
    },
    buildBaseState: () => ({
      pipeline: {
        name: "cd-prod",
        status: "waitingOnChecks",
        environment: "prod",
        gates: { tests: "failed", coverage: 42, security: "high", approval: "pending" },
      },
      rootCause: "",
    }),
    rootCauses: [
      {
        id: "coverage",
        label: "Coverage below gate",
        apply: (state) => {
          const g = (state.pipeline as Record<string, unknown>).gates as Record<string, unknown>;
          g.coverage = 42;
          g.tests = "failed";
          state.rootCause = "coverage";
        },
      },
      {
        id: "securityScan",
        label: "High severity scan",
        apply: (state) => {
          const g = (state.pipeline as Record<string, unknown>).gates as Record<string, unknown>;
          g.security = "high";
          g.tests = "passed";
          g.coverage = 88;
          state.rootCause = "securityScan";
        },
      },
    ],
    redHerrings: [
      {
        id: "approvalPersonOnPto",
        apply: (state) => {
          state.approver = { name: "Alex", status: "available", note: "Approval is not the blocker." };
        },
      },
    ],
    win: {
      type: "all",
      conditions: [
        { type: "eq", path: "pipeline.status", value: "succeeded" },
        { type: "eq", path: "pipeline.gates.approval", value: "approved" },
      ],
    },
  },
  {
    id: "slot-swap",
    domain: "pipelines",
    skillTags: ["slots", "blue-green", "appservice"],
    requiredSkills: ["deployments"],
    title: "INC-{service}: Slot swap failed",
    severity: 2,
    brief:
      "Blue-green swap for {service} in {region} left staging healthy but production on the bad slot.",
    logSnippet:
      "Swap failed: target slot 'production' sticky-setting mismatch / staging probe still 000",
    hint: "List slots, confirm staging is actually healthy, then swap. If production is wrong, swap back.",
    resumeBullet:
      "Recovered a failed App Service slot swap for {service} using blue-green warmup and atomic swap-back as the hotfix path.",
    slotOptions: {
      service: services,
      region: regions,
      app: ["shop-web", "ops-portal-app", "billing-ui"],
    },
    buildBaseState: (slots) => ({
      webapp: {
        name: slots.app,
        productionSlot: "bad-build",
        stagingSlot: "good-build",
        stagingHealthy: true,
        swapped: false,
      },
      rootCause: "",
    }),
    rootCauses: [
      {
        id: "swapAborted",
        label: "Swap aborted mid-flight",
        apply: (state) => {
          const w = state.webapp as Record<string, unknown>;
          w.productionSlot = "bad-build";
          w.stagingSlot = "good-build";
          w.swapped = false;
          state.rootCause = "swapAborted";
        },
      },
      {
        id: "stagingUnhealthy",
        label: "Staging never warmed",
        apply: (state) => {
          const w = state.webapp as Record<string, unknown>;
          w.stagingHealthy = false;
          w.stagingSlot = "good-build";
          state.rootCause = "stagingUnhealthy";
        },
      },
    ],
    redHerrings: [
      {
        id: "dnsTtl",
        apply: (state) => {
          state.dns = { ttl: 300, note: "TTL is fine; slot swap is Azure-side." };
        },
      },
    ],
    win: { type: "eq", path: "webapp.productionSlot", value: "good-build" },
  },
  {
    id: "bicep-fail",
    domain: "pipelines",
    skillTags: ["bicep", "iac", "sku"],
    requiredSkills: ["bicep-iac"],
    title: "INC-{service}: Bicep deploy failed",
    severity: 2,
    brief:
      "Infrastructure pipeline for {service} failed in {region}. Desired state did not apply.",
    logSnippet:
      "InvalidTemplate: SKU 'P5' not available in {region} / missing parameter sqlAdminPassword",
    hint: "Run what-if. Fix the SKU or missing parameter, then create the deployment. Don't portal-click around it.",
    resumeBullet:
      "Repaired a Bicep desired-state deployment for {service} by validating what-if diffs and correcting SKU/parameter errors in {region}.",
    slotOptions: {
      service: services,
      region: regions,
      rg: ["rg-shop-prod", "rg-ops-core", "rg-billing"],
    },
    buildBaseState: (slots) => ({
      deployment: {
        name: `${slots.service}-infra`,
        resourceGroup: slots.rg,
        status: "failed",
        sku: "P5",
        missingParam: true,
        whatIfClean: false,
      },
      rootCause: "",
    }),
    rootCauses: [
      {
        id: "badSku",
        label: "SKU not in region",
        apply: (state) => {
          const d = state.deployment as Record<string, unknown>;
          d.sku = "P5";
          d.missingParam = false;
          state.rootCause = "badSku";
        },
      },
      {
        id: "missingParam",
        label: "Missing secure parameter",
        apply: (state) => {
          const d = state.deployment as Record<string, unknown>;
          d.missingParam = true;
          d.sku = "P1v3";
          state.rootCause = "missingParam";
        },
      },
    ],
    redHerrings: [
      {
        id: "lock",
        apply: (state) => {
          state.lock = { level: "CanNotDelete", note: "Lock would block delete, not this SKU error." };
        },
      },
    ],
    win: { type: "eq", path: "deployment.status", value: "succeeded" },
  },
  {
    id: "branch-policy",
    domain: "repos",
    skillTags: ["policies", "pr", "reviewers"],
    requiredSkills: ["branch-policies"],
    title: "INC-{service}: Main is unprotected",
    severity: 2,
    brief:
      "Someone merged to main on {service} with zero reviewers. Branch policy drifted.",
    logSnippet: "policy evaluation: required reviewers = 0, build validation = off, force push = allowed",
    hint: "az repos policy list, then update: require reviewers and build validation. Deny force push.",
    resumeBullet:
      "Restored Azure Repos branch policies on {service} (required reviewers, build validation, no force-push) to keep main releasable.",
    slotOptions: {
      service: services,
      region: regions,
      repo: ["shop-src", "platform-api", "infra-bicep"],
    },
    buildBaseState: (slots) => ({
      repo: {
        name: slots.repo,
        defaultBranch: "main",
        requiredReviewers: 0,
        buildValidation: false,
        forcePush: true,
        protected: false,
      },
      rootCause: "",
    }),
    rootCauses: [
      {
        id: "reviewersZero",
        label: "Required reviewers removed",
        apply: (state) => {
          const r = state.repo as Record<string, unknown>;
          r.requiredReviewers = 0;
          r.buildValidation = true;
          state.rootCause = "reviewersZero";
        },
      },
      {
        id: "noBuildValidation",
        label: "Build validation disabled",
        apply: (state) => {
          const r = state.repo as Record<string, unknown>;
          r.requiredReviewers = 2;
          r.buildValidation = false;
          state.rootCause = "noBuildValidation";
        },
      },
    ],
    redHerrings: [
      {
        id: "lfs",
        apply: (state) => {
          state.lfs = { enabled: false, note: "LFS is unrelated to PR policy drift." };
        },
      },
    ],
    win: {
      type: "all",
      conditions: [
        { type: "eq", path: "repo.protected", value: true },
        { type: "neq", path: "repo.requiredReviewers", value: 0 },
        { type: "eq", path: "repo.buildValidation", value: true },
        { type: "eq", path: "repo.forcePush", value: false },
      ],
    },
  },
  {
    id: "secret-in-git",
    domain: "repos",
    skillTags: ["git", "secrets", "history"],
    requiredSkills: ["git-recover"],
    title: "INC-{service}: Secret committed to Git",
    severity: 1,
    brief:
      "GHAS flagged a PAT in {service} history. Revert is not enough — rotate and purge.",
    logSnippet: "secret scanning: azure-devops-pat in commit a1b2c3 on main",
    hint: "Identify the commit, rotate the PAT, then git filter-repo (or BFG) to purge history. A revert still leaves the secret in old commits.",
    resumeBullet:
      "Contained a leaked Azure DevOps PAT in {service} by rotating the credential and purging it from Git history rather than relying on revert alone.",
    slotOptions: {
      service: services,
      region: regions,
    },
    buildBaseState: () => ({
      repo: {
        secretInHead: true,
        secretInHistory: true,
        rotated: false,
        purged: false,
      },
      rootCause: "leakedPat",
    }),
    rootCauses: [
      {
        id: "leakedPat",
        label: "PAT in git history",
        apply: (state) => {
          state.rootCause = "leakedPat";
        },
      },
    ],
    redHerrings: [
      {
        id: "precommitMissing",
        apply: (state) => {
          state.hooks = { precommit: false, note: "Add hooks later; rotate first." };
        },
      },
    ],
    win: {
      type: "all",
      conditions: [
        { type: "eq", path: "repo.rotated", value: true },
        { type: "eq", path: "repo.purged", value: true },
        { type: "eq", path: "repo.secretInHistory", value: false },
      ],
    },
  },
  {
    id: "workitem-unlink",
    domain: "boards",
    skillTags: ["boards", "traceability", "github-flow"],
    requiredSkills: ["boards-flow"],
    title: "INC-{service}: PR missing work item",
    severity: 3,
    brief:
      "A production change for {service} shipped with no Boards work item. Auditors are not amused.",
    logSnippet: "PR #418 has 0 linked work items; AB# reference missing in commit message",
    hint: "Show the work item, then link the PR (az boards work-item relation add). Traceability is the gate.",
    resumeBullet:
      "Restored source-to-work-item traceability for {service} by linking Azure Boards items to GitHub/Azure Repos pull requests.",
    slotOptions: {
      service: services,
      region: regions,
      workItem: ["1842", "2201", "991"],
    },
    buildBaseState: (slots) => ({
      boards: {
        workItemId: slots.workItem,
        title: `Ship ${slots.service} checkout fix`,
        linkedPr: false,
        state: "Active",
      },
      rootCause: "unlinkedPr",
    }),
    rootCauses: [
      {
        id: "unlinkedPr",
        label: "PR not linked",
        apply: (state) => {
          state.rootCause = "unlinkedPr";
        },
      },
    ],
    redHerrings: [
      {
        id: "iterationPath",
        apply: (state) => {
          state.iteration = { path: "Shop\\Sprint 42", note: "Iteration is fine." };
        },
      },
    ],
    win: { type: "eq", path: "boards.linkedPr", value: true },
  },
  {
    id: "webhook-fail",
    domain: "boards",
    skillTags: ["webhooks", "teams", "integration"],
    requiredSkills: ["boards-metrics"],
    title: "INC-{service}: Teams webhook 401",
    severity: 3,
    brief:
      "Release notes and board updates for {service} no longer post to Teams. Webhook returns 401.",
    logSnippet: "POST https://outlook.office.com/webhook/... 401 Invalid webhook URL",
    hint: "The webhook secret/URL rotated. Update the Azure Boards / GitHub webhook configuration — don't disable notifications.",
    resumeBullet:
      "Repaired Azure Boards/GitHub → Microsoft Teams webhook integration for {service} so flow-of-work notifications resumed.",
    slotOptions: {
      service: services,
      region: regions,
    },
    buildBaseState: () => ({
      webhook: { status: 401, urlValid: false, teamsConnected: false },
      rootCause: "staleWebhook",
    }),
    rootCauses: [
      {
        id: "staleWebhook",
        label: "Stale webhook URL",
        apply: (state) => {
          state.rootCause = "staleWebhook";
        },
      },
    ],
    redHerrings: [
      {
        id: "teamsOutage",
        apply: (state) => {
          state.teams = { healthy: true, note: "Teams is up. Your webhook is not." };
        },
      },
    ],
    win: { type: "eq", path: "webhook.teamsConnected", value: true },
  },
  {
    id: "kv-expired",
    domain: "security",
    skillTags: ["keyvault", "secrets", "rotation"],
    requiredSkills: ["keyvault-secrets"],
    title: "INC-{service}: Key Vault secret expired",
    severity: 1,
    brief:
      "Pipeline for {service} fails at Azure login / connection string. Secret in vault '{vault}' is expired.",
    logSnippet: "Secret 'db-connection' is expired (nbf/exp). Operation get is forbidden after expiry.",
    hint: "az keyvault secret show, then set a new expiry. Pipelines should reference Key Vault — not a PAT in YAML.",
    resumeBullet:
      "Rotated an expired Azure Key Vault secret used by {service} pipelines and restored secret-based configuration without embedding credentials in YAML.",
    slotOptions: {
      service: services,
      region: regions,
      vault: ["kv-shop-prod", "kv-ops", "kv-billing"],
      secret: ["db-connection", "api-key", "storage-conn"],
    },
    buildBaseState: (slots) => ({
      keyvault: {
        name: slots.vault,
        secretName: slots.secret,
        expired: true,
        valueSet: true,
      },
      pipeline: { status: "failed", reason: "secretExpired" },
      rootCause: "expiredSecret",
    }),
    rootCauses: [
      {
        id: "expiredSecret",
        label: "Secret past exp",
        apply: (state) => {
          state.rootCause = "expiredSecret";
        },
      },
    ],
    redHerrings: [
      {
        id: "rbacDelay",
        apply: (state) => {
          state.rbac = { delay: false, note: "RBAC is consistent; expiry is the issue." };
        },
      },
    ],
    win: {
      type: "all",
      conditions: [
        { type: "eq", path: "keyvault.expired", value: false },
        { type: "eq", path: "pipeline.status", value: "succeeded" },
      ],
    },
  },
  {
    id: "oidc-mismatch",
    domain: "security",
    skillTags: ["oidc", "github-actions", "entra"],
    requiredSkills: ["oidc-federation"],
    title: "INC-{service}: OIDC federation mismatch",
    severity: 1,
    brief:
      "GitHub Actions cannot login to Azure for {service}. Federated credential subject does not match.",
    logSnippet:
      "AADSTS70021: No matching federated identity record found for presented assertion. Subject: repo:contoso/{service}:environment:production",
    hint: "List federated credentials. The subject must match repo:org/name:environment:production (or ref:refs/heads/main).",
    resumeBullet:
      "Repaired GitHub Actions workload identity federation for {service} by aligning the Entra federated credential subject with the workflow environment.",
    slotOptions: {
      service: services,
      region: regions,
      org: ["contoso", "fabrikam", "adventureworks"],
    },
    buildBaseState: (slots) => ({
      oidc: {
        app: `${slots.service}-gha`,
        expectedSubject: `repo:${slots.org}/${slots.service}:environment:production`,
        actualSubject: `repo:${slots.org}/${slots.service}:ref:refs/heads/dev`,
        matched: false,
      },
      rootCause: "subjectMismatch",
    }),
    rootCauses: [
      {
        id: "subjectMismatch",
        label: "Wrong federated subject",
        apply: (state) => {
          state.rootCause = "subjectMismatch";
        },
      },
    ],
    redHerrings: [
      {
        id: "oldClientSecret",
        apply: (state) => {
          state.legacySecret = { present: true, note: "A leftover client secret exists; OIDC is the path forward." };
        },
      },
    ],
    win: { type: "eq", path: "oidc.matched", value: true },
  },
  {
    id: "ghas-alert",
    domain: "security",
    skillTags: ["ghas", "codeql", "dependabot"],
    requiredSkills: ["ghas-scanning"],
    title: "INC-{service}: GHAS critical alert",
    severity: 2,
    brief:
      "GitHub Advanced Security + Defender for Cloud flagged a critical dependency in {service}.",
    logSnippet: "Dependabot: lodash 4.17.19 GHSA-critical. CodeQL: SQL injection in checkout.ts",
    hint: "Triage GHAS alerts. Bump the dependency and mark CodeQL as fixed — don't just dismiss in Defender.",
    resumeBullet:
      "Triaged GitHub Advanced Security alerts on {service}, patched a critical dependency, and closed the correlated Defender for Cloud DevOps finding.",
    slotOptions: {
      service: services,
      region: regions,
    },
    buildBaseState: () => ({
      ghas: {
        dependabotCritical: true,
        codeqlOpen: true,
        defenderSynced: true,
      },
      rootCause: "criticalDep",
    }),
    rootCauses: [
      {
        id: "criticalDep",
        label: "Critical Dependabot + CodeQL",
        apply: (state) => {
          state.rootCause = "criticalDep";
        },
      },
    ],
    redHerrings: [
      {
        id: "licenseInfo",
        apply: (state) => {
          state.license = { mit: true, note: "License scan is clean." };
        },
      },
    ],
    win: {
      type: "all",
      conditions: [
        { type: "eq", path: "ghas.dependabotCritical", value: false },
        { type: "eq", path: "ghas.codeqlOpen", value: false },
      ],
    },
  },
  {
    id: "kql-exceptions",
    domain: "observability",
    skillTags: ["kql", "appinsights", "tracing"],
    requiredSkills: ["kql-basics"],
    title: "INC-{service}: Exception spike",
    severity: 2,
    brief:
      "{service} in {region} is slow and 500ing. App Insights shows an exception spike — prove it with KQL.",
    logSnippet: "exceptions jumped 12x after 14:22 UTC. operation_Id correlated to /checkout",
    hint: "Run a KQL summarize on exceptions. Then restart or flag-off the bad dependency once you have evidence.",
    resumeBullet:
      "Used Azure Monitor KQL on Application Insights to isolate a {service} exception spike and restore the service from evidence, not guesswork.",
    slotOptions: {
      service: services,
      region: regions,
      app: ["shop-insights", "ops-ai", "billing-ai"],
    },
    buildBaseState: (slots) => ({
      monitor: {
        app: slots.app,
        exceptionRate: 12,
        queried: false,
        mitigated: false,
      },
      rootCause: "nullRefCheckout",
    }),
    rootCauses: [
      {
        id: "nullRefCheckout",
        label: "NullRef in checkout",
        apply: (state) => {
          state.rootCause = "nullRefCheckout";
        },
      },
    ],
    redHerrings: [
      {
        id: "vmCpu",
        apply: (state) => {
          state.infra = { cpu: 22, note: "VM CPU is calm. This is an app exception." };
        },
      },
    ],
    win: {
      type: "all",
      conditions: [
        { type: "eq", path: "monitor.queried", value: true },
        { type: "eq", path: "monitor.mitigated", value: true },
      ],
    },
  },
  {
    id: "pipeline-no-alert",
    domain: "observability",
    skillTags: ["alerts", "pipelines", "action-groups"],
    requiredSkills: ["pipeline-alerts"],
    title: "INC-{service}: Failed pipeline, nobody paged",
    severity: 3,
    brief:
      "Nightly deploy of {service} failed at 02:14. The first human noticed at 09:01. No alert fired.",
    logSnippet: "Azure Pipelines run 8821 failed. Action group 'oncall-devops' is not attached.",
    hint: "List action rules/alerts. Create a metric/activity alert on failed pipeline runs and attach the on-call action group.",
    resumeBullet:
      "Implemented Azure Monitor alerting on Azure Pipelines failures for {service} so the on-call action group is paged instead of discovering outages at standup.",
    slotOptions: {
      service: services,
      region: regions,
    },
    buildBaseState: () => ({
      alerts: {
        pipelineFailedAlert: false,
        actionGroup: "oncall-devops",
        attached: false,
      },
      rootCause: "noAlert",
    }),
    rootCauses: [
      {
        id: "noAlert",
        label: "No failed-run alert",
        apply: (state) => {
          state.rootCause = "noAlert";
        },
      },
    ],
    redHerrings: [
      {
        id: "emailRule",
        apply: (state) => {
          state.email = { digest: "weekly", note: "Weekly digest is not an on-call page." };
        },
      },
    ],
    win: { type: "eq", path: "alerts.attached", value: true },
  },
];

export function templateById(id: string): IncidentTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export const CAMPAIGN_INCIDENTS: Record<string, { templateId: string; rootCauseId: string }> = {
  "incident-boards": { templateId: "workitem-unlink", rootCauseId: "unlinkedPr" },
  "incident-webhook": { templateId: "webhook-fail", rootCauseId: "staleWebhook" },
  "incident-policy": { templateId: "branch-policy", rootCauseId: "reviewersZero" },
  "incident-yaml": { templateId: "yaml-var-break", rootCauseId: "missingVmImage" },
  "incident-aks": { templateId: "ingress-502", rootCauseId: "expiredTlsSecret" },
  "incident-slot": { templateId: "slot-swap", rootCauseId: "swapAborted" },
  "incident-bicep": { templateId: "bicep-fail", rootCauseId: "badSku" },
  "incident-kv": { templateId: "kv-expired", rootCauseId: "expiredSecret" },
  "incident-oidc": { templateId: "oidc-mismatch", rootCauseId: "subjectMismatch" },
  "incident-kql": { templateId: "kql-exceptions", rootCauseId: "nullRefCheckout" },
  "incident-alert": { templateId: "pipeline-no-alert", rootCauseId: "noAlert" },
};
