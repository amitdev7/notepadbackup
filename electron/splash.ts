// ---------------------------------------------------------------------------
// Zenithsui Desktop Instant Startup Splash Screen
//
// Displayed within <150ms of application launch to provide immediate visual
// feedback while the standalone Next.js server warms up in the background.
// ---------------------------------------------------------------------------

export function getSplashHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zenithsui</title>
  <style>
    :root {
      --bg: #FAF9F5;
      --fg: #292524;
      --muted: #78716C;
      --bar-bg: #E7E5E4;
      --bar-fill: #1C1917;
      --border: #E7E5E4;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1C1C1F;
        --fg: #F5F5F4;
        --muted: #A8A29E;
        --bar-bg: #292524;
        --bar-fill: #E7E5E4;
        --border: #2E2E32;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
    }
    body {
      background-color: var(--bg);
      color: var(--fg);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      overflow: hidden;
      margin: 0;
    }
    .splash-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      max-width: 360px;
      padding: 32px;
      animation: fadeIn 0.3s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .icon-wrapper {
      position: relative;
      width: 72px;
      height: 72px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-svg {
      width: 100%;
      height: 100%;
      animation: breathe 2.5s ease-in-out infinite;
    }
    @keyframes breathe {
      0%, 100% { transform: scale(1); opacity: 0.95; }
      50% { transform: scale(1.05); opacity: 1; }
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 24px;
      font-style: italic;
    }
    .progress-track {
      width: 180px;
      height: 3px;
      background-color: var(--bar-bg);
      border-radius: 9999px;
      overflow: hidden;
      position: relative;
    }
    .progress-thumb {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 40%;
      background-color: var(--bar-fill);
      border-radius: 9999px;
      animation: shimmer 1.4s ease-in-out infinite;
    }
    @keyframes shimmer {
      0% { left: -40%; width: 30%; }
      50% { width: 60%; }
      100% { left: 100%; width: 30%; }
    }
    .error-box {
      display: none;
      margin-top: 16px;
      padding: 12px 16px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      color: #ef4444;
      font-size: 12px;
      text-align: left;
    }
    .retry-btn {
      display: none;
      margin-top: 16px;
      padding: 8px 18px;
      font-size: 12px;
      font-weight: 600;
      background-color: var(--fg);
      color: var(--bg);
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .retry-btn:hover {
      opacity: 0.85;
    }
  </style>
</head>
<body>
  <div class="splash-container">
    <div class="icon-wrapper">
      <svg class="icon-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="12" width="76" height="76" rx="20" stroke="currentColor" stroke-width="6" fill="none" />
        <!-- Hand-drawn diagonal pen mark -->
        <path d="M28 68 C 38 48, 52 38, 70 30" stroke="currentColor" stroke-width="5" stroke-linecap="round" />
        <!-- Star accent -->
        <path d="M68 56 L 72 68 L 60 64 Z" fill="currentColor" />
        <circle cx="36" cy="36" r="4" fill="currentColor" />
      </svg>
    </div>
    <div class="title">Zenithsui</div>
    <div class="subtitle" id="status-text">warming up the pencils…</div>
    <div class="progress-track" id="progress-track">
      <div class="progress-thumb"></div>
    </div>
    <div class="error-box" id="error-box"></div>
    <button class="retry-btn" id="retry-btn" onclick="location.reload()">Retry Launch</button>
  </div>
  <script>
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === "server-error") {
        document.getElementById("progress-track").style.display = "none";
        document.getElementById("status-text").textContent = "Could not initialize offline canvas";
        const errBox = document.getElementById("error-box");
        errBox.textContent = event.data.message || "Server startup error.";
        errBox.style.display = "block";
        document.getElementById("retry-btn").style.display = "inline-block";
      }
    });
  </script>
</body>
</html>`
}

export function getSplashDataUrl(): string {
  return "data:text/html;charset=utf-8," + encodeURIComponent(getSplashHtml())
}
