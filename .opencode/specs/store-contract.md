# Store Contract — useSquig (lib/store.ts)

> Spec snapshot — do NOT edit lib/store.ts to match this; this file documents the verified contract.

Note: lib/ai/ai-store.ts (useZenithAI) is a SEPARATE store — out of scope. Legacy destructured useSquig() sites (pan/zoom/selectedIds/select/addNode) must keep working as compat.

Contract content (grouped, all verified from grep of useSquig across app/, components/, lib/ — ~105 state fields, ~95 actions):

1. Document core: nodes: Record<string,SquigNode>, order: string[], selection: string[], docId: string|null, fileName: string, renamingFile: boolean, editingId: string|null, viewport: Viewport {x,y,zoom}, hydrated: boolean, hydrate(), loadDoc(text:string): boolean, serialize(): string, newFile/openFile/deleteFile/saveNow/retrySave/scheduleSave/flushSave, saveStatus: saving|syncing|offline|failed|saved, setFileName/setRenamingFile/setEditing/setSelection/selectNone/selectAll/setViewport/zoomBy/zoomToFit/zoomTo100/zoomToSelection, addNode/addNodes/updateNode/updateNodes/removeNodes/insertComponent, checkpoint/revertToCheckpoint, undo/redo, edit guard via isReadOnly/permissionRole.
2. Selection/edit ops: duplicateSelected/copySelected/cutSelected/pasteClipboard/deleteSelected, groupSelected/ungroupSelected, bringToFront/bringForward/sendBackward/sendToBack, alignSelected/distributeSelected/flipSelected, lockSelected/unlockSelected/toggleLockSelected, setLinkOnSelection, handleRemotePatch.
3. File drawer: files: FileMeta[], dbFiles, openFile/deleteFile/newFile/clearCanvas.
4. Database: databaseModalOpen, selectedDbId: string|null, isSyncingDb: boolean, dbFiles, files, setDatabaseModalOpen/selectDatabase/syncDatabaseFiles.
5. Share: shareModalOpen, shareConfig: ClientSafeShareConfig|null, isLoadingShare, setShareModalOpen/updateShareSettings/revokeShare.
6. Versions: versionHistoryOpen, versions: PageVersionMeta[], isLoadingVersions, isRestoringVersion, previewVersion: PageVersion|null, openVersionHistory/closeVersionHistory/fetchVersions/previewVersionById/restoreVersion/exitVersionPreview.
7. Realtime/collab: collabStatus: CollabStatus, collaborators: Collaborator[], collabRevision: number, connectSSE/broadcastPresence/handleRemotePatch/catchUpMissedPatches/handleConnectionDrop/handleNetworkOnline/handleNetworkOffline.
8. Auth/teams: currentUser: ClientSafeUser|null, authModalOpen, teams: TeamClientSummary[], currentTeamId, currentTeamDetails, setAuthModalOpen/setCurrentUser/fetchTeams/switchTeam/setTeamSettingsModalOpen/setCreateTeamModalOpen/invitationModalToken/setInvitationModalToken.
9. UI modals: uiHidden/setUiHidden, commandOpen/setCommandOpen, shortcutsOpen/setShortcutsOpen, panel/setPanel, pagePanel/setPagePanel/togglePagePanel, contextRow/setContextRow, contextMenu/setContextMenu, linkOpen/setLinkOpen, workspaceHomeOpen/setWorkspaceHomeOpen, handwritingModalOpen/setHandwritingModalOpen, colorSizeStudioOpen/setColorSizeStudioOpen, activeStudioTab/setActiveStudioTab, passwordModalOpen/setPasswordModalOpen, unlockModalOpen/setUnlockModalOpen, teamSettingsModalOpen, createTeamModalOpen, presentationMode + presentationPointerType/presentationTimer/presentationTimerRunning + setters + resetPresentationTimer, slmLearningModalOpen/setSlmLearningModalOpen.
10. Clipboard: clipboard: SquigNode[], copySelected/cutSelected/pasteClipboard.
11. PDF classroom: activePdfModalNodeId: string|null, setActivePdfModalNodeId/openClassroom, updateNode/drawColor.
12. Look/theme: theme/paper/font/grid/drawColor/textColor/pencilGrade/shapeKind/arrowHead/smartSketch + setters/toggles, elementDefaults/setElementDefault/resetElementDefaults/applyStudioPreset/applyDefaultsToSelection, pendingSuggestion/applyPendingSuggestion/dismissPendingSuggestion, slmLearningTarget, notice/setNotice, hasPassword/setPagePassword/removePagePassword, isLocked/unlockPage/unlockAttemptsLeft, isReadOnly, permissionRole: DocumentPermissionRole, currentWorkspaceId.
Note: lib/ai/ai-store.ts (useZenithAI) is a SEPARATE store — out of scope. Legacy destructured useSquig() sites (pan/zoom/selectedIds/select/addNode) must keep working as compat.
