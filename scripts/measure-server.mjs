import http from "node:http"
import { spawn } from "node:child_process"
import path from "node:path"

console.log("Measuring standalone server startup...")
const t0 = performance.now()
const serverPath = path.resolve("dist-desktop/win-unpacked/resources/standalone/server.js")
const child = spawn(process.execPath, [serverPath], {
  env: { ...process.env, PORT: "39877", HOSTNAME: "127.0.0.1" }
})

let tServerReady = 0
for (let i = 0; i < 50; i++) {
  try {
    await new Promise((resolve, reject) => {
      const req = http.get("http://127.0.0.1:39877/", { timeout: 100 }, (res) => {
        if (res.statusCode === 200) resolve(true)
        else reject()
      })
      req.on("error", reject)
      req.on("timeout", () => { req.destroy(); reject() })
    })
    tServerReady = performance.now() - t0
    break
  } catch {
    await new Promise(r => setTimeout(r, 20))
  }
}

child.kill()
console.log(`Standalone Next.js Server 200 OK in: ${Math.round(tServerReady)}ms`)
