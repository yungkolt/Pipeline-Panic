import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Vite cannot empty the repo root safely, so drop the previous hashed bundles
// before a build to avoid accumulating stale assets in git.
const assets = fileURLToPath(new URL("../assets", import.meta.url));
await rm(assets, { recursive: true, force: true });
