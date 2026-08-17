import type { Lesson } from "../types";
import { Store } from "../progress/store";
import type { GameEngine } from "../game/engine";
import type { DialogueSession } from "../content/dialogue";
import { applyCommand } from "../sim/incidentEngine";
import { escapeHtml } from "../sim/commands";
import { rankForXp, xpProgress } from "../progress/xp";
import { SKILLS } from "../content/skills";
import { visibleQuests, completeStep, nextObjective } from "../progress/quests";
import { BADGE_NAMES } from "../content/quests";
import { newGameSave, defaultSpawn } from "../progress/save";
import {
  applyDialogueFinish,
  passLesson,
  resolveIncidentRewards,
  type Interaction,
} from "../game/interact";

export function bindUI(store: Store, engine: GameEngine): void {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

  /** HUD writes tolerate a missing node so a markup change cannot break the game loop. */
  const setText = (id: string, value: string): void => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  const setHtml = (id: string, value: string): void => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
  };

  const title = $<HTMLElement>("title-screen");
  const continueBtn = $<HTMLButtonElement>("btn-continue");
  const newBtn = $<HTMLButtonElement>("btn-new");
  const prompt = $<HTMLElement>("interaction-prompt");
  const dialogueEl = $<HTMLElement>("dialogue");
  const quizEl = $<HTMLElement>("quiz-modal");
  const termOut = $<HTMLElement>("terminal-output");
  const termForm = $<HTMLFormElement>("terminal-form");
  const termInput = $<HTMLInputElement>("terminal-input");

  let dialogue: { session: DialogueSession; index: number } | null = null;
  let lesson: Lesson | null = null;

  continueBtn.disabled = !Store.hasSave();
  continueBtn.addEventListener("click", () => startShift(false));
  newBtn.addEventListener("click", () => startShift(true));

  function startShift(fresh: boolean): void {
    if (fresh) store.reset(newGameSave(defaultSpawn()));
    title.classList.add("hidden");
    engine.blocked = false;
    appendTerm(
      `<span class="ok">Welcome to Azure Cloud Shell (simulated).</span><br>Type <span class="cmd">help</span>. Walk to Riley (cyan) if this is your first shift.`,
    );
    renderAll();
  }

  engine.onInteract = (result: Interaction) => {
    handleInteraction(result);
  };

  function handleInteraction(result: Interaction): void {
    switch (result.type) {
      case "dialogue":
        openDialogue(result.session);
        break;
      case "lesson":
        openLesson(result.lesson);
        break;
      case "incident":
        switchTab("incident");
        appendTerm(`<span class="warn">[*] ${escapeHtml(result.message)}</span>`);
        toast(result.message);
        renderAll();
        break;
      case "focus-terminal":
        switchTab("terminal");
        termInput.focus();
        appendTerm(`<span class="ok">[*] Workstation focused. Type help.</span>`);
        break;
      case "message":
        appendTerm(escapeHtml(result.text));
        toast(result.text);
        break;
    }
  }

  function openDialogue(session: DialogueSession): void {
    dialogue = { session, index: 0 };
    engine.blocked = true;
    showDialogueLine();
  }

  function showDialogueLine(): void {
    if (!dialogue) return;
    dialogueEl.classList.remove("hidden");
    $("dialogue-speaker").textContent = `${dialogue.session.speaker} · ${dialogue.session.role}`;
    $("dialogue-text").textContent = dialogue.session.lines[dialogue.index] ?? "";
  }

  function advanceDialogue(): void {
    if (!dialogue) return;
    if (dialogue.index + 1 < dialogue.session.lines.length) {
      dialogue.index += 1;
      showDialogueLine();
      return;
    }
    const notes = applyDialogueFinish(store, dialogue.session);
    dialogueEl.classList.add("hidden");
    dialogue = null;
    engine.blocked = false;
    for (const n of notes) appendTerm(`<span class="ok">${escapeHtml(n)}</span>`);
    renderAll();
  }

  function openLesson(l: Lesson): void {
    lesson = l;
    engine.blocked = true;
    quizEl.classList.remove("hidden");
    $("quiz-title").textContent = l.title;
    $("quiz-body").innerHTML = l.body.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
    $("quiz-q").textContent = l.quiz.q;
    const box = $("quiz-choices");
    box.innerHTML = "";
    l.quiz.choices.forEach((c, i) => {
      const b = document.createElement("button");
      b.className = "choice";
      b.textContent = c;
      b.addEventListener("click", () => answerQuiz(i));
      box.appendChild(b);
    });
  }

  function answerQuiz(i: number): void {
    if (!lesson) return;
    const ok = i === lesson.quiz.answer;
    quizEl.classList.add("hidden");
    engine.blocked = false;
    if (ok) {
      const msg = passLesson(store, lesson);
      appendTerm(`<span class="ok">${escapeHtml(msg)}</span>`);
      toast(msg);
    } else {
      appendTerm(`<span class="err">Quiz missed. Re-read the kiosk and try again.</span>`);
      toast("Quiz missed — try the kiosk again.");
    }
    lesson = null;
    renderAll();
  }

  window.addEventListener("keydown", (e) => {
    if (dialogue && (e.key === "e" || e.key === "E" || e.key === " " || e.key === "Enter")) {
      e.preventDefault();
      advanceDialogue();
    }
  });

  document.querySelectorAll(".tabs button").forEach((btn) => {
    btn.addEventListener("click", () => switchTab((btn as HTMLElement).dataset.tab ?? "terminal"));
  });

  $("btn-clear").addEventListener("click", () => {
    termOut.innerHTML = `<div class="muted">Terminal cleared.</div>`;
  });

  termForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const cmd = termInput.value.trim();
    if (!cmd) return;
    appendTerm(`<span class="cmd">azure@ops:~$</span> ${escapeHtml(cmd)}`);
    termInput.value = "";
    if (cmd.toLowerCase() === "clear") {
      termOut.innerHTML = `<div class="muted">Terminal cleared.</div>`;
      return;
    }
    const tick = applyCommand(store.get(), cmd);
    if (tick.consumeRunbook) {
      store.get().player.runbooks = Math.max(0, store.get().player.runbooks - 1);
    }
    if (tick.result.output) appendTerm(tick.result.output);
    if (cmd.toLowerCase().startsWith("git status")) {
      completeStep(store, "repos-branching", "inspect-repo");
    }
    if (tick.resolvedNow && tick.incident) {
      const msg = resolveIncidentRewards(store, tick.incident, true);
      appendTerm(`<span class="ok">>>> ${escapeHtml(msg)}</span>`);
      toast(msg);
    } else if (tick.failedNow && tick.incident) {
      const msg = resolveIncidentRewards(store, tick.incident, false);
      appendTerm(`<span class="err">>>> ${escapeHtml(msg)}</span>`);
    }
    store.persist();
    store.emit();
    renderAll();
  });

  $("btn-copy").addEventListener("click", async () => {
    const bullets = store.get().player.resumeBullets;
    const text = bullets.map((b) => `• ${b}`).join("\n");
    await navigator.clipboard.writeText(text || "(none yet)");
    toast("Copied resume bullets.");
  });

  store.subscribe(renderAll);

  function switchTab(name: string): void {
    for (const id of ["terminal", "incident", "quests", "skills", "resume"]) {
      const panel = document.getElementById(`content-${id}`);
      const tab = document.querySelector(`[data-tab="${id}"]`);
      panel?.classList.toggle("hidden", id !== name);
      tab?.classList.toggle("active", id === name);
    }
    if (name === "terminal") termInput.focus();
  }

  function renderAll(): void {
    const s = store.get();
    const rank = rankForXp(s.player.xp);
    const prog = xpProgress(s.player.xp);
    setText("player-rank", rank.name);
    setText("player-xp", `${prog.current} / ${prog.next}`);
    setText("player-runbooks", String(s.player.runbooks));
    const live = Boolean(
      s.currentIncident && !s.currentIncident.resolved && !s.currentIncident.failed,
    );
    setText("active-incidents-count", live ? "1" : "0");
    const counter = document.getElementById("active-incidents-count");
    if (counter) counter.style.color = live ? "#f87171" : "#34d399";
    setText("bullet-count", String(s.player.resumeBullets.length));
    setText("next-objective", nextObjective(s));

    renderIncident();
    renderQuests();
    renderSkills();
    renderResume();
  }

  function renderIncident(): void {
    const inc = store.get().currentIncident;
    if (!inc) {
      setHtml(
        "incident-root",
        `<p class="muted">No active incident. Walk to a red server rack after the wing's training quest.</p>`,
      );
      return;
    }
    const prod = Math.round((inc.productionHp / inc.productionMaxHp) * 100);
    const ihp = Math.round((inc.incidentHp / inc.incidentMaxHp) * 100);
    const done = inc.resolved ? "ok" : "";
    setHtml(
      "incident-root",
      `
      <div class="incident-card ${done}">
        <h3>${escapeHtml(inc.title)}</h3>
        <p class="muted">Sev-${inc.severity} · ${escapeHtml(inc.domain)} · ${escapeHtml(inc.environment)} · seed ${inc.seed}</p>
        <p>${escapeHtml(inc.brief)}</p>
        <div class="hp">
          <label>Production HP <span>${inc.productionHp}/${inc.productionMaxHp}</span></label>
          <div class="bar prod"><i style="width:${prod}%"></i></div>
          <label>Incident HP <span>${inc.incidentHp}/${inc.incidentMaxHp}</span></label>
          <div class="bar"><i style="width:${ihp}%"></i></div>
        </div>
        <div class="log">${escapeHtml(inc.logSnippet)}</div>
        <h4>Revealed facts</h4>
        <p class="muted">${inc.revealed.length ? inc.revealed.map(escapeHtml).join(", ") : "None yet — diagnose in the terminal."}</p>
        <p class="muted">${inc.resolved ? "Resolved." : inc.failed ? "Failed. Re-pull the rack." : "Type status or runbook for a hint (costs 1 runbook)."}</p>
      </div>`,
    );
  }

  function renderQuests(): void {
    const s = store.get();
    const list = visibleQuests(s);
    const head = `<p class="muted"><b>Next:</b> ${escapeHtml(nextObjective(s))}</p>`;
    if (!list.length) {
      setHtml("quests-root", head);
      return;
    }
    setHtml(
      "quests-root",
      head +
        list
        .map((q) => {
          const st = s.quests[q.id];
          const cls = st.status === "completed" ? "done" : st.status === "active" ? "active" : "";
          const steps = q.steps
            .map(
              (step) =>
                `<li class="${st.steps[step.id] ? "done" : ""}">${st.steps[step.id] ? "✓" : "○"} ${escapeHtml(step.text)}</li>`,
            )
            .join("");
          return `<article class="quest ${cls}">
          <header><b>${escapeHtml(q.title)}</b><span class="badge">${st.status}${q.domain ? " · " + q.domain : ""}</span></header>
          <p class="muted">${escapeHtml(q.description)}</p>
          <ul class="steps">${steps}</ul>
        </article>`;
        })
        .join(""),
    );
  }

  function renderSkills(): void {
    const unlocked = new Set(store.get().player.skills);
    const badges = store
      .get()
      .player.badges.map((b) => BADGE_NAMES[b] ?? b)
      .join(" · ");
    setHtml(
      "skills-root",
      `<p class="muted">Badges: ${escapeHtml(badges || "none")}</p>` +
        SKILLS.map((sk) => {
        const on = unlocked.has(sk.id);
        return `<article class="skill" style="opacity:${on ? 1 : 0.45}">
          <header><b>${escapeHtml(sk.name)}</b><span class="badge">${on ? "unlocked" : "locked"} · ${sk.domain}</span></header>
          <p class="muted">${escapeHtml(sk.description)}</p>
          <p class="muted">${sk.commands.map((c) => `<span class="cmd">${escapeHtml(c)}</span>`).join(" · ")}</p>
        </article>`;
        }).join(""),
    );
  }

  function renderResume(): void {
    const bullets = store.get().player.resumeBullets;
    if (!bullets.length) {
      setHtml("resume-root", `<p class="muted">No bullets yet. Resolve incidents.</p>`);
      return;
    }
    setHtml(
      "resume-root",
      bullets.map((b) => `<div class="bullet">✓ ${escapeHtml(b)}</div>`).join(""),
    );
  }

  function appendTerm(html: string): void {
    const div = document.createElement("div");
    div.innerHTML = html;
    termOut.appendChild(div);
    termOut.scrollTop = termOut.scrollHeight;
  }

  function toast(msg: string): void {
    const el = $("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    window.setTimeout(() => el.classList.add("hidden"), 2800);
  }

  setInterval(() => {
    if (engine.nearby && title.classList.contains("hidden") && !dialogue && !lesson) {
      prompt.classList.remove("hidden");
      prompt.innerHTML = `Press <kbd>E</kbd> to use ${escapeHtml(engine.nearby.name)}`;
    } else prompt.classList.add("hidden");
  }, 120);

  renderAll();
}
