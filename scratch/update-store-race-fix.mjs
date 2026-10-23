import fs from 'node:fs';

const filePath = 'lib/store.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add fileSwitchToken declaration
if (!content.includes('let fileSwitchToken = 0')) {
  content = content.replace(
    'let dirty = false',
    'let dirty = false\r\n/** monotonic generation token to prevent stale async document load race conditions */\r\nlet fileSwitchToken = 0'
  );
}

// 2. Update newFile, deleteFile, and openFile to manage and check fileSwitchToken
const targetOpenFile = `  newFile: () => {
    // the file you were on keeps its place in the drawer — this is a new one
    flushSave(get)
    set({
      docId: nanoid(8),
      fileName: "untitled scribbles",
      nodes: {},
      order: [],
      selection: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      renamingFile: false,
      linkOpen: false,
      past: [],
      future: [],
    })
    flushSave(get)
  },

  openFile: (id) => {
    if (id === get().docId) return
    flushSave(get)
    const doc = readFile(id)
    if (!doc) {
      if (typeof window !== "undefined") {
        getLocalDocument(id)
          .then((stored) => {
            if (stored?.doc) {
              const clean = sanitize(stored.doc.nodes, stored.doc.order)
              set({
                docId: stored.id,
                fileName: stored.name,
                nodes: clean.nodes,
                order: clean.order,
                selection: [],
                viewport: { x: 0, y: 0, zoom: 1 },
                renamingFile: false,
                linkOpen: false,
                panel: null,
                past: [],
                future: [],
              })
              if (clean.order.length) fitBox(set, clean.order.map((nid) => clean.nodes[nid]), 1)
              dirty = false
              flushSave(get)
            } else {
              set({ files: dropFile(id) })
            }
          })
          .catch(() => {
            set({ files: dropFile(id) })
          })
        return
      }
      // the index knew about it but the document itself is gone
      set({ files: dropFile(id) })
      return
    }
    const clean = sanitize(doc.nodes, doc.order)
    set({
      docId: doc.id,
      fileName: doc.name,
      nodes: clean.nodes,
      order: clean.order,
      selection: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      renamingFile: false,
      linkOpen: false,
      panel: null,
      past: [],
      future: [],
    })
    // a drawing carries its own ink and paper; one saved before looks existed
    // keeps whatever is on screen rather than snapping to a default
    if (doc.look) wearLook(set, doc.look)
    // frame what's there, but never past life size — 400% on one small
    // rectangle tells you nothing about where you've landed
    if (clean.order.length) fitBox(set, clean.order.map((nid) => clean.nodes[nid]), 1)
    // straight off the drawer, so there is nothing to write back yet
    dirty = false
    flushSave(get)
  },`.replace(/\r?\n/g, '\r\n');

const replacementOpenFile = `  newFile: () => {
    fileSwitchToken += 1
    // the file you were on keeps its place in the drawer — this is a new one
    flushSave(get)
    set({
      docId: nanoid(8),
      fileName: "untitled scribbles",
      nodes: {},
      order: [],
      selection: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      renamingFile: false,
      linkOpen: false,
      past: [],
      future: [],
    })
    flushSave(get)
  },

  openFile: (id) => {
    if (id === get().docId) return
    const token = ++fileSwitchToken
    flushSave(get)
    const doc = readFile(id)
    if (!doc) {
      if (typeof window !== "undefined") {
        getLocalDocument(id)
          .then((stored) => {
            if (token !== fileSwitchToken) return // Discard stale out-of-order load
            if (stored?.doc) {
              const clean = sanitize(stored.doc.nodes, stored.doc.order)
              set({
                docId: stored.id,
                fileName: stored.name,
                nodes: clean.nodes,
                order: clean.order,
                selection: [],
                viewport: { x: 0, y: 0, zoom: 1 },
                renamingFile: false,
                linkOpen: false,
                panel: null,
                past: [],
                future: [],
              })
              if (clean.order.length) fitBox(set, clean.order.map((nid) => clean.nodes[nid]), 1)
              dirty = false
              flushSave(get)
            } else {
              set({ files: dropFile(id) })
            }
          })
          .catch(() => {
            if (token !== fileSwitchToken) return
            set({ files: dropFile(id) })
          })
        return
      }
      // the index knew about it but the document itself is gone
      set({ files: dropFile(id) })
      return
    }
    const clean = sanitize(doc.nodes, doc.order)
    set({
      docId: doc.id,
      fileName: doc.name,
      nodes: clean.nodes,
      order: clean.order,
      selection: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      renamingFile: false,
      linkOpen: false,
      panel: null,
      past: [],
      future: [],
    })
    // a drawing carries its own ink and paper; one saved before looks existed
    // keeps whatever is on screen rather than snapping to a default
    if (doc.look) wearLook(set, doc.look)
    // frame what's there, but never past life size — 400% on one small
    // rectangle tells you nothing about where you've landed
    if (clean.order.length) fitBox(set, clean.order.map((nid) => clean.nodes[nid]), 1)
    // straight off the drawer, so there is nothing to write back yet
    dirty = false
    flushSave(get)
  },`.replace(/\r?\n/g, '\r\n');

if (content.includes(targetOpenFile)) {
  content = content.replace(targetOpenFile, replacementOpenFile);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated store openFile with race condition protection!');
} else {
  console.error('Target openFile block not found in lib/store.ts');
  process.exit(1);
}
