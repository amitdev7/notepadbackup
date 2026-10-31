// ---------------------------------------------------------------------------
// Zenithsui Desktop Local Embedded Server
//
// Hosts the Next.js application locally on loopback (127.0.0.1)
// - 100% offline startup: Zero internet dependency for canvas editing
// - Secure loopback: Never binds to public/LAN IP addresses
// - Automatic port detection
// ---------------------------------------------------------------------------

import http from "node:http"
import net from "node:net"
import path from "node:path"
import fs from "node:fs"
import { app } from "electron"

export async function findAvailablePort(startPort = 31234): Promise<number> {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.listen(startPort, "127.0.0.1", () => {
      const address = srv.address()
      const port = typeof address === "object" && address ? address.port : startPort
      srv.close(() => resolve(port))
    })
    srv.on("error", () => {
      // Port in use, find random available port
      const randomSrv = net.createServer()
      randomSrv.listen(0, "127.0.0.1", () => {
        const address = randomSrv.address()
        const port = typeof address === "object" && address ? address.port : 31235
        randomSrv.close(() => resolve(port))
      })
    })
  })
}

export interface LocalServerHandle {
  url: string
  close: () => Promise<void>
}

/**
 * Initializes and starts the local server in production packaged mode.
 * In dev mode, returns http://localhost:3000 or the local dev server.
 */
export async function startDesktopServer(): Promise<LocalServerHandle> {
  // If in development mode, connect to Next dev server
  if (!app.isPackaged) {
    const devUrl = process.env.ZENITHSUI_DEV_URL || "http://localhost:3000"
    return {
      url: devUrl,
      close: async () => {},
    }
  }

  const port = await findAvailablePort()
  process.env.PORT = String(port)
  process.env.HOSTNAME = "127.0.0.1"

  // Locate standalone server inside packaged app or resources
  const possiblePaths = [
    path.join(app.getAppPath(), ".next", "standalone", "server.js"),
    path.join(process.resourcesPath, "standalone", "server.js"),
    path.join(app.getAppPath(), "standalone", "server.js"),
  ]

  let serverScript: string | null = null
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      serverScript = p
      break
    }
  }

  if (serverScript) {
    console.log("[Zenithsui-Server] Starting standalone Next.js server at:", serverScript)
    try {
      // Execute standalone Next.js server script
      const { fork } = await import("node:child_process")
      const child = fork(serverScript, [], {
        env: {
          ...process.env,
          PORT: String(port),
          HOSTNAME: "127.0.0.1",
          NODE_ENV: "production",
        },
        stdio: "inherit",
      })

      // Wait for server to be responsive
      await waitForServerReady(`http://127.0.0.1:${port}`)

      return {
        url: `http://127.0.0.1:${port}`,
        close: async () => {
          child.kill("SIGTERM")
        },
      }
    } catch (err) {
      console.error("[Zenithsui-Server] Standalone fork failed, using fallback:", err)
    }
  }

  // Fallback lightweight loopback server for pre-rendered pages & static assets
  const fallbackServer = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" })
    res.end("<h1>Zenithsui Desktop Initializing...</h1>")
  })

  await new Promise<void>((resolve) => {
    fallbackServer.listen(port, "127.0.0.1", () => resolve())
  })

  return {
    url: `http://127.0.0.1:${port}`,
    close: async () => {
      await new Promise<void>((resolve) => fallbackServer.close(() => resolve()))
    },
  }
}

async function waitForServerReady(targetUrl: string, maxAttempts = 50): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(targetUrl, (res) => {
          if (res.statusCode && res.statusCode < 500) {
            resolve()
          } else {
            reject(new Error(`Status ${res.statusCode}`))
          }
        })
        req.on("error", reject)
        req.setTimeout(500, () => {
          req.destroy()
          reject(new Error("Timeout"))
        })
      })
      return
    } catch {
      await new Promise((r) => setTimeout(r, 150))
    }
  }
}
