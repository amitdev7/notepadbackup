// ---------------------------------------------------------------------------
// Zenithsui Desktop & Automatic Update Engine — Core Type Definitions
// ---------------------------------------------------------------------------

export type UpdateState =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "ready-on-next-launch"
  | "manual-install-pending"
  | "not-available"
  | "error"

export interface DownloadProgressInfo {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export interface DesktopUpdateStatus {
  state: UpdateState
  currentVersion: string
  availableVersion?: string
  downloadProgress?: DownloadProgressInfo
  releaseDate?: string
  releaseNotes?: string
  error?: string
  lastChecked?: number
  isPortable?: boolean
  portableDownloadUrl?: string
  autoInstallPending?: boolean
}

export interface DesktopUpdatePreferences {
  autoCheckUpdates: boolean
  autoDownloadUpdates: boolean
  autoInstallUpdates: boolean
  channel: "stable" | "beta"
}

export const DEFAULT_DESKTOP_UPDATE_PREFERENCES: DesktopUpdatePreferences = {
  autoCheckUpdates: true,
  autoDownloadUpdates: true,
  autoInstallUpdates: true,
  channel: "stable",
}

export interface FileFilterOption {
  name: string
  extensions: string[]
}

export interface SaveFileDialogOptions {
  defaultPath?: string
  data: string | Uint8Array
  filters?: FileFilterOption[]
}

export interface OpenFileDialogOptions {
  filters?: FileFilterOption[]
}

export interface DesktopApi {
  isDesktop: true
  platform: string
  appVersion: string
  isPortable: boolean
  getUpdatePreferences(): Promise<DesktopUpdatePreferences>
  setUpdatePreferences(prefs: Partial<DesktopUpdatePreferences>): Promise<void>
  checkForUpdates(): Promise<void>
  downloadUpdate(): Promise<void>
  installAndRestart(): Promise<void>
  onUpdateStatus(listener: (status: DesktopUpdateStatus) => void): () => void
  openExternal(url: string): Promise<void>
  showItemInFolder(fullPath: string): Promise<void>
  saveFileDialog(options: SaveFileDialogOptions): Promise<{ filePath?: string; canceled: boolean }>
  openFileDialog(options?: OpenFileDialogOptions): Promise<{ filePath?: string; data?: string; canceled: boolean }>
  signalReadyToClose(): Promise<void>
  onSaveBeforeClose(callback: () => Promise<void> | void): () => void
}

declare global {
  interface Window {
    zenithsuiDesktop?: DesktopApi
  }
}
