// ---------------------------------------------------------------------------
// Zenithsui Desktop — Secure Preload Bridge
//
// Strict Context Isolation & Security Boundaries:
// - Never exposes raw Node.js APIs or arbitrary IPC channels to renderer
// - Exposes typed, validated methods under window.zenithsuiDesktop
// ---------------------------------------------------------------------------

import { contextBridge, ipcRenderer } from "electron"
import type {
  DesktopApi,
  DesktopUpdatePreferences,
  DesktopUpdateStatus,
  SaveFileDialogOptions,
  OpenFileDialogOptions,
} from "./types.js"

const desktopBridge: DesktopApi = {
  isDesktop: true,
  platform: process.platform,
  appVersion: ipcRenderer.sendSync("desktop:get-version-sync") || "0.1.0",
  isPortable: Boolean(ipcRenderer.sendSync("desktop:get-is-portable-sync")),

  getUpdatePreferences: (): Promise<DesktopUpdatePreferences> => {
    return ipcRenderer.invoke("desktop:get-update-preferences")
  },

  setUpdatePreferences: (prefs: Partial<DesktopUpdatePreferences>): Promise<void> => {
    return ipcRenderer.invoke("desktop:set-update-preferences", prefs)
  },

  checkForUpdates: (): Promise<void> => {
    return ipcRenderer.invoke("desktop:check-for-updates")
  },

  downloadUpdate: (): Promise<void> => {
    return ipcRenderer.invoke("desktop:download-update")
  },

  installAndRestart: (): Promise<void> => {
    return ipcRenderer.invoke("desktop:install-and-restart")
  },

  onUpdateStatus: (listener: (status: DesktopUpdateStatus) => void): (() => void) => {
    const handler = (_event: any, status: DesktopUpdateStatus) => {
      listener(status)
    }
    ipcRenderer.on("desktop:update-status-changed", handler)
    return () => {
      ipcRenderer.removeListener("desktop:update-status-changed", handler)
    }
  },

  openExternal: (url: string): Promise<void> => {
    // Only allow http, https, mailto protocols
    if (typeof url === "string" && /^(https?|mailto):/i.test(url)) {
      return ipcRenderer.invoke("desktop:open-external", url)
    }
    return Promise.reject(new Error("Invalid external protocol"))
  },

  showItemInFolder: (fullPath: string): Promise<void> => {
    return ipcRenderer.invoke("desktop:show-item-in-folder", fullPath)
  },

  saveFileDialog: (options: SaveFileDialogOptions) => {
    return ipcRenderer.invoke("desktop:save-file-dialog", options)
  },

  openFileDialog: (options?: OpenFileDialogOptions) => {
    return ipcRenderer.invoke("desktop:open-file-dialog", options)
  },

  signalReadyToClose: (): Promise<void> => {
    return ipcRenderer.invoke("desktop:signal-ready-to-close")
  },

  onSaveBeforeClose: (callback: () => Promise<void> | void): (() => void) => {
    const handler = async () => {
      try {
        await callback()
      } finally {
        ipcRenderer.invoke("desktop:signal-ready-to-close")
      }
    }
    ipcRenderer.on("desktop:prepare-to-close", handler)
    return () => {
      ipcRenderer.removeListener("desktop:prepare-to-close", handler)
    }
  },
}

contextBridge.exposeInMainWorld("zenithsuiDesktop", desktopBridge)
