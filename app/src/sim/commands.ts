import type { CommandResult, GameSave, Incident } from "../types";
import { SKILLS } from "../content/skills";
import { getPath } from "./path";

export interface SimContext {
  raw: string;
  tokens: string[];
  skills: string[];
  incident: Incident | null;
  save: GameSave;
}

function norm(tokens: string[]): string[] {
  return tokens.map((t) => t.toLowerCase());
}

function has(ctx: SimContext, skill: string): boolean {
  return ctx.skills.includes(skill);
}

function blocked(skill: string): CommandResult {
  return {
    output: `Command locked. Complete training to unlock <span class="cmd">${skill}</span> first. Find the matching wing kiosk.`,
    skillBlocked: skill,
  };
}

function needIncident(): CommandResult {
  return {
    output:
      "No active incident. Walk to a <span class='cmd'>server rack</span> (or the on-call pager) and press E.",
    global: true,
  };
}

function flag(tokens: string[], name: string): string | undefined {
  const idx = tokens.findIndex(
    (t) => t === `--${name}` || t.startsWith(`--${name}=`),
  );
  if (idx < 0) return undefined;
  if (tokens[idx].includes("=")) return tokens[idx].split("=")[1];
  return tokens[idx + 1];
}

function reveal(id: string, text: string, extra?: Partial<CommandResult>): CommandResult {
  return { output: text, reveal: [id], damageIncident: 8, ...extra };
}

function podsTable(incident: Incident): string {
  const pods = getPath(incident.state, "pods") as
    | { name: string; ready: string; status: string; restarts: number }[]
    | undefined;
  if (!pods) return "No pod context in this incident. (Not an AKS scene.)";
  const ns = getPath(incident.state, "namespace") ?? "default";
  const rows = pods
    .map(
      (p) =>
        `${p.name.padEnd(44)} ${p.ready.padEnd(7)} ${p.status.padEnd(18)} ${p.restarts}`,
    )
    .join("<br>");
  return `NAMESPACE: ${ns}<br>NAME                                         READY   STATUS             RESTARTS<br>${rows}`;
}

export function runCommand(ctx: SimContext): CommandResult {
  const tokens = norm(ctx.tokens);
  const raw = ctx.raw.trim();
  if (!tokens[0]) {
    return { output: "", global: true };
  }

  if (tokens[0] === "help") {
    return helpCmd(ctx);
  }
  if (tokens[0] === "status") {
    return statusCmd(ctx);
  }
  if (tokens[0] === "runbook" || tokens[0] === "hint") {
    return runbookCmd(ctx);
  }
  if (tokens[0] === "skills") {
    const names = ctx.skills.join(", ");
    return { output: `Unlocked skills: ${names}`, global: true };
  }

  if (tokens[0] === "kubectl") return kubectlCmd(ctx, tokens);
  if (tokens[0] === "az") return azCmd(ctx, tokens);
  if (tokens[0] === "git") return gitCmd(ctx, tokens);
  if (tokens[0] === "gh") return ghCmd(ctx, tokens);

  return {
    output: `bash: ${escapeHtml(raw.split(" ")[0] ?? "")}: command not found. Type <span class="cmd">help</span>.`,
    global: true,
  };
}

function helpCmd(ctx: SimContext): CommandResult {
  const unlocked = SKILLS.filter((s) => ctx.skills.includes(s.id));
  const lines = unlocked
    .map((s) => `• <span class="cmd">${s.name}</span> — ${s.commands.join(", ")}`)
    .join("<br>");
  const extra = ctx.incident
    ? `<br><br>Active incident: <b>${escapeHtml(ctx.incident.title)}</b> (${ctx.incident.domain}). Diagnose, then fix. <span class="cmd">runbook</span> spends a hint.`
    : `<br><br>No incident loaded. Walk the HQ, train at kiosks, then use a server rack.`;
  return {
    output: `Unlocked runbooks:<br>${lines}${extra}`,
    global: true,
  };
}

function statusCmd(ctx: SimContext): CommandResult {
  const inc = ctx.incident;
  if (!inc) return needIncident();
  return {
    output: `Incident: ${escapeHtml(inc.title)}<br>Sev-${inc.severity} · ${inc.domain} · seed ${inc.seed}<br>Production HP: ${inc.productionHp}/${inc.productionMaxHp} · Incident HP: ${inc.incidentHp}/${inc.incidentMaxHp}<br>Revealed facts: ${inc.revealed.length ? inc.revealed.join(", ") : "(none)"}<br>Turns: ${inc.turns}`,
    global: true,
  };
}

function runbookCmd(ctx: SimContext): CommandResult {
  if (!ctx.incident) return needIncident();
  if (ctx.save.player.runbooks <= 0) {
    return { output: "No runbooks left. Train more or resolve incidents to earn them.", global: true };
  }
  return {
    output: `<span class="warn">Runbook consumed.</span> ${escapeHtml(ctx.incident.hint)}`,
    global: true,
    stateChanges: { __consumeRunbook: true },
  };
}

function kubectlCmd(ctx: SimContext, tokens: string[]): CommandResult {
  if (!has(ctx, "kubectl-basics") && !has(ctx, "aks-ingress")) {
    return blocked("kubectl-basics");
  }
  if (!ctx.incident) return needIncident();
  const inc = ctx.incident;
  const state = inc.state;

  if (tokens[1] === "get" && (tokens[2] === "pods" || tokens[2] === "pod")) {
    return reveal("pods", podsTable(inc));
  }
  if (tokens[1] === "get" && tokens[2] === "nodes") {
    const pressure = getPath(state, "nodes.pressure");
    return {
      output: pressure
        ? "NAME           STATUS   ROLES    AGE   VERSION<br>aks-node-1     Ready    agent    12d   v1.29.0  <span class='warn'>MemoryPressure (noisy neighbor — likely a red herring)</span>"
        : "NAME           STATUS   ROLES    AGE   VERSION<br>aks-node-1     Ready    agent    12d   v1.29.0<br>aks-node-2     Ready    agent    12d   v1.29.0",
      reveal: ["nodes"],
    };
  }
  if (tokens[1] === "logs") {
    const logs = getPath(state, "logs.ingress") as string | undefined;
    if (!logs) return { output: "No log stream bound. Try this on an ingress/AKS incident." };
    const root = String(getPath(state, "rootCause") ?? "");
    return reveal(root || "logs", `<span class="err">${escapeHtml(logs)}</span>`);
  }
  if (tokens[1] === "describe") {
    const root = String(getPath(state, "rootCause") ?? "");
    const secretName = Object.keys(
      (getPath(state, "secrets") as Record<string, unknown>) ?? {},
    )[0];
    return reveal(
      "describe",
      `Name: nginx-ingress-controller<br>Readiness timeout: ${getPath(state, "probes.readinessTimeout")}s<br>Secret: ${secretName ?? "n/a"} expired=${getPath(state, `secrets.${secretName}.expired`)}<br>Root-cause hint in events: ${root}`,
    );
  }
  if (tokens[1] === "get" && tokens[2] === "secret") {
    if (!has(ctx, "aks-ingress")) return blocked("aks-ingress");
    const secrets = (getPath(state, "secrets") as Record<string, { expired: boolean }>) ?? {};
    const rows = Object.entries(secrets)
      .map(([k, v]) => `${k}   kubernetes.io/tls   expired=${v.expired}`)
      .join("<br>");
    return reveal("secret", rows || "No secrets in state.");
  }
  if (tokens[1] === "create" && tokens[2] === "secret") {
    if (!has(ctx, "aks-ingress")) return blocked("aks-ingress");
    return rotateTls(inc);
  }
  if (tokens[1] === "delete" && tokens[2] === "secret") {
    if (!has(ctx, "aks-ingress")) return blocked("aks-ingress");
    return {
      output:
        "Secret deleted. Ingress still crashlooping until you <span class='cmd'>kubectl create secret tls ...</span> and rollout.",
      stateChanges: {},
      damageProduction: 8,
    };
  }
  if (tokens[1] === "rollout" && tokens[2] === "restart") {
    if (!has(ctx, "aks-ingress")) return blocked("aks-ingress");
    return rolloutIngress(inc);
  }
  if (tokens[1] === "set" && tokens[2] === "probe") {
    if (!has(ctx, "aks-ingress")) return blocked("aks-ingress");
    return {
      output: "Readiness probe timeout patched to 10s.",
      stateChanges: { "probes.readinessTimeout": 10 },
      damageIncident: 25,
    };
  }
  if (tokens[1] === "annotate") {
    if (!has(ctx, "aks-ingress")) return blocked("aks-ingress");
    return {
      output: "Ingress annotation nginx.ingress.kubernetes.io/proxy-read-timeout=60 applied.",
      stateChanges: { "annotations.proxyReadTimeout": "60" },
      damageIncident: 25,
    };
  }
  if (tokens[1] === "delete" && (tokens[2] === "pod" || tokens[2] === "pods")) {
    return {
      output:
        "<span class='err'>Pod deleted and rescheduled.</span> If the root cause is config/TLS, it will CrashLoop again. Production wobbles.",
      damageProduction: 20,
    };
  }

  return {
    output:
      "kubectl: not sure how to parse that. Try <span class='cmd'>kubectl get pods</span>, <span class='cmd'>kubectl logs deploy/nginx-ingress</span>, <span class='cmd'>kubectl rollout restart deploy/nginx-ingress</span>.",
  };
}

function rotateTls(inc: Incident): CommandResult {
  const secrets = getPath(inc.state, "secrets") as Record<string, { expired: boolean }> | undefined;
  if (!secrets) return { output: "No TLS secrets in this incident." };
  const changes: Record<string, unknown> = {};
  for (const key of Object.keys(secrets)) {
    changes[`secrets.${key}.expired`] = false;
  }
  return {
    output:
      "TLS secret recreated from Key Vault / renewed cert material. Now <span class='cmd'>kubectl rollout restart deploy/nginx-ingress</span>.",
    stateChanges: changes,
    damageIncident: 30,
    reveal: ["tls-rotated"],
  };
}

function rolloutIngress(inc: Incident): CommandResult {
  const root = String(getPath(inc.state, "rootCause") ?? "");
  const secrets = (getPath(inc.state, "secrets") as Record<string, { expired: boolean }>) ?? {};
  const expired = Object.values(secrets).some((s) => s.expired);
  const probe = Number(getPath(inc.state, "probes.readinessTimeout") ?? 10);
  const timeout = String(getPath(inc.state, "annotations.proxyReadTimeout") ?? "60");

  const stillBroken =
    (root === "expiredTlsSecret" && expired) ||
    (root === "badProbe" && probe <= 1) ||
    (root === "upstreamTimeout" && Number(timeout) <= 5);

  if (stillBroken) {
    return {
      output:
        "<span class='err'>Rollout finished — pods still CrashLoopBackOff.</span> You restarted without fixing the root cause. Production HP takes a hit.",
      damageProduction: 18,
    };
  }

  return {
    output:
      "<span class='ok'>deployment.apps/nginx-ingress restarted successfully.</span><br>Waiting for rollout: 1 of 1 updated replicas available.<br>Ingress healthy. 502s clearing.",
    stateChanges: {
      "ingress.healthy": true,
      "ingress.error": "",
      "pods.0.status": "Running",
      "pods.0.ready": "1/1",
      "pods.0.restarts": 0,
    },
    damageIncident: 40,
  };
}

function azCmd(ctx: SimContext, tokens: string[]): CommandResult {
  if (!ctx.incident) return needIncident();
  const inc = ctx.incident;

  if (tokens[1] === "aks" && tokens[2] === "show") {
    if (!has(ctx, "kubectl-basics")) return blocked("kubectl-basics");
    const name = getPath(inc.state, "cluster.name") ?? flag(ctx.tokens, "name") ?? "cluster";
    const region = getPath(inc.state, "cluster.region");
    const power = getPath(inc.state, "cluster.powerState");
    return reveal(
      "aks-show",
      `{ name: "${name}", location: "${region}", powerState: "${power}", provisioningState: "Succeeded" }<br><span class='warn'>Cluster control plane is up. This is probably not a dead cluster.</span>`,
    );
  }

  if (tokens[1] === "keyvault" && tokens[2] === "secret") {
    if (!has(ctx, "keyvault-secrets")) return blocked("keyvault-secrets");
    if (tokens[3] === "show") {
      const expired = getPath(inc.state, "keyvault.expired");
      const name = getPath(inc.state, "keyvault.secretName");
      const vault = getPath(inc.state, "keyvault.name");
      if (name == null) {
        // maybe AKS TLS living in KV conceptually
        return reveal(
          "kv-show",
          "No Key Vault binding in this incident. If this is ingress TLS, rotate with kubectl create secret.",
        );
      }
      return reveal(
        "kv-show",
        `Vault: ${vault}<br>Secret: ${name}<br>attributes.enabled: true<br>attributes.expires: ${expired ? "<span class='err'>EXPIRED</span>" : "2028-01-01"}`,
      );
    }
    if (tokens[3] === "set") {
      return {
        output:
          "Secret value/expiry updated in Key Vault. Pipeline can retry.",
        stateChanges: {
          "keyvault.expired": false,
          "pipeline.status": "succeeded",
          "pipeline.reason": "",
        },
        damageIncident: 40,
      };
    }
  }

  if (tokens[1] === "pipelines") {
    if (tokens[2] === "show") {
      if (!has(ctx, "yaml-pipelines")) return blocked("yaml-pipelines");
      const p = getPath(inc.state, "pipeline") as Record<string, unknown> | undefined;
      if (!p) return { output: "No Azure Pipeline in this incident." };
      return reveal(
        "pipeline-show",
        `name: ${p.name}<br>status: ${p.status}<br>yamlError: ${p.yamlError ?? "n/a"}<br>vmImage: '${p.vmImage ?? ""}'<br>templatePath: ${p.templatePath ?? "n/a"}<br>gates: ${JSON.stringify(p.gates ?? {})}`,
      );
    }
    if (tokens[2] === "run") {
      if (!has(ctx, "yaml-pipelines")) return blocked("yaml-pipelines");
      const err = getPath(inc.state, "pipeline.yamlError");
      if (err) {
        return {
          output:
            "<span class='err'>Pipeline compile failed.</span> vmImage or template path still invalid. Fix variables/templates, don't just re-run.",
          damageProduction: 10,
        };
      }
      return {
        output: "Pipeline queued → succeeded.",
        stateChanges: { "pipeline.status": "succeeded" },
        damageIncident: 20,
      };
    }
    if (tokens[2] === "variable") {
      if (!has(ctx, "yaml-pipelines")) return blocked("yaml-pipelines");
      const root = String(getPath(inc.state, "rootCause") ?? "");
      if (root === "badTemplatePath") {
        return {
          output:
            "vmImage is already set. The compile error is the template path. Try <span class='cmd'>az pipelines template set</span>.",
          damageProduction: 4,
        };
      }
      return {
        output: "Variable vmImage set to ubuntu-latest.",
        stateChanges: { "pipeline.vmImage": "ubuntu-latest", "pipeline.yamlError": false },
        damageIncident: 25,
      };
    }
    if (tokens[2] === "template") {
      if (!has(ctx, "yaml-pipelines")) return blocked("yaml-pipelines");
      const root = String(getPath(inc.state, "rootCause") ?? "");
      if (root === "missingVmImage") {
        return {
          output: "Template path is fine. vmImage is empty — <span class='cmd'>az pipelines variable update</span>.",
          damageProduction: 4,
        };
      }
      return {
        output: "Template path set to azure-pipelines/build.yml.",
        stateChanges: {
          "pipeline.templatePath": "azure-pipelines/build.yml",
          "pipeline.yamlError": false,
        },
        damageIncident: 25,
      };
    }
    if (tokens[2] === "checks") {
      if (!has(ctx, "pipeline-gates")) return blocked("pipeline-gates");
      if (tokens[3] === "list") {
        return reveal(
          "checks",
          `Environment: prod<br>${JSON.stringify(getPath(inc.state, "pipeline.gates"), null, 2)}`,
        );
      }
      if (tokens[3] === "update") {
        const root = String(getPath(inc.state, "rootCause") ?? "");
        if (root === "coverage") {
          return {
            output:
              "Test task + coverage gate re-run. Coverage now 86%. Approval released.",
            stateChanges: {
              "pipeline.gates.tests": "passed",
              "pipeline.gates.coverage": 86,
              "pipeline.gates.approval": "approved",
              "pipeline.status": "succeeded",
            },
            damageIncident: 40,
          };
        }
        if (root === "securityScan") {
          return {
            output:
              "Security gate: high findings remediated (GHAS/Defender). Check passed. Approval released.",
            stateChanges: {
              "pipeline.gates.security": "none",
              "pipeline.gates.approval": "approved",
              "pipeline.status": "succeeded",
            },
            damageIncident: 40,
          };
        }
        return {
          output:
            "Checks updated. If this was a YAML compile issue, use variable/template fixes instead.",
          damageIncident: 10,
        };
      }
    }
  }

  if (tokens[1] === "repos" && tokens[2] === "policy") {
    if (!has(ctx, "branch-policies")) return blocked("branch-policies");
    if (tokens[3] === "list") {
      const r = getPath(inc.state, "repo") as Record<string, unknown>;
      return reveal(
        "policy-list",
        `repo: ${r?.name}<br>requiredReviewers: ${r?.requiredReviewers}<br>buildValidation: ${r?.buildValidation}<br>allowForcePush: ${r?.forcePush}`,
      );
    }
    if (tokens[3] === "update") {
      return {
        output:
          "Policies applied on main: required reviewers = 2, build validation on, force push denied.",
        stateChanges: {
          "repo.requiredReviewers": 2,
          "repo.buildValidation": true,
          "repo.forcePush": false,
          "repo.protected": true,
        },
        damageIncident: 40,
      };
    }
  }

  if (tokens[1] === "boards") {
    if (tokens[2] === "work-item") {
      if (!has(ctx, "boards-flow")) return blocked("boards-flow");
      if (tokens[3] === "show") {
        const b = getPath(inc.state, "boards") as Record<string, unknown>;
        if (!b) return { output: "No work item in this incident." };
        return reveal(
          "wi-show",
          `AB#${b.workItemId} ${b.title}<br>state: ${b.state}<br>linked PR: ${b.linkedPr}`,
        );
      }
      if (tokens[3] === "relation" && tokens[4] === "add") {
        return {
          output: "Work item linked to PR. Traceability restored.",
          stateChanges: { "boards.linkedPr": true },
          damageIncident: 40,
        };
      }
    }
    if (tokens[2] === "query" || tokens[2] === "metrics") {
      if (!has(ctx, "boards-metrics") && !has(ctx, "boards-flow")) {
        return blocked("boards-metrics");
      }
      return reveal(
        "metrics",
        "cycleTimeDays: 4.2<br>leadTimeDays: 6.1<br>mttrHours: 3.4<br>Hint: if Teams is silent, check webhooks — metrics won't page anyone.",
      );
    }
  }

  if (tokens[1] === "webapp" && tokens[2] === "deployment" && tokens[3] === "slot") {
    if (!has(ctx, "deployments")) return blocked("deployments");
    if (tokens[4] === "list") {
      const w = getPath(inc.state, "webapp") as Record<string, unknown>;
      return reveal(
        "slots",
        `app: ${w?.name}<br>production: ${w?.productionSlot} (live)<br>staging: ${w?.stagingSlot} healthy=${w?.stagingHealthy}`,
      );
    }
    if (tokens[4] === "swap") {
      const healthy = getPath(inc.state, "webapp.stagingHealthy");
      const staging = getPath(inc.state, "webapp.stagingSlot");
      if (healthy === false) {
        return {
          output:
            "<span class='err'>Swap blocked:</span> staging probe is not healthy. Warm the slot first (<span class='cmd'>az webapp deployment slot warmup</span> in this sim: set stagingHealthy).",
          damageProduction: 12,
        };
      }
      return {
        output: `Swapped staging (${staging}) onto production. Rollback is another swap.`,
        stateChanges: {
          "webapp.productionSlot": staging,
          "webapp.stagingSlot": "bad-build",
          "webapp.swapped": true,
        },
        damageIncident: 40,
      };
    }
    if (tokens[4] === "warmup") {
      return {
        output: "Staging slot warmed. Probes 200.",
        stateChanges: { "webapp.stagingHealthy": true },
        damageIncident: 15,
      };
    }
  }

  if (tokens[1] === "deployment" && tokens[2] === "group") {
    if (!has(ctx, "bicep-iac")) return blocked("bicep-iac");
    const d = getPath(inc.state, "deployment") as Record<string, unknown> | undefined;
    if (!d) return { output: "No deployment in this incident." };
    if (tokens[3] === "show") {
      return reveal(
        "dep-show",
        `name: ${d.name}<br>rg: ${d.resourceGroup}<br>status: ${d.status}<br>sku: ${d.sku}<br>missingParam: ${d.missingParam}`,
      );
    }
    if (tokens[3] === "what-if" || tokens[3] === "whatif") {
      const root = String(getPath(inc.state, "rootCause") ?? "");
      const msg =
        root === "badSku"
          ? "what-if: SKU P5 is NOT available in this region. Suggest P1v3."
          : "what-if: secure parameter sqlAdminPassword is missing from the pipeline variable group.";
      return {
        output: msg,
        stateChanges: { "deployment.whatIfClean": true },
        reveal: ["what-if"],
        damageIncident: 15,
      };
    }
    if (tokens[3] === "create") {
      const root = String(getPath(inc.state, "rootCause") ?? "");
      const paramSku = flag(ctx.tokens, "parameters") ?? "";
      const rawLower = ctx.raw.toLowerCase();
      const skuOverride =
        /sku=p1/i.test(rawLower) || /sku['":\s]+p1/i.test(rawLower) || paramSku.toLowerCase().includes("p1");
      const paramFix = rawLower.includes("sqladminpassword");
      const sku = skuOverride ? "P1v3" : String(getPath(inc.state, "deployment.sku"));
      const missing = paramFix ? false : getPath(inc.state, "deployment.missingParam");
      if (skuOverride || paramFix) {
        Object.assign(inc.state, {});
      }
      if (root === "badSku" && sku === "P5") {
        return {
          output:
            "<span class='err'>InvalidTemplate:</span> SKU P5 not in region. Set sku to P1v3 (az deployment group create --parameters sku=P1v3).",
          damageProduction: 10,
        };
      }
      if (root === "missingParam" && missing) {
        return {
          output:
            "<span class='err'>InvalidTemplate:</span> missing sqlAdminPassword. Pass it from Key Vault-backed variable group.",
          damageProduction: 10,
        };
      }
      return {
        output: "Deployment succeeded. Resources reached desired state.",
        stateChanges: {
          "deployment.status": "succeeded",
          "deployment.sku": sku,
          "deployment.missingParam": missing,
        },
        damageIncident: 40,
      };
    }
  }

  if (tokens[1] === "ad" && tokens[2] === "app" && tokens[3] === "federated-credential") {
    if (!has(ctx, "oidc-federation")) return blocked("oidc-federation");
    if (tokens[4] === "list") {
      const o = getPath(inc.state, "oidc") as Record<string, unknown>;
      return reveal(
        "oidc-list",
        `app: ${o?.app}<br>actual subject: ${o?.actualSubject}<br>expected subject: ${o?.expectedSubject}<br>matched: ${o?.matched}`,
      );
    }
    if (tokens[4] === "create" || tokens[4] === "update") {
      const expected = getPath(inc.state, "oidc.expectedSubject");
      return {
        output: `Federated credential subject set to ${expected}. GitHub OIDC login should succeed.`,
        stateChanges: {
          "oidc.actualSubject": expected,
          "oidc.matched": true,
        },
        damageIncident: 40,
      };
    }
  }

  if (tokens[1] === "identity" && tokens[2] === "show") {
    if (!has(ctx, "entra-identities")) return blocked("entra-identities");
    return reveal("identity", "type: UserAssigned<br>principalId: 00000000-0000-0000-0000-aaaaaaaaaaaa<br>Prefer this over a client secret when the workload is on Azure.");
  }

  if (tokens[1] === "monitor") {
    if (tokens[2] === "app-insights" && tokens[3] === "query") {
      if (!has(ctx, "kql-basics")) return blocked("kql-basics");
      const rate = getPath(inc.state, "monitor.exceptionRate");
      return {
        output: `exceptions | where timestamp > ago(1h) | summarize count() by type<br><br>System.NullReferenceException  ${rate ?? 12}<br>correlated operation_Name: GET /checkout`,
        stateChanges: { "monitor.queried": true },
        reveal: ["kql"],
        damageIncident: 20,
      };
    }
    if (tokens[2] === "app-insights" && tokens[3] === "show") {
      if (!has(ctx, "azure-monitor")) return blocked("azure-monitor");
      return reveal(
        "ai-show",
        `app: ${getPath(inc.state, "monitor.app")}<br>exceptionRate x${getPath(inc.state, "monitor.exceptionRate")}`,
      );
    }
    if (tokens[2] === "metrics" && tokens[3] === "alert" && tokens[4] === "create") {
      if (!has(ctx, "pipeline-alerts")) return blocked("pipeline-alerts");
      return {
        output: "Metric alert 'pipeline-failed' created and attached to action group oncall-devops.",
        stateChanges: {
          "alerts.pipelineFailedAlert": true,
          "alerts.attached": true,
        },
        damageIncident: 40,
      };
    }
    if (tokens[2] === "action-rule" && tokens[3] === "list") {
      if (!has(ctx, "pipeline-alerts")) return blocked("pipeline-alerts");
      return reveal(
        "action-rules",
        `actionGroup: ${getPath(inc.state, "alerts.actionGroup")}<br>attached: ${getPath(inc.state, "alerts.attached")}`,
      );
    }
  }

  if (tokens[1] === "boards" && tokens[2] === "webhook") {
    if (!has(ctx, "boards-metrics")) return blocked("boards-metrics");
    if (tokens[3] === "update" || tokens[3] === "create") {
      return {
        output: "Webhook URL rotated and Microsoft Teams connection restored.",
        stateChanges: {
          "webhook.status": 200,
          "webhook.urlValid": true,
          "webhook.teamsConnected": true,
        },
        damageIncident: 40,
      };
    }
    return reveal(
      "webhook",
      `status: ${getPath(inc.state, "webhook.status")}<br>urlValid: ${getPath(inc.state, "webhook.urlValid")}`,
    );
  }

  if (tokens[1] === "devops" && tokens[2] === "pat" && (tokens[3] === "rotate" || tokens[3] === "revoke")) {
    if (!has(ctx, "git-recover")) return blocked("git-recover");
    return {
      output: "PAT revoked/rotated in Azure DevOps. History may still contain the old token — purge it.",
      stateChanges: { "repo.rotated": true },
      damageIncident: 25,
    };
  }

  if (tokens[1] === "appconfig" && tokens[2] === "feature") {
    if (!has(ctx, "kql-basics")) return blocked("kql-basics");
    const queried = getPath(inc.state, "monitor.queried");
    if (!queried) {
      return {
        output: "<span class='warn'>You are about to toggle a flag without KQL evidence.</span> Query App Insights first.",
        damageProduction: 12,
      };
    }
    return {
      output: "Feature flag checkout-v2 disabled via App Configuration. Exception rate collapsing.",
      stateChanges: { "monitor.mitigated": true, "monitor.exceptionRate": 0 },
      damageIncident: 40,
    };
  }

  // parameter helper for bicep sku
  if (ctx.raw.toLowerCase().includes("sku=p1") || ctx.raw.toLowerCase().includes("sku p1")) {
    if (!has(ctx, "bicep-iac")) return blocked("bicep-iac");
    return {
      output: "Parameter sku=P1v3 recorded. Re-run az deployment group create.",
      stateChanges: { "deployment.sku": "P1v3" },
      damageIncident: 15,
    };
  }
  if (ctx.raw.toLowerCase().includes("sqladminpassword") && !tokens.includes("create")) {
    if (!has(ctx, "bicep-iac")) return blocked("bicep-iac");
    return {
      output: "sqlAdminPassword mapped from Key Vault variable group.",
      stateChanges: { "deployment.missingParam": false },
      damageIncident: 15,
    };
  }

  return {
    output:
      "az: unknown or incomplete command. Type <span class='cmd'>help</span> for unlocked Azure CLI runbooks.",
  };
}

function gitCmd(ctx: SimContext, tokens: string[]): CommandResult {
  if (!has(ctx, "git-basics") && !has(ctx, "git-recover")) {
    return blocked("git-basics");
  }
  const inc = ctx.incident;

  if (tokens[1] === "status") {
    const secret = inc ? getPath(inc.state, "repo.secretInHead") : undefined;
    const repo = inc ? getPath(inc.state, "repo.name") ?? "shop-src" : "shop-src";
    return {
      output: `On branch main (${repo})<br>${secret ? "<span class='err'>warning: secret scanning believes a PAT is still in HEAD</span>" : "nothing to commit, working tree clean"}`,
      reveal: inc ? ["git-status"] : undefined,
      global: !inc,
    };
  }
  if (tokens[1] === "branch") {
    return { output: "* main<br>  feature/short-lived-fix", global: !inc, reveal: inc ? ["git-branch"] : undefined };
  }
  if (tokens[1] === "log") {
    return {
      output: "a1b2c3 (HEAD) chore: add deploy script<br>99fe21 feat: checkout<br>c0ffee ci: yaml",
      global: !inc,
      reveal: inc ? ["git-log"] : undefined,
    };
  }
  if (!inc) return needIncident();
  if (tokens[1] === "revert") {
    if (!has(ctx, "git-recover")) return blocked("git-recover");
    return {
      output:
        "<span class='warn'>Revert created.</span> The PAT is still in history. Rotate the credential and <span class='cmd'>git filter-repo</span> (or BFG).",
      stateChanges: { "repo.secretInHead": false },
      damageIncident: 10,
      damageProduction: 5,
    };
  }
  if (tokens[1] === "restore") {
    return { output: "Working tree restored. History unchanged." };
  }
  if (tokens[1] === "filter-repo" || tokens[1] === "filter-branch") {
    if (!has(ctx, "git-recover")) return blocked("git-recover");
    const rotated = getPath(inc.state, "repo.rotated");
    if (!rotated) {
      return {
        output:
          "<span class='err'>You purged the file but the PAT is still valid.</span> Rotate it in Azure DevOps/GitHub before celebrating.",
        stateChanges: { "repo.purged": true, "repo.secretInHistory": false },
        damageProduction: 15,
      };
    }
    return {
      output: "History rewritten. Secret blobs gone. Force-push protected branches with the team.",
      stateChanges: { "repo.purged": true, "repo.secretInHistory": false },
      damageIncident: 40,
    };
  }
  return { output: "git: try status, branch, log, revert, filter-repo." };
}

function ghCmd(ctx: SimContext, tokens: string[]): CommandResult {
  if (!ctx.incident) return needIncident();
  if (tokens[1] === "run") {
    if (!has(ctx, "github-actions")) return blocked("github-actions");
    return reveal(
      "gh-run",
      "STATUS  TITLE                 WORKFLOW<br>fail    deploy production     azure-login.yml  (see OIDC / secrets incidents)",
    );
  }
  if (tokens[1] === "secret-scanning" || (tokens[1] === "secret" && tokens[2] === "scanning")) {
    if (!has(ctx, "ghas-scanning")) return blocked("ghas-scanning");
    return reveal("ghas-secrets", "1 open secret scanning alert: azure-devops-pat (commit a1b2c3)");
  }
  if (tokens[1] === "codeql" && tokens[2] === "fix") {
    if (!has(ctx, "ghas-scanning")) return blocked("ghas-scanning");
    return {
      output: "Parameterized SQL in checkout.ts. CodeQL alert closed.",
      stateChanges: { "ghas.codeqlOpen": false },
      damageIncident: 25,
    };
  }
  if (tokens[1] === "codeql" || tokens[1] === "code-scanning") {
    if (!has(ctx, "ghas-scanning")) return blocked("ghas-scanning");
    const open = getPath(ctx.incident.state, "ghas.codeqlOpen");
    return reveal("codeql", `CodeQL alerts open: ${open === false ? 0 : 1}`);
  }
  if (tokens[1] === "dependabot" && (tokens[2] === "alert" || tokens[2] === "alerts")) {
    if (!has(ctx, "ghas-scanning")) return blocked("ghas-scanning");
    return { output: "Use <span class='cmd'>gh alert dismiss</span> only after bumping. Prefer <span class='cmd'>gh patch dependabot</span> in this sim." };
  }
  if (tokens[1] === "patch" && tokens[2] === "dependabot") {
    if (!has(ctx, "ghas-scanning")) return blocked("ghas-scanning");
    return {
      output: "lodash bumped; Dependabot critical closed. CodeQL still open if you have not fixed checkout.ts.",
      stateChanges: { "ghas.dependabotCritical": false },
      damageIncident: 25,
    };
  }
  return { output: "gh: try run list, secret-scanning list, patch dependabot, codeql fix." };
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function tokenize(raw: string): string[] {
  return raw.trim().split(/\s+/).filter(Boolean);
}
