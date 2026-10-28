---
trigger: always_on
description: Use browser session connections and status checks instead of raw file re-reading.
---

## Browser-based Session Learning

To conserve token budget and leverage real-time state:

Rules:
- **No File Re-reads**: Avoid re-reading large static codebase or configuration files to retrieve system state if the application server is already active.
- **Dynamic Connection**: At the start of a new session, verify the status of the local HTTP or MCP server (e.g., query `http://localhost:9876/status` or `http://localhost:8000`).
- **Terminal Browser Learning**: Use browser automation (Playwright/Puppeteer/curl checks) or direct WebSocket status queries to explore and learn the current environment state dynamically, instead of parsing static files.
