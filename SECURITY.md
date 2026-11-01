# Security Policy

The Zenithsui engineering team takes software security, data privacy, and responsible disclosure seriously. Because Zenithsui is an offline-capable, local-first infinite canvas application with cloud sharing and peer-to-peer Wi-Fi collaboration capabilities, maintaining a robust security boundary is vital to our users.

---

## Supported Versions

Only the latest release and the current active development branch receive security patches.

| Version | Supported | Notes |
|---|---|---|
| `0.1.x` | :white_check_mark: | Current active release branch |
| `main` | :white_check_mark: | Latest development branch |
| `< 0.1.0` | :x: | Untagged experimental builds |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues or discussions.**

If you discover a potential vulnerability or security flaw, report it privately using one of the following methods:

1. **GitHub Private Vulnerability Reporting**:
   - Navigate to the repository's [Security Tab](https://github.com/amitdev7/notepadbackup/security).
   - Click on **Advisories** -> **Report a vulnerability**.
   - Provide a detailed summary, steps to reproduce, and a proof of concept (PoC) if available.
2. **Repository Maintainer Contact**:
   - If GitHub private vulnerability reporting is unavailable, reach out privately to the repository owner via their verified GitHub profile.

### What to Include in Your Report
To help us triage and resolve the issue quickly, include:
- A descriptive title and summary of the suspected vulnerability.
- Affected components or endpoints (e.g., `/api/assets/proxy`, share token verification, Electron IPC bridge).
- Clear, step-by-step instructions or scripts to reproduce the vulnerability.
- Potential impact and threat model.
- Suggested remediation or patch if you have one.

---

## Response & Disclosure Process

1. **Acknowledgement**: We aim to acknowledge receipt of security reports within 48 hours.
2. **Assessment & Triage**: Our team will verify and triage the finding, assigning a severity rating based on CVSS standards.
3. **Remediation**: We will develop and test a fix in a private branch or advisory fork.
4. **Coordinated Disclosure**: Once a patch is deployed to production and packaged in a release, we will publish a security advisory crediting the reporter (unless anonymity is requested).

---

## Security Architecture & Design Principles

### 1. Local-First Sandboxing
- Documents, canvas elements, and settings reside in the user's browser using client-side **IndexedDB**.
- No sensitive user canvas content is sent to external servers unless the user explicitly triggers cloud sharing or Wi-Fi peer synchronization.

### 2. Cryptographic Sharing (AES-GCM)
- Cloud-shared documents utilize client-side authenticated encryption (**AES-256-GCM**) with cryptographically random initialization vectors (IVs).
- Decryption keys are embedded strictly in the URL hash fragment (`#key=...`) or signed JWT tokens, ensuring the host infrastructure cannot inspect canvas contents in transit or at rest.

### 3. Server-Side Request Forgery (SSRF) Protection
- The asset proxy endpoint (`/api/assets/proxy`) enforces strict IP and host validation.
- All requests targeting private RFC-1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), loopback (`127.0.0.0/8`, `::1`), and cloud metadata services (`169.254.169.254`) are rejected immediately.
- Only verified image and media MIME types (`image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`, `application/pdf`) are permitted.

### 4. Desktop Electron Security Boundary
- Context isolation (`contextIsolation: true`) is strictly enabled on all renderer windows.
- Node integration (`nodeIntegration: false`) is disabled.
- All native desktop operations (file save, window controls, auto-updater) execute through a hardened, validated `contextBridge` preload interface.
- External URLs open exclusively via the operating system's default browser through `shell.openExternal`.

### 5. Dependency & Supply Chain Hygiene
- Automated dependency vulnerability scanning via Dependabot.
- Lockfile pinning with `pnpm --frozen-lockfile` enforced in all automated CI/CD pipelines.
