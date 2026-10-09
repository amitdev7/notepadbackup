# Zenithsui Canvas JSON Schema & Interchange Format Specification

This document describes the JSON serialization, file storage, and clipboard interchange formats supported by Zenithsui Canvas.

---

## 1. Document Format (`.zenithsui.json` / `.sketch.json`)

When saving or exporting a canvas document, the file uses plaintext JSON conforming to the following structure:

### Top-Level Attributes

| Attribute | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `type` | `string` | Format schema identifier | `"zenithsui"` or `"excalidraw"` |
| `version` | `number` | Schema revision version | `2` |
| `source` | `string` | Origin application signature | `"https://zenithsui.com"` |
| `elements` | `Array<Node>` | Array of canvas elements in z-order | `[...]` |
| `appState` | `object` | Canvas configuration & view settings | `{ "viewBackgroundColor": "#ffffff", "gridSize": 20 }` |
| `files` | `object` | Base64 and metadata for embedded images/media | `{ [fileId]: FileData }` |

### Example Schema Payload

```json
{
  "type": "zenithsui",
  "version": 2,
  "source": "https://zenithsui.com",
  "elements": [
    {
      "id": "node-17409210-rect",
      "type": "rectangle",
      "x": 320,
      "y": 180,
      "width": 160,
      "height": 90,
      "strokeColor": "#1971c2",
      "backgroundColor": "#a5d8ff",
      "fillStyle": "hachure",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100
    }
  ],
  "appState": {
    "gridSize": 20,
    "viewBackgroundColor": "#1c1c1f"
  },
  "files": {}
}
```

---

## 2. Clipboard Format

When copying selected elements to the system clipboard, Zenithsui encodes both `text/html` and `text/plain` payloads containing element metadata:

| Attribute | Type | Description |
| :--- | :--- | :--- |
| `type` | `string` | `"zenithsui/clipboard"` or `"excalidraw/clipboard"` |
| `elements` | `Array<Node>` | Array of copied canvas elements |
| `files` | `object` | Embedded image and asset data map |

---

## 3. Element Creation & Timestamp Preservation

Every normalized canvas node maintains a `created: number | null` timestamp representing epoch milliseconds:

- **New element**: Generated with the client's current wall-clock epoch timestamp.
- **Duplicate / Paste**: Receives a fresh timestamp for the newly created instance.
- **Document import**: Preserves original authoring timestamp without resetting to load time.
- **Edits / Style updates**: Preserves original creation timestamp across property alterations.
