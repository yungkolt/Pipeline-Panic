import { describe, expect, it } from "vitest";
import { applyChanges, evalWin, getPath, setPath } from "./path";

describe("path helpers", () => {
  it("gets and sets nested paths including array indexes", () => {
    const state: Record<string, unknown> = {
      pods: [{ status: "CrashLoopBackOff" }],
    };
    expect(getPath(state, "pods.0.status")).toBe("CrashLoopBackOff");
    setPath(state, "pods.0.status", "Running");
    expect(getPath(state, "pods.0.status")).toBe("Running");
  });

  it("evaluates all/eq win conditions", () => {
    const state: Record<string, unknown> = { ingress: { healthy: true }, secret: { expired: false } };
    expect(
      evalWin(state, {
        type: "all",
        conditions: [
          { type: "eq", path: "ingress.healthy", value: true },
          { type: "eq", path: "secret.expired", value: false },
        ],
      }),
    ).toBe(true);
    applyChanges(state, { "ingress.healthy": false });
    expect(evalWin(state, { type: "eq", path: "ingress.healthy", value: true })).toBe(false);
  });
});
