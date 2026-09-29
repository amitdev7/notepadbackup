// ---------------------------------------------------------------------------
// Zenithsui Local Gateway Discovery Engine
// ---------------------------------------------------------------------------

export interface GatewayStatus {
  online: boolean
  mode: "native" | "browser-fallback"
  gatewayId?: string
  lanIp?: string
  port?: number
  wsEndpoint?: string
  httpEndpoint?: string
  activeSessions?: number
}

const DEFAULT_GATEWAY_PORT = 8787

export async function probeLocalGateway(host = "localhost", port = DEFAULT_GATEWAY_PORT): Promise<GatewayStatus> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Gateway probe timeout")), 800)
  )

  try {
    const fetchPromise = fetch(`http://${host}:${port}/api/status`, {
      method: "GET",
      headers: { Accept: "application/json" },
    })

    const response = (await Promise.race([fetchPromise, timeoutPromise])) as Response

    if (response.ok) {
      const data = await response.json()
      return {
        online: true,
        mode: "native",
        gatewayId: data.gatewayId,
        lanIp: data.lanIp,
        port: data.port || port,
        wsEndpoint: `ws://${data.lanIp || host}:${port}/ws`,
        httpEndpoint: `http://${data.lanIp || host}:${port}`,
        activeSessions: data.activeSessions,
      }
    }
  } catch {
    // Gateway not running on this host/port
  }

  return {
    online: false,
    mode: "browser-fallback",
  }
}

