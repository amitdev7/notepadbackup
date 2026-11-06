import { useShellStore, DEFAULT_MEDIA_PREFERENCES } from "../lib/shell-store"

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`)
    process.exit(1)
  }
}

async function run() {
  console.log("🧪 Testing Settings Visibility & Media Preferences Controls...")

  // 1. Initial State Check
  const state1 = useShellStore.getState()
  assert(state1.preferences.mediaSettings !== undefined, "mediaSettings must be defined in preferences")
  assert(state1.preferences.mediaSettings.cleanModeDefault === true, "cleanModeDefault defaults to true")
  assert(state1.preferences.mediaSettings.alwaysEnforce1080p === true, "alwaysEnforce1080p defaults to true")
  assert(state1.preferences.mediaSettings.showHeaderControls === true, "showHeaderControls defaults to true")
  console.log("✅ Initial mediaSettings structure verified.")

  // 2. updateMediaSettings test
  useShellStore.getState().updateMediaSettings({
    showHeaderControls: false,
    cleanModeDefault: false,
    showScrubberLine: false,
  })

  const state2 = useShellStore.getState()
  assert(state2.preferences.mediaSettings.showHeaderControls === false, "showHeaderControls updated to false")
  assert(state2.preferences.mediaSettings.cleanModeDefault === false, "cleanModeDefault updated to false")
  assert(state2.preferences.mediaSettings.showScrubberLine === false, "showScrubberLine updated to false")
  assert(state2.preferences.mediaSettings.alwaysEnforce1080p === true, "alwaysEnforce1080p preserved")
  console.log("✅ updateMediaSettings partial update verified.")

  // 3. Master Toggle: setAllVisibility(false) - Hide Everything
  useShellStore.getState().setAllVisibility(false)
  const stateHidden = useShellStore.getState()
  assert(stateHidden.preferences.showToolbar === false, "showToolbar is false")
  assert(stateHidden.preferences.showDock === false, "showDock is false")
  assert(stateHidden.preferences.showMiniMap === false, "showMiniMap is false")
  assert(stateHidden.preferences.showZoomControls === false, "showZoomControls is false")
  assert(stateHidden.preferences.showStatusIndicators === false, "showStatusIndicators is false")
  assert(stateHidden.preferences.showCollabStatus === false, "showCollabStatus is false")
  assert(stateHidden.preferences.clockSettings.showInTopBar === false, "top bar clock is false")
  assert(stateHidden.preferences.clockSettings.showInDock === false, "dock clock is false")
  assert(stateHidden.preferences.mediaSettings.showHeaderControls === false, "media header controls is false")
  assert(stateHidden.preferences.mediaSettings.showScrubberLine === false, "media scrubber line is false")
  assert(stateHidden.preferences.mediaSettings.showHoverControls === false, "media hover controls is false")

  for (const [key, val] of Object.entries(stateHidden.preferences.dockControls)) {
    assert(val === false, `dockControl ${key} should be false when hiding all`)
  }
  console.log("✅ Master 'Hide Everything' (setAllVisibility(false)) successfully hides all interface chrome.")

  // 4. Master Toggle: setAllVisibility(true) - Show Everything
  useShellStore.getState().setAllVisibility(true)
  const stateVisible = useShellStore.getState()
  assert(stateVisible.preferences.showToolbar === true, "showToolbar is true")
  assert(stateVisible.preferences.showDock === true, "showDock is true")
  assert(stateVisible.preferences.showMiniMap === true, "showMiniMap is true")
  assert(stateVisible.preferences.showZoomControls === true, "showZoomControls is true")
  assert(stateVisible.preferences.showStatusIndicators === true, "showStatusIndicators is true")
  assert(stateVisible.preferences.showCollabStatus === true, "showCollabStatus is true")
  assert(stateVisible.preferences.clockSettings.showInTopBar === true, "top bar clock is true")
  assert(stateVisible.preferences.clockSettings.showInDock === true, "dock clock is true")
  assert(stateVisible.preferences.mediaSettings.showHeaderControls === true, "media header controls is true")
  assert(stateVisible.preferences.mediaSettings.showScrubberLine === true, "media scrubber line is true")
  assert(stateVisible.preferences.mediaSettings.showHoverControls === true, "media hover controls is true")

  for (const [key, val] of Object.entries(stateVisible.preferences.dockControls)) {
    assert(val === true, `dockControl ${key} should be true when showing all`)
  }
  console.log("✅ Master 'Show Everything' (setAllVisibility(true)) successfully enables all interface chrome.")

  // 5. Individual Toggles: showStatusIndicators & showCollabStatus
  useShellStore.getState().setShowStatusIndicators(false)
  assert(useShellStore.getState().preferences.showStatusIndicators === false, "setShowStatusIndicators(false) works")
  useShellStore.getState().toggleStatusIndicators()
  assert(useShellStore.getState().preferences.showStatusIndicators === true, "toggleStatusIndicators() works")

  useShellStore.getState().setShowCollabStatus(false)
  assert(useShellStore.getState().preferences.showCollabStatus === false, "setShowCollabStatus(false) works")
  useShellStore.getState().toggleCollabStatus()
  assert(useShellStore.getState().preferences.showCollabStatus === true, "toggleCollabStatus() works")
  console.log("✅ Individual status indicator & collaboration visibility toggles verified.")

  console.log("\n🎉 ALL SETTINGS VISIBILITY AND MEDIA PREFERENCE TESTS PASSED!")
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
