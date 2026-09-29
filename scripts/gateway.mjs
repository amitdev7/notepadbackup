// ---------------------------------------------------------------------------
// Zenithsui Local Wi-Fi Gateway Daemon (Mode A)
// Runs on host device, binds to port 8787, serves viewer PWA & WebSocket relay
// ---------------------------------------------------------------------------

import http from "node:http"
import os from "node:os"
import crypto from "node:crypto"

const PORT = parseInt(process.env.ZENITHSUI_GATEWAY_PORT || "8787", 10)
const GATEWAY_ID = `gw_${crypto.randomBytes(8).toString("hex")}`

/**
 * Filter and detect primary LAN IPv4 address.
 * Excludes virtual adapters like Docker, WSL, Tailscale, vEthernet, Loopback.
 */
export function getPrimaryLanIpv4() {
  const interfaces = os.networkInterfaces()
  const candidates = []

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue
    const lowerName = name.toLowerCase()

    // Exclude virtualized network interfaces
    if (
      lowerName.includes("docker") ||
      lowerName.includes("tailscale") ||
      lowerName.includes("vethernet") ||
      lowerName.includes("hyper-v") ||
      lowerName.includes("vmware") ||
      lowerName.includes("virtual")
    ) {
      continue
    }

    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        // Prefer Wi-Fi / WLAN or Ethernet
        const priority = lowerName.includes("wi-fi") || lowerName.includes("wlan") ? 10 : 5
        candidates.push({ ip: addr.address, priority, name })
      }
    }
  }

  candidates.sort((a, b) => b.priority - a.priority)
  return candidates[0]?.ip || "127.0.0.1"
}

// In-memory active sessions and sockets
const activeSessions = new Map()

// Minimal HTML shell served over LAN HTTP
function getViewerHtml(sessionId, pin) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>Zenithsui — Published on Wi-Fi</title>
  <style>
    body { margin: 0; background: #FBFAF5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1c1917; }
    #header { position: fixed; top: 0; left: 0; right: 0; padding: 12px 16px; background: rgba(255,255,255,0.85); backdrop-filter: blur(8px); border-bottom: 1px solid #e7e5e4; display: flex; justify-content: space-between; align-items: center; z-index: 100; font-size: 13px; }
    #status { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #78716c; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
    #canvas-container { padding-top: 60px; height: calc(100vh - 60px); display: flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  <div id="header">
    <div><strong>Zenithsui</strong> · Published on Wi-Fi</div>
    <div id="status"><span class="dot"></span> Connected</div>
  </div>
  <div id="canvas-container">
    <div style="text-align: center; color: #78716c; font-size: 13px;">
      <p style="font-family: serif; font-size: 18px; color: #1c1917; margin-bottom: 6px;">Live Drawing View</p>
      <p>Synchronizing real-time napkin wireframe via local Wi-Fi…</p>
    </div>
  </div>
  <script>
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(protocol + '//' + location.host + '/ws?session=${sessionId}&pin=${pin}&role=viewer');
    ws.onopen = () => console.log('Connected to Zenithsui Gateway');
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        console.log('Received message:', msg);
      } catch (err) {}
    };
  </script>
</body>
</html>`
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`)

  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  // Gateway status endpoint
  if (url.pathname === "/api/status") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(
      JSON.stringify({
        online: true,
        gatewayId: GATEWAY_ID,
        lanIp: getPrimaryLanIpv4(),
        port: PORT,
        activeSessions: activeSessions.size,
      })
    )
    return
  }

  // Standalone LAN Viewer PWA HTML
  if (url.pathname === "/view") {
    const sessionId = url.searchParams.get("session") || "demo"
    const pin = url.searchParams.get("pin") || ""
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    res.end(getViewerHtml(sessionId, pin))
    return
  }

  res.writeHead(404, { "Content-Type": "text/plain" })
  res.end("Not Found")
})

server.listen(PORT, "0.0.0.0", () => {
  const lanIp = getPrimaryLanIpv4()
  console.log(`[zenithsui-gateway] Started Mode A Gateway on port ${PORT}`)
  console.log(`[zenithsui-gateway] Primary LAN IPv4: ${lanIp}`)
  console.log(`[zenithsui-gateway] Local Access URL: http://${lanIp}:${PORT}/view`)
})

