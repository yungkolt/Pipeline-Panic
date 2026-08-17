import { describe, expect, it } from "vitest";
import { Store } from "../progress/store";
import { newGameSave, defaultSpawn } from "../progress/save";
import { handleEntity, passLesson } from "../game/interact";
import { completeStep, finishQuest } from "../progress/quests";
import { LESSONS } from "./lessons";
import { createCampusMap } from "./map";

function store() {
  return new Store(newGameSave(defaultSpawn()));
}

describe("quest progression", () => {
  it("does not replay the hub orientation kiosk after onboarding is done", () => {
    const s = store();
    completeStep(s, "onboarding", "talk-riley");
    completeStep(s, "onboarding", "visit-kiosk");
    const kiosk = createCampusMap().entities.find((e) => e.id === "kiosk-hub")!;
    const result = handleEntity(s, kiosk);
    expect(result.type).toBe("message");
    if (result.type === "message") {
      expect(result.text).toMatch(/already cleared/i);
      expect(result.text).toMatch(/Maya|Boards|Glen|Repos/i);
    }
  });

  it("unlocks Boards and Repos after onboarding", () => {
    const s = store();
    finishQuest(s, "onboarding");
    expect(s.get().quests["boards-flow"].status).toBe("available");
    expect(s.get().quests["repos-branching"].status).toBe("available");
  });

  it("does not re-award the same kiosk quiz", () => {
    const s = store();
    const lesson = LESSONS.find((l) => l.id === "hub-orientation")!;
    completeStep(s, "onboarding", "talk-riley");
    const first = passLesson(s, lesson);
    expect(first).toMatch(/Unlocked/);
    const xp = s.get().player.xp;
    const second = passLesson(s, lesson);
    expect(second).toMatch(/Already trained/);
    expect(s.get().player.xp).toBe(xp);
  });
});
