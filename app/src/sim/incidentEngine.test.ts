import { describe, expect, it } from "vitest";
import { generateIncident } from "./generator";
import { applyCommand } from "./incidentEngine";
import { newGameSave, defaultSpawn } from "../progress/save";
import { isWinning } from "./incidentEngine";

function saveWith(skills: string[], templateId: string, rootCauseId: string, seed = 42) {
  const save = newGameSave(defaultSpawn());
  save.player.skills = skills;
  save.currentIncident = generateIncident({
    seed,
    templateId,
    rootCauseId,
    campaign: true,
  });
  return save;
}

describe("incident generator", () => {
  it("is deterministic for a seed", () => {
    const a = generateIncident({ seed: 9001, templateId: "ingress-502", rootCauseId: "expiredTlsSecret" });
    const b = generateIncident({ seed: 9001, templateId: "ingress-502", rootCauseId: "expiredTlsSecret" });
    expect(a.title).toBe(b.title);
    expect(a.environment).toBe(b.environment);
    expect(a.rootCauseId).toBe("expiredTlsSecret");
    expect(a.state.rootCause).toBe("expiredTlsSecret");
  });

  it("varies slots across seeds", () => {
    const titles = new Set(
      Array.from({ length: 20 }, (_, i) =>
        generateIncident({ seed: i + 1, templateId: "ingress-502", rootCauseId: "expiredTlsSecret" })
          .environment,
      ),
    );
    expect(titles.size).toBeGreaterThan(1);
  });
});

describe("AKS ingress incident", () => {
  const skills = ["help-basics", "kubectl-basics", "aks-ingress"];

  it("gates kubectl without the skill", () => {
    const save = saveWith(["help-basics"], "ingress-502", "expiredTlsSecret");
    const tick = applyCommand(save, "kubectl get pods");
    expect(tick.result.skillBlocked).toBe("kubectl-basics");
    expect(tick.resolvedNow).toBe(false);
  });

  it("does not resolve on restart while the TLS secret is expired", () => {
    const save = saveWith(skills, "ingress-502", "expiredTlsSecret", 7);
    applyCommand(save, "kubectl get pods -n ingress-basic");
    applyCommand(save, "kubectl logs deploy/nginx-ingress");
    const restart = applyCommand(save, "kubectl rollout restart deploy/nginx-ingress");
    expect(restart.resolvedNow).toBe(false);
    expect(save.currentIncident?.productionHp).toBeLessThan(100);
    expect(isWinning(save.currentIncident!)).toBe(false);
  });

  it("resolves after rotating TLS and rolling out", () => {
    const save = saveWith(skills, "ingress-502", "expiredTlsSecret", 7);
    applyCommand(save, "kubectl get pods");
    applyCommand(save, "kubectl logs deploy/nginx-ingress");
    applyCommand(save, "kubectl create secret tls tls-ingress-secret --cert=tls.crt --key=tls.key");
    const done = applyCommand(save, "kubectl rollout restart deploy/nginx-ingress");
    expect(isWinning(save.currentIncident!)).toBe(true);
    expect(done.resolvedNow).toBe(true);
    expect(save.currentIncident?.resolved).toBe(true);
  });
});

describe("other templates", () => {
  it("links a Boards work item", () => {
    const save = saveWith(["help-basics", "boards-flow"], "workitem-unlink", "unlinkedPr", 3);
    applyCommand(save, "az boards work-item show 1842");
    const done = applyCommand(save, "az boards work-item relation add --pr 418");
    expect(done.resolvedNow).toBe(true);
  });

  it("repairs YAML vmImage then run", () => {
    const save = saveWith(
      ["help-basics", "yaml-pipelines"],
      "yaml-var-break",
      "missingVmImage",
      11,
    );
    applyCommand(save, "az pipelines show");
    applyCommand(save, "az pipelines variable update --name vmImage --value ubuntu-latest");
    const done = applyCommand(save, "az pipelines run");
    expect(done.resolvedNow).toBe(true);
  });

  it("updates branch policies", () => {
    const save = saveWith(
      ["help-basics", "branch-policies"],
      "branch-policy",
      "reviewersZero",
      5,
    );
    applyCommand(save, "az repos policy list");
    const done = applyCommand(save, "az repos policy update --required-reviewers 2");
    expect(done.resolvedNow).toBe(true);
  });

  it("rotates a Key Vault secret", () => {
    const save = saveWith(
      ["help-basics", "keyvault-secrets"],
      "kv-expired",
      "expiredSecret",
      8,
    );
    applyCommand(save, "az keyvault secret show --vault-name kv-shop-prod --name db-connection");
    const done = applyCommand(save, "az keyvault secret set --expires 2028-01-01");
    expect(done.resolvedNow).toBe(true);
  });
});
