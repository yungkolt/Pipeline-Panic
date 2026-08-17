# Pipeline Panic — AZ-400 Ops RPG

**Play:** [https://yungkolt.github.io/Pipeline-Panic/](https://yungkolt.github.io/Pipeline-Panic/)

A browser RPG for studying **Exam AZ-400: Designing and Implementing Microsoft DevOps Solutions**. You walk a top-down Ops HQ (Pokémon-style movement, not Pokémon IP), earn CLI “moves” from mentors and kiosks, then fight **stateful incidents** in a simulated Azure/GitHub terminal. After the campaign, **Endless On-Call** combinatorially generates new scenarios forever — no API keys, no real Azure bill.

## GitHub Pages (one-time)

The deploy workflow is already in [`.github/workflows/pages.yml`](.github/workflows/pages.yml) and runs on every push to `main`. GitHub still needs Pages turned on once for this repo (an API token cannot flip that switch):

1. Open **[Settings → Pages](https://github.com/yungkolt/Pipeline-Panic/settings/pages)**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. If the site 404s, open **[Actions](https://github.com/yungkolt/Pipeline-Panic/actions)** → **Build and deploy Pages** → **Run workflow** on `main`.

After the workflow is green, the game is at `https://yungkolt.github.io/Pipeline-Panic/`.

## Local

```bash
npm install
npm test
npm run dev
```

Production build: `npm run build` (static `dist/`, `base: './'` so it works as a project Pages site).

## Why this exists

AZ-400 is a practice exam, not a trivia exam. The game forces the same order you need at work and on the test:

1. Learn one idea (kiosk quiz).
2. Unlock the matching commands.
3. Diagnose against a hidden world state.
4. Apply a fix. Restarting without evidence hurts **production HP**.

Resolved incidents mint resume bullets (treat them as drafts — they describe simulated work).

## Campus = skills outline (July 2026)

| Wing | Exam domain | Weight |
| --- | --- | --- |
| Boards Wing | Processes & communications | 10–15% |
| Repos Wing | Source control strategy | 10–15% |
| Pipelines Arena | Build & release pipelines | 50–55% |
| Security Vault | Security & compliance | 10–15% |
| Observability Deck | Instrumentation | 5–10% |

Mentors (Riley, Maya, Glen, Priya, Nate, Sofia, Omar) gate quests. Domain badges unlock **Endless On-Call** via the red pager in the hub.

## How to play

- **WASD / arrows** walk · **E** talk or use a console.
- Start with Riley, then a **green kiosk** (lesson + quiz).
- **Red racks** start the wing’s campaign incident once you have the skill.
- Right panel: terminal, incident HP, quest log, skills, resume bullets.
- `help` lists **unlocked** commands only. `runbook` spends a hint.

Example Sev-1 (expired ingress TLS):

```text
kubectl get pods
kubectl logs deploy/nginx-ingress
kubectl create secret tls …
kubectl rollout restart deploy/nginx-ingress
```

Restart first and production HP drops — the secret is still expired.

## Architecture

```
src/
  game/        canvas loop, map collision, interactions
  ui/          HUD, dialogue, quizzes, terminal
  sim/         world-state CLI, win conditions, seeded generator
  progress/    XP/ranks, quests, localStorage
  content/     maps, NPCs, lessons, incident templates
```

Incidents are JSON-ish **templates** with slot fills (`service`, `region`, …), a **root cause** that mutates state, and optional **red herrings**. Commands read/write that state so `kubectl get pods` and `az aks show` stay consistent. The same seed always rebuilds the same incident.

The generator is the replay engine: 14 templates × root causes × regions/services is enough combinatorics for study loops without an LLM.

## What I practiced building this (resume notes)

- Data-driven game state (quests, skills, incidents) instead of one-off scripts
- A command parser + hidden world state (the interesting part of a “fake Azure CLI”)
- Seeded procedural content and unit tests around win conditions
- Vite/TypeScript static deploy (GitHub Pages)

Not in v1: real Azure APIs, accounts, or LLM-authored scenarios.

## License

MIT. Study aid — not affiliated with Microsoft or Nintendo.
