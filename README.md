# zenithsui

A wireframing tool for people who think by drawing.

**[Try it live at zenithsui.sh →](https://notepadbyamit.vercel.app/)**

![A zenithsui canvas: a landing page wireframe drawn in blue ink — nav, hero, feature row, footer — with the tool's rail on the left and the page inspector on the right](docs/hero.jpg)

Open Figma and you get sucked into high fidelity. Open tldraw and you're
hand-drawing every button from scratch. zenithsui sits in between: an infinite
canvas where you drag in real UI components, but everything renders as a
hand-drawn sketch.

The sketchy look is the whole point. It's a napkin, not a mockup — nothing
looks decided, so people give feedback on the idea instead of the corner
radius, and you can try a layout three ways in the time one polished version
takes.

## What's in it

**Infinite canvas.** Pan, zoom, multi-select, marquee, smart-guide snapping,
keyboard nudge, undo/redo. Everything you'd expect.

**A real component library.** The shadcn/ui vocabulary — buttons, inputs,
selects, switches, tables, dialogs, tabs, nav, sidebars — plus blocks (heroes,
pricing, FAQ, AI chat, checkout, kanban) and whole screen templates.

**Everything is a component with variants.** Drop a button, and the inspector
flips it: icon left, icon right, size, filled or outline. It stays a component
while you do that — you're switching variants, not editing shapes.

**Break apart when you need to.** If no variant covers what you want, break the
component and its pieces become editable primitives. One-way, on purpose.

**⌘K searches everything.** Tools, actions, and every component and block, in
one sheet. Enter drops it in the middle of your view.

**Paste whatever you've got.** ⌘V takes the clipboard and puts it where the
pointer is: a screenshot to wireframe around, a paragraph of copy, or layers
copied out of another zenithsui tab. Pictures land as themselves inside a drawn
frame — a reference you can't read is no reference — and get shrunk on the way
in, so a retina screenshot doesn't eat the drawer.

**Your files stay in your browser.** Every document autosaves as you draw, and
the file menu keeps a list of the recent ones to open again. New file starts a
new document rather than painting over the last one. The drawer holds the last
forty; past that, and when the browser runs out of room, the oldest ones go.
No accounts, no cloud — which also means clearing site data clears the lot, so
Export a copy (`⇧⌘S`) is there when a file matters.

## Keyboard

Figma's, so your hands already know it. `?` opens the full list in the app.

| | |
|---|---|
| `V` `R` `O` `P` `T` `L` `⇧L` | select, rectangle, ellipse, draw, text, line, arrow |
| `C` / `B` | components / blocks panel |
| `⌘K` / `⌘/` | search everything (`⌘K` over text links it instead) |
| `⌘Z` / `⇧⌘Z` | undo / redo |
| `⌘D`, `⌥`-drag | duplicate |
| `⌘C` `⌘X` `⌘V` / `⇧⌘V` | copy, cut, paste at cursor / paste in place |
| `⌘G` / `⇧⌘G` | group / ungroup — and ungroup detaches an instance |
| `⌥⌘B` | detach instance |
| `⌘`-click, double-click | reach inside a group |
| `⌘]` / `⌘[` | bring forward / send backward |
| `⌥⌘]` / `⌥⌘[` (or `]` / `[`) | bring to front / send to back |
| `⇧H` / `⇧V` | flip horizontal / vertical |
| `⌘B` `⌘I` `⌘U` | bold, italic, underline |
| `⌘S` / `⇧⌘S` | save to this browser / export a copy |
| arrows (`⇧` for 10px) | nudge |
| space-drag, middle-drag | pan |
| `⌘+` / `⌘-`, `⌘`-scroll | zoom the canvas, never the browser |
| `⇧0` `⇧1` `⇧2` | 100%, fit, selection |
| `⌘\` | hide the interface |

## Deploying to Vercel

1. **Push your repository** to GitHub, GitLab, or Bitbucket.
2. **Import into Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new) and select your repository.
   - Framework preset: **Next.js** (automatically detected).
3. **Configure Environment Variables** in your Vercel Project Settings:
   - `GEMINI_API_KEY`: *(Recommended)* Google Gemini API key for AI assistant features.
   - `OPENAI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`: *(Optional)* If using external AI providers.
   - `ZENITHSUI_SECRET_KEY`: *(Optional)* Secret for server encryption and credentials.
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`: *(Optional)* If connecting Supabase cloud storage.
4. **Deploy**: Click **Deploy**. Vercel will build with `next build` and deploy the serverless functions seamlessly.



