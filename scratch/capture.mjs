import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;
const OUT_DIR = path.resolve("docs/zenithsui-uiux-spec/screenshots");

fs.mkdirSync(OUT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log("Launching headless Chrome on port", PORT);
  const tmpDir = path.join(os.tmpdir(), "chrome_cdp_" + Date.now());
  const proc = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tmpDir}`,
    "about:blank"
  ]);

  proc.on("error", (err) => console.error("Chrome error:", err));

  // Wait for Chrome to listen on port
  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
        wsUrl = list[0].webSocketDebuggerUrl;
        break;
      }
    } catch { }
  }

  if (!wsUrl) {
    console.error("Failed to connect to Chrome CDP");
    proc.kill();
    return;
  }

  console.log("Connected to CDP:", wsUrl);
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

  async function setViewport(width, height, isMobile = false) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: isMobile,
    });
  }

  async function capture(fileName) {
    const res = await send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    const filePath = path.join(OUT_DIR, fileName);
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${fileName} (${buffer.length} bytes)`);
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
    await send("DOM.enable");

    // 1. Desktop Empty Canvas
    console.log("Navigating to Canvas...");
    await setViewport(1440, 900, false);
    await send("Page.navigate", { url: "http://localhost:3000" });
    await sleep(2000);
    await capture("01-canvas-desktop.png");

    // 2. Open Files Popover
    console.log("Opening Files popover...");
    await evaluate(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Files'));
      if (btn) btn.click();
    `);
    await sleep(600);
    await capture("02-files-popover.png");
    // Close popover
    await evaluate(`
      document.body.click();
    `);
    await sleep(400);

    // 3. Open Settings Dialog
    console.log("Opening Settings dialog...");
    await evaluate(`
      const gearBtn = document.querySelector('button[aria-label="Settings"]') || Array.from(document.querySelectorAll('button')).find(b => b.title === 'Settings' || b.getAttribute('aria-label') === 'Settings');
      if (gearBtn) gearBtn.click();
    `);
    await sleep(800);
    await capture("03-settings-dialog.png");

    // Switch to Appearance tab in settings
    await evaluate(`
      const appTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Appearance'));
      if (appTab) appTab.click();
    `);
    await sleep(500);
    await capture("04-settings-appearance.png");

    // Close settings dialog (press Escape)
    await evaluate(`
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    `);
    await sleep(500);

    // 4. Open Library Panel
    console.log("Opening Library panel...");
    await evaluate(`
      const libBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Library') || b.title === 'Library');
      if (libBtn) libBtn.click();
    `);
    await sleep(800);
    await capture("05-library-panel.png");

    // Close library
    await evaluate(`
      const libBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Library') || b.title === 'Library');
      if (libBtn) libBtn.click();
    `);
    await sleep(400);

    // 5. Open Bottom Dock Menu (Brand popover)
    console.log("Opening Brand dock menu...");
    await evaluate(`
      const brandBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('zenithsui'));
      if (brandBtn) brandBtn.click();
    `);
    await sleep(600);
    await capture("06-dock-menu.png");
    // Close
    await evaluate(`document.body.click();`);
    await sleep(400);

    // 6. Open Command Palette (Cmd+K / Ctrl+K)
    console.log("Opening Command Palette...");
    await evaluate(`
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    `);
    await sleep(600);
    await capture("07-command-palette.png");
    await evaluate(`
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    `);
    await sleep(400);

    // 7. Tablet Canvas
    console.log("Capturing Tablet Canvas...");
    await setViewport(820, 1180, false);
    await sleep(1000);
    await capture("08-canvas-tablet.png");

    // 8. Mobile Canvas
    console.log("Capturing Mobile Canvas...");
    await setViewport(390, 844, true);
    await sleep(1000);
    await capture("09-canvas-mobile.png");

    // 9. Dashboard Desktop
    console.log("Navigating to Dashboard Desktop...");
    await setViewport(1440, 900, false);
    await send("Page.navigate", { url: "http://localhost:3000/dashboard" });
    await sleep(1500);
    await capture("10-dashboard-desktop.png");

    // 10. Dashboard Mobile
    console.log("Capturing Dashboard Mobile...");
    await setViewport(390, 844, true);
    await sleep(1000);
    await capture("11-dashboard-mobile.png");

    // 11. Kitchen Sink
    console.log("Navigating to Kitchen Sink...");
    await setViewport(1440, 900, false);
    await send("Page.navigate", { url: "http://localhost:3000/kitchen-sink" });
    await sleep(2500);
    await capture("12-kitchen-sink-components.png");

    // Switch to blocks in Kitchen Sink
    await evaluate(`
      const blocksBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'blocks');
      if (blocksBtn) blocksBtn.click();
    `);
    await sleep(2500);
    await capture("13-kitchen-sink-blocks.png");

    console.log("Screenshot capture complete!");
  } catch (err) {
    console.error("Error during capture:", err);
  } finally {
    ws.close();
    proc.kill();
  }
}

run();
