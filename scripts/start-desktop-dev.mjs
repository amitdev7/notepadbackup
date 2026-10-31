// ---------------------------------------------------------------------------
// Zenithsui Desktop — Development Launcher
// ---------------------------------------------------------------------------

import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")

// Electron executable path
const electronBin = path.join(
  rootDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "electron.cmd" : "electron"
)

console.log("[desktop-dev] Launching Electron in development mode...")
const child = spawn(electronBin, ["dist-electron/main.js"], {
  cwd: rootDir,
  stdio: "inherit",
  env: {
    ...process.env,
    ZENITHSUI_DEV_URL: process.env.ZENITHSUI_DEV_URL || "http://localhost:3000",
  },
})

child.on("exit", (code) => {
  process.exit(code ?? 0)
})
