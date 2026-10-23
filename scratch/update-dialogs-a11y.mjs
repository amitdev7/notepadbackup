import fs from 'node:fs';

// 1. Mermaid Dialog
let mermaid = fs.readFileSync('components/dialogs/mermaid-dialog.tsx', 'utf8');

const mTarget1 = `  const [code, setCode] = useState(MERMAID_TEMPLATES.flowchart_td)
  const [activeTemplate, setActiveTemplate] = useState<keyof typeof MERMAID_TEMPLATES>("flowchart_td")

  if (!open) return null`.replace(/\r?\n/g, '\r\n');

const mRepl1 = `  const [code, setCode] = useState(MERMAID_TEMPLATES.flowchart_td)
  const [activeTemplate, setActiveTemplate] = useState<keyof typeof MERMAID_TEMPLATES>("flowchart_td")

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, setOpen])

  if (!open) return null`.replace(/\r?\n/g, '\r\n');

mermaid = mermaid.replace(mTarget1, mRepl1);

const mTarget2 = `<div className="macos-window relative w-full max-w-xl overflow-hidden rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/95 dark:bg-[#1C1C1F]/95 shadow-2xl flex flex-col max-h-[90vh] animate-modal-enter">`;
const mRepl2 = `<div role="dialog" aria-modal="true" aria-labelledby="mermaid-dialog-title" className="macos-window relative w-full max-w-xl overflow-hidden rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/95 dark:bg-[#1C1C1F]/95 shadow-2xl flex flex-col max-h-[90vh] animate-modal-enter">`;

mermaid = mermaid.replace(mTarget2, mRepl2);
mermaid = mermaid.replace(
  '<h2 className="text-xs font-semibold text-stone-900 dark:text-stone-100">Insert Mermaid Diagram</h2>',
  '<h2 id="mermaid-dialog-title" className="text-xs font-semibold text-stone-900 dark:text-stone-100">Insert Mermaid Diagram</h2>'
);

fs.writeFileSync('components/dialogs/mermaid-dialog.tsx', mermaid, 'utf8');
console.log('Updated components/dialogs/mermaid-dialog.tsx');

// 2. Stats Dialog
let stats = fs.readFileSync('components/dialogs/stats-dialog.tsx', 'utf8');

if (!stats.includes('useEffect')) {
  stats = stats.replace('import { useState }', 'import { useState, useEffect }');
}

const sTarget1 = `  if (!open) return null`.replace(/\r?\n/g, '\r\n');
const sRepl1 = `  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, setOpen])

  if (!open) return null`.replace(/\r?\n/g, '\r\n');

stats = stats.replace(sTarget1, sRepl1);

const sTarget2 = `<div className="macos-window relative w-full max-w-xl overflow-hidden rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/95 dark:bg-[#1C1C1F]/95 shadow-2xl flex flex-col max-h-[90vh] animate-modal-enter">`;
const sRepl2 = `<div role="dialog" aria-modal="true" aria-labelledby="stats-dialog-title" className="macos-window relative w-full max-w-xl overflow-hidden rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/95 dark:bg-[#1C1C1F]/95 shadow-2xl flex flex-col max-h-[90vh] animate-modal-enter">`;

stats = stats.replace(sTarget2, sRepl2);
stats = stats.replace(
  '<h2 className="text-xs font-semibold text-stone-900 dark:text-stone-100">Canvas & Element Statistics</h2>',
  '<h2 id="stats-dialog-title" className="text-xs font-semibold text-stone-900 dark:text-stone-100">Canvas & Element Statistics</h2>'
);

fs.writeFileSync('components/dialogs/stats-dialog.tsx', stats, 'utf8');
console.log('Updated components/dialogs/stats-dialog.tsx');
