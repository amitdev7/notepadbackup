import fs from 'node:fs';

const filePath = 'components/shell/settings-dialog.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `    case "wifi":
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 space-y-2">
            <h4 className="font-semibold text-stone-900 dark:text-stone-100">Local Network (LAN) Live Publishing</h4>
            <p className="text-[11px] text-stone-500">
              Share live wireframes and study canvases with phones, tablets, and computers on the same Wi-Fi network without cloud upload.
            </p>
          </div>
        </div>
      )`.replace(/\r?\n/g, '\r\n');

const replacement = `    case "wifi": {
      const isLocalMode = preferences.databaseSettings?.storageMode === "local" || !preferences.databaseSettings?.enabled
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsOpen(false)
                  import("@/lib/lan/session").then(({ useWifiSessionStore }) => {
                    useWifiSessionStore.getState().openPublishDialog()
                  })
                }}
                className="shrink-0 text-xs"
              >
                Open Wi-Fi Publish
              </Button>
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
                checked={!isLocalMode && Boolean(preferences.wifiAutoSync)}
                disabled={isLocalMode}
                onCheckedChange={(val) => updatePreferences({ wifiAutoSync: val })}
                aria-label="Toggle automatic Wi-Fi sync"
              />
            </div>
          </div>
        </div>
      )
    }`.replace(/\r?\n/g, '\r\n');

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated case "wifi" in settings-dialog.tsx');
} else {
  console.error('Target not found!');
  process.exit(1);
}
