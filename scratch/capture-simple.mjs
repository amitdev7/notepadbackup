import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT_DIR = path.resolve("docs/zenithsui-uiux-spec/screenshots");

fs.mkdirSync(OUT_DIR, { recursive: true });

function captureOne(url, outName, width = 1440, height = 900, budget = 5000) {
  return new Promise((resolve, reject) => {
    const outFile = path.join(OUT_DIR, outName);
    const tmpDir = path.join(os.tmpdir(), "chrome_cap_" + Date.now() + "_" + Math.random().toString(36).slice(2));
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      `--window-size=${width},${height}`,
      `--virtual-time-budget=${budget}`,
      `--user-data-dir=${tmpDir}`,
      `--screenshot=${outFile}`,
      url
    ];

    const p = spawn(CHROME, args);
    p.on("close", (code) => {
      if (fs.existsSync(outFile)) {
        const stats = fs.statSync(outFile);
        console.log(`[OK] ${outName} (${stats.size} bytes)`);
        resolve(outFile);
      } else {
        console.error(`[FAIL] ${outName} (exit code ${code})`);
        resolve(null);
      }
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch { }
    });
  });
}

async function main() {
  console.log("Capturing screenshots for Zenithsui UI/UX Specification...");

  await captureOne("http://localhost:3000", "01-canvas-desktop.png", 1440, 900, 4000);
  await captureOne("http://localhost:3000", "02-canvas-tablet.png", 820, 1180, 4000);
  await captureOne("http://localhost:3000", "03-canvas-mobile.png", 390, 844, 4000);
  await captureOne("http://localhost:3000/dashboard", "04-dashboard-desktop.png", 1440, 900, 4000);
  await captureOne("http://localhost:3000/dashboard", "05-dashboard-mobile.png", 390, 844, 4000);
  await captureOne("http://localhost:3000/kitchen-sink", "06-kitchen-sink-desktop.png", 1440, 1200, 5000);

  console.log("All captures completed.");
}

main();

