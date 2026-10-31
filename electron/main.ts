// ---------------------------------------------------------------------------
// Zenithsui Windows Desktop Application — Main Process
//
// Features:
// - Native Windows frame & window controls
// - Context-isolated, secure preload bridge
// - Next.js local embedded server for 100% offline startup
// - Graceful shutdown with automatic document state flush
// - Automatic update engine (check, download, next-launch installation)
// ---------------------------------------------------------------------------

import { app, BrowserWindow, shell } from "electron"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { startDesktopServer, type LocalServerHandle } from "./server.js"
import { DesktopUpdaterService } from "./updater.js"
import { registerIpcHandlers } from "./ipc.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null
let serverHandle: LocalServerHandle | null = null
let isQuitting = false
let updaterService: DesktopUpdaterService | null = null

async function createWindow() {
  const iconPath = path.join(__dirname, "..", "public", "favicon.ico")

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Zenithsui",
    icon: iconPath,
    backgroundColor: "#FAF9F5",
    show: false, // Show once ready-to-show to prevent white flash
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  // Connect updater to main window for status broadcasts
  if (updaterService) {
    updaterService.setWindow(mainWindow)
  }

  // Gracefully handle close to ensure canvas work is safely saved
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault()
      console.log("[Zenithsui-Desktop] Window close requested, signalling save flush...")
      
      let forced = false
      const forceCloseTimeout = setTimeout(() => {
        forced = true
        isQuitting = true
        mainWindow?.destroy()
      }, 2500)

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("desktop:prepare-to-close")
      }

      // Handler when renderer signals it is ready
      onRendererReady = () => {
        if (!forced) {
          clearTimeout(forceCloseTimeout)
          isQuitting = true
          mainWindow?.destroy()
        }
      }
    }
  })

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show()
    console.log("[Zenithsui-Desktop] Main window rendered successfully.")

    // Trigger initial automatic update check if enabled
    if (updaterService) {
      const prefs = updaterService.getPreferences()
      if (prefs.autoCheckUpdates) {
        setTimeout(() => {
          void updaterService?.checkForUpdates()
        }, 3000)
      }
    }
  })

  // Prevent internal navigation to external sites
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?|mailto):/i.test(url)) {
      void shell.openExternal(url)
    }
    return { action: "deny" }
  })

  mainWindow.webContents.on("will-navigate", (e, url) => {
    if (serverHandle && !url.startsWith(serverHandle.url)) {
      e.preventDefault()
      void shell.openExternal(url)
    }
  })

  // Start local server and load URL
  try {
    serverHandle = await startDesktopServer()
    console.log("[Zenithsui-Desktop] Loading interface from:", serverHandle.url)
    await mainWindow.loadURL(serverHandle.url)
  } catch (err) {
    console.error("[Zenithsui-Desktop] Failed to load application interface:", err)
  }
}

let onRendererReady = () => {
  isQuitting = true
  mainWindow?.destroy()
}

// Second instance launch: focus existing window
app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// Application lifecycle
app.whenReady().then(async () => {
  console.log("[Zenithsui-Desktop] Starting Zenithsui Desktop v" + app.getVersion())

  // Initialize update service
  updaterService = new DesktopUpdaterService()

  // Phase 4: Check if an update was downloaded and is pending installation on this launch
  const updateApplied = updaterService.handleStartupPendingUpdate()
  if (updateApplied) {
    console.log("[Zenithsui-Desktop] Restarting into applied update...")
    return
  }

  // Register IPC bridge
  registerIpcHandlers(
    updaterService,
    () => mainWindow,
    () => {
      onRendererReady()
    }
  )

  await createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow()
    }
  })
})

app.on("window-all-closed", async () => {
  if (serverHandle) {
    await serverHandle.close()
  }
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("before-quit", async () => {
  isQuitting = true
  if (serverHandle) {
    await serverHandle.close()
  }
})
