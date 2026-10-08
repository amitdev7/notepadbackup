import { spawn } from "child_process";
import os from "os";
import path from "path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9223;
const tmpDir = path.join(os.tmpdir(), "chrome_test_ws_" + Date.now());

const proc = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${tmpDir}`,
  "about:blank"
]);

await new Promise(r => setTimeout(r, 1000));
const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
const list = await res.json();
console.log("Targets:", list);
const wsUrl = list[0].webSocketDebuggerUrl;
console.log("wsUrl:", wsUrl);

const ws = new WebSocket(wsUrl);
ws.onopen = () => {
  console.log("WebSocket open");
  ws.send(JSON.stringify({ id: 1, method: "Page.enable" }));
};
ws.onmessage = (e) => {
  console.log("RECV:", e.data);
  if (JSON.parse(e.data).id === 1) {
    ws.send(JSON.stringify({ id: 2, method: "Page.navigate", params: { url: "http://localhost:3000" } }));
  } else if (JSON.parse(e.data).id === 2) {
    console.log("Navigated successfully!");
    ws.close();
    proc.kill();
  }
};
