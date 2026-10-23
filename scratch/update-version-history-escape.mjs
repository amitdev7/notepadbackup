import fs from 'node:fs';

const filePath = 'components/chrome/version-history-panel.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `  useEffect(() => {
    let active = true`.replace(/\r?\n/g, '\r\n');

const replacement = `  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, onClose])

  useEffect(() => {
    let active = true`.replace(/\r?\n/g, '\r\n');

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Added Escape handler to version-history-panel.tsx');
} else {
  console.error('Target not found in version-history-panel.tsx');
  process.exit(1);
}
