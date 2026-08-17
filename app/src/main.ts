import "./styles.css";
import { Store } from "./progress/store";
import { GameEngine } from "./game/engine";
import { bindUI } from "./ui/bind";

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const store = Store.createFromDisk();
const engine = new GameEngine(canvas, store);

function resize(): void {
  const wrap = canvas.parentElement;
  if (!wrap) return;
  canvas.width = Math.max(320, wrap.clientWidth);
  canvas.height = Math.max(240, wrap.clientHeight);
}

resize();
window.addEventListener("resize", resize);

// Start rendering before wiring the UI so a DOM/HUD failure cannot leave a black canvas.
engine.bindInput();
engine.start();
bindUI(store, engine);
