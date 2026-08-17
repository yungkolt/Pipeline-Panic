import type { GameSave } from "../types";
import { newGameSave, defaultSpawn, migrateSave } from "./save";

const KEY = "pipeline-panic-save-v1";

type Listener = () => void;

export class Store {
  private state: GameSave;
  private listeners = new Set<Listener>();

  constructor(initial: GameSave) {
    this.state = initial;
  }

  get(): GameSave {
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  set(partial: Partial<GameSave> | ((s: GameSave) => void)): void {
    if (typeof partial === "function") {
      partial(this.state);
    } else {
      this.state = { ...this.state, ...partial };
    }
    this.emit();
    this.persist();
  }

  patchPlayer(partial: Partial<GameSave["player"]>): void {
    this.state.player = { ...this.state.player, ...partial };
    this.emit();
    this.persist();
  }

  persist(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch {
      /* ignore quota */
    }
  }

  emit(): void {
    for (const fn of this.listeners) fn();
  }

  reset(save: GameSave): void {
    this.state = save;
    this.emit();
    this.persist();
  }

  static loadOrNull(): GameSave | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as GameSave;
      if (parsed.version !== 1) return null;
      return migrateSave(parsed);
    } catch {
      return null;
    }
  }

  static hasSave(): boolean {
    return Boolean(localStorage.getItem(KEY));
  }

  static clear(): void {
    localStorage.removeItem(KEY);
  }

  static createNew(): Store {
    Store.clear();
    return new Store(newGameSave(defaultSpawn()));
  }

  static createFromDisk(): Store {
    return new Store(Store.loadOrNull() ?? newGameSave(defaultSpawn()));
  }
}
