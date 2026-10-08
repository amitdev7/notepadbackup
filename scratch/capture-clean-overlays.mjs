import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9225;
const OUT_DIR = path.resolve("docs/zenithsui-uiux-spec/screenshots");

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const tmpDir = path.join(os.tmpdir(), "chrome_clean_" + Date.now());
  const proc = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-extensions",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    "about:blank"
  ]);

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const pageTarget = list.find((t) => t.type === "page");
      if (pageTarget && pageTarget.webSocketDebuggerUrl) {
        wsUrl = pageTarget.webSocketDebuggerUrl;
        break;
      }
    } catch { }
  }

  if (!wsUrl) {
    proc.kill();
    return;
  }

  const ws = new WebSocket(wsUrl);
  let idCounter = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function capture(fileName) {
    const res = await send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    const filePath = path.join(OUT_DIR, fileName);
    fs.writeFileSync(filePath, buffer);
    console.log(`[OK] Saved screenshot: ${fileName} (${buffer.length} bytes)`);
  }

  async function evaluate(expression) {
    return await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
  }

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });

  // A. Library Panel
  await send("Page.navigate", { url: "http://localhost:3000" });
  await sleep(2500);
  await evaluate(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Library' || b.getAttribute('aria-label') === 'Library' || (b.textContent && b.textContent.includes('Library')));
    if (btn) btn.click();
  `);
  await sleep(1000);
  await capture("09-library-panel.png");

  // B. Command Palette
  await send("Page.navigate", { url: "http://localhost:3000" });
  await sleep(2500);
  await evaluate(`
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  `);
  await sleep(1000);
  await capture("11-command-palette.png");

  // C. Shortcuts Sheet
  await send("Page.navigate", { url: "http://localhost:3000" });
  await sleep(2500);
  await evaluate(`
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
  `);
  await sleep(1000);
  await capture("12-shortcuts-sheet.png");

  // D. Search Overlay
  await send("Page.navigate", { url: "http://localhost:3000" });
  await sleep(2500);
  await evaluate(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Search' || b.getAttribute('aria-label') === 'Search');
    if (btn) btn.click();
  `);
  await sleep(1000);
  await capture("13-canvas-search.png");

  // E. Stats Overlay
  await send("Page.navigate", { url: "http://localhost:3000" });
  await sleep(2500);
  await evaluate(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Stats' || b.getAttribute('aria-label') === 'Stats');
    if (btn) btn.click();
  `);
  await sleep(1000);
  await capture("14-canvas-stats.png");

  ws.close();
  proc.kill();
  console.log("Clean overlays captured!");
}

run();
