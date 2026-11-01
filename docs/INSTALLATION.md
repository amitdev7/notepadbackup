# Zenithsui Installation Guide

This guide covers installing and deploying **Zenithsui** across different environments: local development, Docker self-hosting, and standalone native desktop.

---

## 1. System Requirements

### Hardware
- **CPU**: Dual-core x86_64 or ARM64 processor (Apple Silicon supported natively)
- **RAM**: Minimum 4 GB (8 GB recommended for large canvases with 5,000+ nodes)
- **Disk Space**: 500 MB free space for application and dependencies

### Software
- **Operating System**: macOS 12+, Windows 10/11, or modern Linux (Ubuntu 22.04+)
- **Node.js**: `20.x`, `22.x` (recommended), or `24.x`
- **pnpm**: `>= 10.4.0` (pinned to `10.4.1`)

---

## 2. Standard Web Setup (Recommended)

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/amitdev7/notepadbackup.git
   cd notepadbackup
   ```

2. **Verify Node and pnpm**:
   ```bash
   node -v
   corepack enable
   corepack prepare pnpm@10.4.1 --activate
   ```

3. **Install Dependencies**:
   ```bash
   pnpm install --frozen-lockfile
   ```

4. **Initialize Environment Variables**:
   ```bash
   cp .env.example .env.local
   ```
   *(All features have 100% offline fallbacks out of the box).*

5. **Start Development Server**:
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

6. **Build for Production**:
   ```bash
   pnpm build
   pnpm start
   ```

---

## 3. Desktop Application Installation (Windows)

Zenithsui is packaged as a high-performance native desktop application powered by Electron:

### From Pre-built Release
1. Navigate to the [Releases](https://github.com/amitdev7/notepadbackup/releases) page.
2. Download either:
   - **Installer**: `zenithsui-Setup-<version>.exe` (Full NSIS setup with auto-update support)
   - **Portable**: `zenithsui-Portable-<version>.exe` (Standalone single executable, no installation required)
3. Run the installer or execute the portable binary.

### Building Desktop Packages from Source
On a Windows build machine:

```bash
# Build standalone Next.js assets and compile Electron main process
pnpm desktop:build

# Generate NSIS Installer
pnpm desktop:dist:nsis

# Generate Portable Executable
pnpm desktop:dist:portable

# Output files will be located in: dist-desktop/
```

---

## 4. Docker Self-Hosting

Zenithsui can be deployed inside containerized environments using Docker and Docker Compose:

```bash
# Build and run using Docker Compose
docker compose -f docker-compose.zenithsui.yml up -d --build
```

Access the instance on port `80` (or the configured host port).
