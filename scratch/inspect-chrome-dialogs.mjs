import fs from 'node:fs';
const files = [
  'components/chrome/share-dialog.tsx',
  'components/chrome/trash-dialog.tsx',
  'components/chrome/notifications-panel.tsx',
  'components/chrome/version-history-panel.tsx',
  'components/chrome/migration-dialog.tsx',
  'components/chrome/conflict-dialog.tsx',
];
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  console.log(f, {
    hasRoleDialog: content.includes('role="dialog"'),
    hasAriaModal: content.includes('aria-modal'),
    hasEscape: content.includes('Escape'),
  });
}
