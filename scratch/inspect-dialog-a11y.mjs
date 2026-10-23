import fs from 'node:fs';
for (const f of ['components/dialogs/mermaid-dialog.tsx', 'components/dialogs/stats-dialog.tsx']) {
  const content = fs.readFileSync(f, 'utf8');
  console.log(f, {
    hasRoleDialog: content.includes('role="dialog"'),
    hasAriaModal: content.includes('aria-modal'),
    hasEscapeHandler: content.includes('Escape'),
  });
}
