# 15 — Zenithsui Voice, Tone & Microcopy Inventory

## 1. The Zenithsui Voice Principles

The verbal identity of Zenithsui is crafted to feel like an analog artist's studio merged with high-end desktop software. It deliberately avoids corporate enterprise jargon:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ZENITHSUI VOICE PILLARS                         │
│                                                                        │
│   HUMBLE & DIRECT          ANALOG WARMTH              ENGINEERED WIT   │
│   • Lowercase phrasing     • Paper, ink, lettering    • Clear rationale│
│   • No marketing buzzwords • "warming up the pencils" • Respects user's│
│   • Brief, punchy clarity  • Real studio terminology   muscle memory   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Microcopy Catalog

### 1. Canvas & Loading Strings
- **App Initializing**: *"warming up the pencils…"*
- **Empty Canvas Prompt**: *"draw something, or tap R to make a box"*
- **Hide Interface Reminder**: *"press ⌘\ to restore chrome"*

### 2. Page & Paper Inspector Copy
- **Font Switch Caption**: *"saved with this drawing — a new file starts from whatever you set last"*
- **Context Row Caption**: *"quick controls float above the selection"*
- **Dot Grid Caption**: *"subtle dot grid to keep wireframes tidy"*
- **Theme Descriptions**:
  - `Internet blue`: *"the classic default blueprint wash"*
  - `Riso red`: *"warm energetic risograph poster ink"*
  - `Terminal green`: *"retro cathode green on warm stock"*
  - `Purple drizzle`: *"plum wash for editorial notes"*
  - `Dirty blond`: *"sun-bleached amber on creamy card"*
  - `Hipster black`: *"deep archival carbon ink on neutral paper"*

### 3. Keyboard Shortcuts Sheet (`components/chrome/shortcuts-sheet.tsx`)
- **Subtitle**: *"mostly Figma's, so your hands already know it"*
- **Dialog Header**: *"Keyboard"*
- **Dismiss Button**: *"close"* (deliberately lowercase)

### 4. File Menu & Top Corner (`components/chrome/top-corner.tsx`)
- **Open Source Link**: *"Contribute on GitHub"*
- **Code Comment / Intent**: *"zenithsui is open source — the one row in here that leaves the app"*
- **Reset Zoom**: *"Reset view (⌘0)"*
- **Clear Canvas**: *"Clear canvas"* (red destructive indicator)

### 5. Toast Feedback Banner (`components/chrome/notice.tsx`)
- **Saved**: *"Saved to this browser"*
- **Copy PNG**: *"Copied picture to clipboard"*
- **Export Copy**: *"Downloaded .zenith canvas"*
- **Duplicate**: *"Duplicated with matching offset"*
- **Locked**: *"Selection locked (⌘L to unlock)"*

### 6. Conflict Resolution Dialog
- **Heading**: *"Someone else edited this while you were away"*
- **Body**: *"Your local version has edits that clash with the version saved on the network. Pick which one to keep, or save your copy as a new file."*
- **Buttons**: `Keep My Edits` / `Accept Network Version` / `Save As Separate File`
