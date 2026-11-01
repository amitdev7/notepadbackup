# Zenithsui Troubleshooting & Operational Runbook

This document provides solutions for common development, installation, build, and runtime issues encountered in **Zenithsui**.

---

## 1. Installation & Dependency Issues

### `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` or Lockfile Rejection
- **Cause**: Using `npm` or `yarn` instead of `pnpm`, or using an incompatible pnpm version.
- **Solution**:
  ```bash
  # Ensure pnpm 10.4.1 is active
  corepack enable
  corepack prepare pnpm@10.4.1 --activate
  
  # Install strictly using frozen lockfile
  pnpm install --frozen-lockfile
  ```

### Windows Execution Policy Prevents Running `pnpm`
- **Cause**: PowerShell script execution policy defaults to `Restricted`.
- **Solution**:
  Open an elevated PowerShell prompt or run:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```

---

## 2. Development Server Issues

### Port 3000 Already in Use
- **Cause**: Another Next.js instance or development server is running on port 3000.
- **Solution**:
  Specify an alternate port:
  ```bash
  pnpm dev -p 3001
  ```
  Or kill the existing process on Windows:
  ```powershell
  Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
  ```

### Turbopack Build or Cache Corruptions
- **Cause**: Stale artifacts in `.next` or TypeScript build cache.
- **Solution**:
  ```bash
  # Remove cached build artifacts
  rm -rf .next tsconfig.tsbuildinfo
  pnpm dev
  ```

---

## 3. Storage & Browser Issues

### IndexedDB Quota Exceeded or Not Persisting in Incognito
- **Cause**: Browsers in Private/Incognito mode enforce strict storage limits (often < 50 MB) and evict IndexedDB records when windows close.
- **Solution**:
  - Test persistent multi-document workflows in standard browser profiles.
  - Export important canvases via **⌘S** -> **Export a Copy** (`.zenithsui.json`).
  - Clear corrupted local testing databases via console:
    ```javascript
    indexedDB.deleteDatabase("zenithsui_db");
    ```

---

## 4. Desktop Build (Electron) Issues

### `Cannot find module 'electron-updater'` in Electron Standalone
- **Cause**: Electron standalone builds require CommonJS resolution for native updater packages.
- **Solution**:
  Run `pnpm desktop:build`, which invokes `scripts/prepare-standalone.mjs` to stage dependencies and bundle the CJS preload bridge automatically.

### Code Signing Warnings on Windows
- **Cause**: Windows SmartScreen flags newly generated installers without an EV code-signing certificate.
- **Solution**:
  For internal development and testing, click **More info** -> **Run anyway**. For production enterprise distribution, configure signing certificates in GitHub Secrets (`CSC_LINK` and `CSC_KEY_PASSWORD`).

---

## 5. Asset Proxy SSRF Rejections

### `403 Forbidden: Blocked private network destination`
- **Cause**: Attempting to embed images from `http://localhost:...`, `http://192.168.x.x`, or `http://127.0.0.1` into the canvas via `/api/assets/proxy`.
- **Solution**:
  This is an intentional SSRF security control. To embed local images during offline development, drag and drop the image file directly onto the canvas. It will be stored safely inside client-side IndexedDB as a binary blob without proxy routing.
