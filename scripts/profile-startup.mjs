import { spawn } from "node:child_process"
import http from "node:http"

console.log("=== ZENITHSUI STARTUP TIME BENCHMARK ===")

async function benchmark() {
  const t0 = performance.now()
  const child = spawn("dist-desktop/win-unpacked/Zenithsui.exe", ["--enable-logging"])
  
  let detectedPort = null
  let firstResponse = null
  
  // Poll candidate ports 31234..31240
  const ports = [31234, 31235, 31236, 31237, 31238]
  
  for (let attempt = 0; attempt < 100; attempt++) {
    await new Promise((r) => setTimeout(r, 50))
    for (const p of ports) {
      try {
        const res = await new Promise((resolve, reject) => {
          const req = http.get(`http://127.0.0.1:${p}/`, { timeout: 100 }, (res) => {
            resolve(res.statusCode)
          })
          req.on("error", reject)
          req.on("timeout", () => { req.destroy(); reject(new Error("timeout")) })
        })
        if (res === 200) {
          detectedPort = p
          firstResponse = performance.now() - t0
          break
        }
      } catch {}
    }
    if (detectedPort) break
  }
  
  child.kill()
  console.log(`Port detected: ${detectedPort}`)
  console.log(`Cold Startup (Time to Server 200 OK): ${Math.round(firstResponse)} ms`)
}

benchmark().catch(console.error)
