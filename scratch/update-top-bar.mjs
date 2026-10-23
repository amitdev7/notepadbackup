import fs from 'node:fs';

const filePath = 'components/shell/top-bar.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add useSyncStore import
if (!content.includes('useSyncStore')) {
  content = content.replace(
    'import { FilesPopover } from "@/components/chrome/files-popover"',
    'import { FilesPopover } from "@/components/chrome/files-popover"\r\nimport { useSyncStore } from "@/lib/sync/engine"'
  );
}

// 2. Add status tracking hooks inside TopBar
const hookTarget = `  const [prevFileName, setPrevFileName] = useState(fileName)
  const inputRef = useRef<HTMLInputElement>(null)`.replace(/\r?\n/g, '\r\n');

const hookRepl = `  const [prevFileName, setPrevFileName] = useState(fileName)
  const inputRef = useRef<HTMLInputElement>(null)
  const saveFlash = useSquig((s) => s.saveFlash)
  const syncStatus = useSyncStore((s) => s.status)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    if (saveFlash > 0) {
      setJustSaved(true)
      const t = setTimeout(() => setJustSaved(false), 2000)
      return () => clearTimeout(t)
    }
  }, [saveFlash])`.replace(/\r?\n/g, '\r\n');

content = content.replace(hookTarget, hookRepl);

// 3. Add indicator in JSX right next to FilesPopover
const jsxTarget = `        {/* Files Dropdown & Canvas Manager */}
        <FilesPopover />`.replace(/\r?\n/g, '\r\n');

const jsxRepl = `        {/* Status Indicator */}
        <div
          className="flex items-center gap-1 text-[10px] text-stone-400 dark:text-stone-500 font-mono select-none px-1"
          title={
            syncStatus === "syncing"
              ? "Synchronizing changes..."
              : syncStatus === "synced"
                ? "All changes saved and synced"
                : syncStatus === "conflict"
                  ? "Conflict detected"
                  : syncStatus === "error"
                    ? "Storage or sync error"
                    : "Saved locally"
          }
          aria-live="polite"
        >
          {syncStatus === "syncing" ? (
            <>
              <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" aria-hidden="true" />
              <span className="hidden sm:inline">syncing</span>
            </>
          ) : syncStatus === "conflict" ? (
            <>
              <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              <span className="text-amber-600 dark:text-amber-400 hidden sm:inline">conflict</span>
            </>
          ) : syncStatus === "error" ? (
            <>
              <span className="size-1.5 rounded-full bg-red-500" aria-hidden="true" />
              <span className="text-red-500 hidden sm:inline">save error</span>
            </>
          ) : justSaved ? (
            <>
              <span className="size-1.5 rounded-full bg-emerald-500 transition-colors" aria-hidden="true" />
              <span className="text-emerald-600 dark:text-emerald-400 hidden sm:inline">saved</span>
            </>
          ) : (
            <span className="size-1.5 rounded-full bg-stone-300 dark:bg-stone-600" aria-hidden="true" />
          )}
        </div>

        {/* Files Dropdown & Canvas Manager */}
        <FilesPopover />`.replace(/\r?\n/g, '\r\n');

content = content.replace(jsxTarget, jsxRepl);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated TopBar with save/sync status indicator!');
