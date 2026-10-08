import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9224;
const OUT_DIR = path.resolve("docs/zenithsui-uiux-spec/screenshots");

fs.mkdirSync(OUT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log("Launching headless Chrome on port", PORT);
  const tmpDir = path.join(os.tmpdir(), "chrome_modals_" + Date.now());
  const proc = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-extensions",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    "about:blank"
  ]);

  proc.on("error", (err) => console.error("Chrome error:", err));

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
    console.error("Failed to connect to page target CDP");
    proc.kill();
    return;
  }

  console.log("Connected to page target CDP:", wsUrl);
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

  async function setViewport(width, height) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: false,
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

  try {
    await send("Page.enable");
    await setViewport(1440, 900);

    console.log("Navigating to http://localhost:3000...");
    await send("Page.navigate", { url: "http://localhost:3000" });
    await sleep(2500);

    // 1. Files Popover
    console.log("Opening Files Popover...");
    await evaluate(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Files'));
      if (btn) btn.click();
    `);
    await sleep(600);
    await capture("07-files-popover.png");
    // Close
    await evaluate(`document.body.click();`);
    await sleep(400);

    // 2. Settings Dialog
    console.log("Opening Settings Dialog...");
    await evaluate(`
      const gear = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Settings' || b.getAttribute('aria-label') === 'Settings');
      if (gear) gear.click();
    `);
    await sleep(800);
    await capture("08-settings-dialog.png");

    // Close Settings (Escape)
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));`);
    await sleep(500);

    // 3. Library Panel
    console.log("Opening Library Panel...");
    await evaluate(`
      const lib = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Library' || (b.textContent && b.textContent.includes('Library')));
      if (lib) lib.click();
    `);
    await sleep(800);
    await capture("09-library-panel.png");

    // Close Library
    await evaluate(`
      const lib = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Library' || (b.textContent && b.textContent.includes('Library')));
      if (lib) lib.click();
    `);
    await sleep(500);

    // 4. Bottom Dock Menu
    console.log("Opening Bottom Dock Brand Menu...");
    await evaluate(`
      const brand = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('zenithsui'));
      if (brand) brand.click();
    `);
    await sleep(600);
    await capture("10-bottom-dock-menu.png");
    // Close
    await evaluate(`document.body.click();`);
    await sleep(500);

    // 5. Command Palette (Ctrl+K)
    console.log("Opening Command Palette...");
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));`);
    await sleep(600);
    await capture("11-command-palette.png");
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));`);
    await sleep(500);

    // 6. Shortcuts Sheet (?)
    console.log("Opening Shortcuts Sheet (?)...");
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));`);
    await sleep(600);
    await capture("12-shortcuts-sheet.png");
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));`);
    await sleep(500);

    console.log("All interactive modal captures complete!");
  } catch (err) {
    console.error("Error during modal captures:", err);
  } finally {
    ws.close();
    proc.kill();
  }
}

run();
