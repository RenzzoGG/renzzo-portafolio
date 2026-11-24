/**
 * Launches the Python face pipeline through uv. The env lives in the user
 * cache, so nothing derived from the photo or the models lands in the repo.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const localUv = join(homedir(), ".local", "bin", "uv");
const onPath = spawnSync("uv", ["--version"], { stdio: "ignore" }).status === 0;
const uv = onPath ? "uv" : localUv;
if (!onPath && !existsSync(localUv)) {
  console.error("uv is required. See the Face pipeline section of the README.");
  process.exit(1);
}

const cache = process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");
const result = spawnSync(
  uv,
  [
    "run",
    "--project",
    "scripts/face",
    "--locked",
    "python",
    "scripts/face/build.py",
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      UV_PROJECT_ENVIRONMENT: join(cache, "renzzo-face", "venv"),
      PYTHONDONTWRITEBYTECODE: "1",
    },
  },
);
process.exit(result.status ?? 1);
