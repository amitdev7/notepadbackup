import { useShellStore, DEFAULT_PREFERENCES, DEFAULT_DOCK_CONTROLS } from "../lib/shell-store"

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`)
    process.exit(1)
  }
}

async function run() {
  console.log("🧪 Testing Master Website Customizer & Comprehensive Settings Hub...")

  // 1. Initial State Check of new granular visibility fields
  const s1 = useShellStore.getState().preferences
  assert(s1.showDocTitle === true, "showDocTitle should default to true")
  assert(s1.showFilesPopover === true, "showFilesPopover should default to true")
  assert(s1.showContextToolbar === true, "showContextToolbar should default to true")
  assert(s1.showHoverNotes === true, "showHoverNotes should default to true")
  assert(s1.showSnapGuides === true, "showSnapGuides should default to true")
  assert(s1.showLaserRibbon === true, "showLaserRibbon should default to true")
  assert(s1.showPeerCursors === true, "showPeerCursors should default to true")
  assert(s1.showPeerChat === true, "showPeerChat should default to true")
  assert(s1.showNoticeToasts === true, "showNoticeToasts should default to true")
  assert(s1.mediaSettings.showEmbedHeader === true, "showEmbedHeader should default to true")
  assert(s1.mediaSettings.showFallbackCards === true, "showFallbackCards should default to true")
  assert(s1.mediaSettings.hideEmbedScrollbars === true, "hideEmbedScrollbars should default to true")
  assert(s1.showSelectionHandles === true, "showSelectionHandles should default to true")
  assert(s1.showMarqueeBox === true, "showMarqueeBox should default to true")
  assert(s1.dockMagnification === true, "dockMagnification should default to true")
  console.log("✅ 1. Granular visibility defaults verified.")

  // 2. Testing Master Hide Everything
  useShellStore.getState().setAllVisibility(false)
  const sHidden = useShellStore.getState().preferences
  assert(sHidden.showToolbar === false, "showToolbar false")
  assert(sHidden.showDock === false, "showDock false")
  assert(sHidden.showDocTitle === false, "showDocTitle false")
  assert(sHidden.showFilesPopover === false, "showFilesPopover false")
  assert(sHidden.showContextToolbar === false, "showContextToolbar false")
  assert(sHidden.showHoverNotes === false, "showHoverNotes false")
  assert(sHidden.showLaserRibbon === false, "showLaserRibbon false")
  assert(sHidden.showPeerCursors === false, "showPeerCursors false")
  assert(sHidden.showPeerChat === false, "showPeerChat false")
  assert(sHidden.showNoticeToasts === false, "showNoticeToasts false")
  assert(sHidden.mediaSettings.showEmbedHeader === false, "showEmbedHeader false")
  assert(sHidden.mediaSettings.showFallbackCards === false, "showFallbackCards false")
  console.log("✅ 2. Master Hide Everything sets all granular elements to false.")

  // 3. Testing Master Show Everything
  useShellStore.getState().setAllVisibility(true)
  const sVisible = useShellStore.getState().preferences
  assert(sVisible.showToolbar === true, "showToolbar true")
  assert(sVisible.showDock === true, "showDock true")
  assert(sVisible.showDocTitle === true, "showDocTitle true")
  assert(sVisible.showFilesPopover === true, "showFilesPopover true")
  assert(sVisible.showContextToolbar === true, "showContextToolbar true")
  assert(sVisible.showHoverNotes === true, "showHoverNotes true")
  assert(sVisible.showLaserRibbon === true, "showLaserRibbon true")
  assert(sVisible.showPeerCursors === true, "showPeerCursors true")
  assert(sVisible.showPeerChat === true, "showPeerChat true")
  assert(sVisible.showNoticeToasts === true, "showNoticeToasts true")
  assert(sVisible.mediaSettings.showEmbedHeader === true, "showEmbedHeader true")
  assert(sVisible.mediaSettings.showFallbackCards === true, "showFallbackCards true")
  console.log("✅ 3. Master Show Everything sets all granular elements to true.")

  // 4. Testing Workspace Presets
  // Preset A: Minimalist Zen
  useShellStore.getState().applyVisibilityPreset("zen")
  const sZen = useShellStore.getState().preferences
  assert(sZen.showToolbar === false, "zen: toolbar hidden")
  assert(sZen.showDock === false, "zen: dock hidden")
  assert(sZen.showMiniMap === false, "zen: minimap hidden")
  assert(sZen.showContextToolbar === true, "zen: floating toolbar remains active on select")
  console.log("✅ 4a. Minimalist Zen preset verified.")

  // Preset B: Studio Pro
  useShellStore.getState().applyVisibilityPreset("studio")
  const sStudio = useShellStore.getState().preferences
  assert(sStudio.showToolbar === true, "studio: toolbar on")
  assert(sStudio.showDock === true, "studio: dock on")
  assert(sStudio.showMiniMap === true, "studio: minimap on")
  assert(sStudio.performanceSettings.showFpsHud === true, "studio: FPS HUD active")
  console.log("✅ 4b. Studio Pro preset verified.")

  // Preset C: Presenter
  useShellStore.getState().applyVisibilityPreset("presenter")
  const sPresenter = useShellStore.getState().preferences
  assert(sPresenter.showToolbar === false, "presenter: toolbar hidden")
  assert(sPresenter.showDock === false, "presenter: dock hidden")
  assert(sPresenter.showLaserRibbon === true, "presenter: laser ribbon on")
  assert(sPresenter.showPeerCursors === true, "presenter: peer cursors on")
  console.log("✅ 4c. Presenter Mode preset verified.")

  // Preset D: Sketcher
  useShellStore.getState().applyVisibilityPreset("sketcher")
  const sSketcher = useShellStore.getState().preferences
  assert(sSketcher.showToolbar === false, "sketcher: toolbar hidden")
  assert(sSketcher.showDock === true, "sketcher: dock on")
  assert(sSketcher.dockControls.toolDraw === true, "sketcher: draw tool on")
  assert(sSketcher.dockControls.toolEraser === true, "sketcher: eraser on")
  assert(sSketcher.dockControls.toolText === false, "sketcher: text tool off")
  console.log("✅ 4d. Digital Sketcher preset verified.")

  // 5. Testing Export & Import Preferences JSON
  const exportedJson = useShellStore.getState().exportPreferencesJson()
  assert(typeof exportedJson === "string" && exportedJson.length > 50, "Export returns valid JSON string")
  const parsedExport = JSON.parse(exportedJson)
  assert(parsedExport.themeMode !== undefined, "Exported JSON contains themeMode")

  // Test import with a modified accent
  parsedExport.uiAccent = "emerald"
  parsedExport.showDocTitle = false
  const importRes = useShellStore.getState().importPreferencesJson(JSON.stringify(parsedExport))
  assert(importRes.success === true, "Import preferences returned success")
  assert(useShellStore.getState().preferences.uiAccent === "emerald", "Import applied modified uiAccent")
  assert(useShellStore.getState().preferences.showDocTitle === false, "Import applied modified showDocTitle")
  console.log("✅ 5. Export and Import Preferences JSON verified.")

  // 6. Testing Section Reset
  useShellStore.getState().resetSectionPreferences("visibility")
  const sResetVis = useShellStore.getState().preferences
  assert(sResetVis.showToolbar === true, "Reset visibility restored toolbar")
  assert(sResetVis.showDock === true, "Reset visibility restored dock")
  assert(sResetVis.showDocTitle === true, "Reset visibility restored doc title")
  console.log("✅ 6. Reset Section Preferences verified.")

  console.log("\n🎉 ALL MASTER WEBSITE CUSTOMIZER TESTS PASSED 100%!")
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
