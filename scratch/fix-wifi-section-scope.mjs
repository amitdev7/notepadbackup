import fs from 'node:fs';

const filePath = 'components/shell/settings-dialog.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add setSettingsOpen inside SectionBody if not present
if (!content.includes('const setSettingsOpen = useShellStore((s) => s.setSettingsOpen)')) {
  content = content.replace(
    '  const setAllDockControls = useShellStore((s) => s.setAllDockControls)',
    '  const setAllDockControls = useShellStore((s) => s.setAllDockControls)\r\n  const setSettingsOpen = useShellStore((s) => s.setSettingsOpen)'
  );
}

// 2. Fix case "wifi"
const oldWifi = content.slice(content.indexOf('    case "wifi":'), content.indexOf('    case "privacy":'));

const newWifi = `    case "wifi": {
      const isLocalMode = prefs.databaseSettings?.storageMode === "local" || !prefs.databaseSettings?.enabled
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-semibold text-stone-900 dark:text-stone-100">Local Network (LAN) Live Publishing</h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Share live wireframes and study canvases with phones, tablets, and computers on the same Wi-Fi network without cloud upload.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false)
                  import("@/lib/lan/session").then(({ useWifiSessionStore }) => {
                    useWifiSessionStore.getState().openPublishDialog()
                  })
                }}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-750 transition-colors cursor-pointer"
              >
                Open Wi-Fi Publish
              </button>
            </div>

            <div className="pt-3 border-t border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-stone-800 dark:text-stone-200">
                  Automatic Wi-Fi Sync (Opt-In)
                </p>
                <p className="text-[10px] text-stone-500">
                  {isLocalMode
                    ? "Disabled while in Local-Only mode to prevent all background network requests."
                    : "Automatically discover and synchronize active canvases with peers on your trusted Wi-Fi subnet."}
                </p>
              </div>
              <Switch
                checked={!isLocalMode && Boolean(prefs.wifiAutoSync)}
                disabled={isLocalMode}
                onCheckedChange={(val) => updatePrefs({ wifiAutoSync: val })}
                aria-label="Toggle automatic Wi-Fi sync"
              />
            </div>
          </div>
        </div>
      )
    }\r\n\r\n`;

content = content.replace(oldWifi, newWifi);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed SectionBody wifi case in settings-dialog.tsx');
