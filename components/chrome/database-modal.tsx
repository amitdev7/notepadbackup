"use client"

// ---------------------------------------------------------------------------
// Zenithsui — Connected Databases & BYOD Manager Modal
// Supports Zenithsui Community Cloud, Supabase, PostgreSQL, and Local Storage.
// Follows strict Zenithsui visual tokens, CSS variables, and Phosphor icons.
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react"
import { useSquig } from "@/lib/store"
import {
  Database as DatabaseIcon,
  HardDrive as HardDriveIcon,
  Check as CheckIcon,
  ArrowsClockwise as ArrowsClockwiseIcon,
  CloudCheck as CloudCheckIcon,
  Circle as CircleIcon,
  X as XIcon,
  Plus as PlusIcon,
  Trash as TrashIcon,
  Eye as EyeIcon,
  EyeSlash as EyeSlashIcon,
  Warning as WarningIcon,
  ArrowRight as ArrowRightIcon,
  Lightning as LightningIcon,
  Table as TableIcon,
} from "@phosphor-icons/react"
import type {
  ClientConnectedDatabase,
  ConnectionTestResult,
  DatabaseProviderType,
  WorkspaceMigrationResult,
} from "@/lib/database-types"
import {
  fetchConnectedDatabases,
  saveConnectedDatabaseClient,
  testConnectedDatabaseClient,
  initializeDatabaseSchemaClient,
  disconnectDatabaseClient,
  migrateWorkspaceToDatabaseClient,
} from "@/lib/connected-databases-client"
import { fetchWorkspacesClient } from "@/lib/workspaces-client"
import type { WorkspaceClientSummary } from "@/lib/workspace-types"

type ModalView = "list" | "connect" | "migrate"

export function DatabaseModal() {
  const open = useSquig((s) => s.databaseModalOpen)
  const selectedDbId = useSquig((s) => s.selectedDbId)
  const isSyncing = useSquig((s) => s.isSyncingDb)
  const dbFiles = useSquig((s) => s.dbFiles)
  const localFiles = useSquig((s) => s.files)
  const st = useSquig.getState

  const [view, setView] = useState<ModalView>("list")
  const [databases, setDatabases] = useState<ClientConnectedDatabase[]>([])
  const [workspaces, setWorkspaces] = useState<WorkspaceClientSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  // Add / Connect Form State
  const [formProvider, setFormProvider] = useState<DatabaseProviderType>("supabase")
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  // Supabase Fields
  const [supabaseUrl, setSupabaseUrl] = useState("")
  const [supabaseKey, setSupabaseKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  // Postgres Fields
  const [pgMode, setPgMode] = useState<"uri" | "params">("uri")
  const [pgUri, setPgUri] = useState("")
  const [pgHost, setPgHost] = useState("localhost")
  const [pgPort, setPgPort] = useState("5432")
  const [pgDatabase, setPgDatabase] = useState("zenithsui")
  const [pgUser, setPgUser] = useState("postgres")
  const [pgPassword, setPgPassword] = useState("")
  const [pgSsl, setPgSsl] = useState(true)

  // Test & Init State for Form
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Migration State
  const [migrateWsId, setMigrateWsId] = useState<string>("")
  const [migrateTargetDbId, setMigrateTargetDbId] = useState<string>("")
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<WorkspaceMigrationResult | null>(null)
  const [migrationError, setMigrationError] = useState<string | null>(null)
  const [confirmingDisconnectId, setConfirmingDisconnectId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    loadData()
  }, [open])

  const loadData = async () => {
    setLoading(true)
    try {
      const [dbList, wsList] = await Promise.all([
        fetchConnectedDatabases(),
        fetchWorkspacesClient().catch(() => []),
      ])
      setDatabases(dbList)
      setWorkspaces(wsList)
      if (wsList.length > 0 && !migrateWsId) {
        setMigrateWsId(wsList[0].id)
      }
    } catch (err) {
      console.warn("[DatabaseModal] load error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const handleSelect = async (dbId: string | null) => {
    setConnectingId(dbId ?? "local")
    try {
      await st().selectDatabase(dbId)
    } finally {
      setConnectingId(null)
    }
  }

  const handleRefresh = async (e: React.MouseEvent, dbId: string) => {
    e.stopPropagation()
    await st().syncDatabaseFiles(dbId)
  }

  const handleTestExisting = async (e: React.MouseEvent, dbId: string) => {
    e.stopPropagation()
    setActionNotice(`Testing connection to ${dbId}...`)
    try {
      const res = await testConnectedDatabaseClient(dbId)
      if (res.success) {
        setActionNotice(`Connected! Latency: ${res.latencyMs ?? 0}ms (${res.tablesFound.length} tables)`)
      } else {
        setActionNotice(`Test failed: ${res.error || "Unreachable"}`)
      }
      await loadData()
    } catch (err: any) {
      setActionNotice(`Test error: ${err.message}`)
    }
  }

  const handleInitExistingSchema = async (e: React.MouseEvent, dbId: string) => {
    e.stopPropagation()
    setActionNotice(`Provisioning Zenithsui schema on ${dbId}...`)
    try {
      const res = await initializeDatabaseSchemaClient(dbId)
      if (res.success) {
        setActionNotice(`Schema ready (version ${res.version ?? 1})!`)
      } else {
        setActionNotice(`Schema setup failed: ${res.error}`)
      }
      await loadData()
    } catch (err: any) {
      setActionNotice(`Schema setup error: ${err.message}`)
    }
  }

  const handleDisconnect = async (e: React.MouseEvent, dbId: string, name: string) => {
    e.stopPropagation()
    setConfirmingDisconnectId(null)
    try {
      const res = await disconnectDatabaseClient(dbId)
      if (!res.success) {
        setActionNotice(res.error || "Cannot disconnect database")
        return
      }
      setActionNotice(`Disconnected ${name}`)
      if (selectedDbId === dbId) {
        await st().selectDatabase(null)
      }
      await loadData()
    } catch (err: any) {
      setActionNotice(`Error: ${err.message}`)
    }
  }

  const handleTestFormConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      let creds: Record<string, unknown> = {}
      if (formProvider === "supabase") {
        creds = {
          provider: "supabase",
          supabaseUrl: supabaseUrl.trim(),
          supabaseKey: supabaseKey.trim(),
        }
      } else {
        creds = {
          provider: "postgres",
          connectionString: pgMode === "uri" ? pgUri.trim() : undefined,
          host: pgMode === "params" ? pgHost.trim() : undefined,
          port: pgMode === "params" ? Number(pgPort) : 5432,
          database: pgMode === "params" ? pgDatabase.trim() : undefined,
          user: pgMode === "params" ? pgUser.trim() : undefined,
          password: pgMode === "params" ? pgPassword : undefined,
          ssl: pgSsl,
        }
      }

      const res = await testConnectedDatabaseClient("temp_test", creds)
      setTestResult(res)
    } catch (err: any) {
      setTestResult({
        success: false,
        provider: formProvider,
        status: "failed",
        schemaStatus: "missing",
        tablesFound: [],
        error: err.message || "Connection failed",
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSaveAndConnect = async () => {
    if (!formName.trim()) {
      setActionNotice("Please provide a name for this database connection.")
      return
    }

    setIsSaving(true)
    try {
      let credentials: Record<string, unknown> = {}
      if (formProvider === "supabase") {
        credentials = {
          supabaseUrl: supabaseUrl.trim(),
          supabaseKey: supabaseKey.trim(),
        }
      } else {
        credentials =
          pgMode === "uri"
            ? { connectionString: pgUri.trim(), ssl: pgSsl }
            : {
                host: pgHost.trim(),
                port: Number(pgPort),
                database: pgDatabase.trim(),
                user: pgUser.trim(),
                password: pgPassword,
                ssl: pgSsl,
              }
      }

      const res = await saveConnectedDatabaseClient({
        provider: formProvider,
        displayName: formName.trim(),
        description: formDescription.trim() || undefined,
        credentials,
      })

      if (!res.success || !res.database) {
        setActionNotice(res.error || "Failed to save database connection")
        return
      }

      await loadData()
      setView("list")
      setActionNotice(`Connected to ${res.database.displayName}!`)
      await st().selectDatabase(res.database.id)
    } catch (err: any) {
      setActionNotice(`Save failed: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRunMigration = async () => {
    if (!migrateWsId || !migrateTargetDbId) return
    setIsMigrating(true)
    setMigrationError(null)
    setMigrationResult(null)
    try {
      const res = await migrateWorkspaceToDatabaseClient(migrateWsId, migrateTargetDbId)
      setMigrationResult(res)
      setActionNotice(`Successfully migrated ${res.workspaceName} (${res.counts.boards} boards, ${res.counts.nodes} layers)`)
      await loadData()
    } catch (err: any) {
      setMigrationError(err.message || "Migration failed")
    } finally {
      setIsMigrating(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Database Management"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      onPointerDown={() => st().setDatabaseModalOpen(false)}
    >
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px]" />
      <div
        className="animate-in fade-in zoom-in-95 relative flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-chrome-lg border border-border/80 bg-background shadow-popup duration-150"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-border/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-chrome-sm bg-muted text-[var(--sq-ink)]">
              <DatabaseIcon size={16} weight="duotone" />
            </div>
            <div>
              <h2 className="text-title font-medium text-foreground">Databases & Storage</h2>
              <p className="text-label text-muted-foreground">
                Zenithsui Cloud, Bring Your Own Database (Supabase / Postgres), and Local Drawer
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-chrome-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => st().setDatabaseModalOpen(false)}
            aria-label="Close dialog"
          >
            <XIcon size={14} />
          </button>
        </div>

        {/* View Tabs */}
        <div className="flex items-center border-b border-border/70 bg-muted/20 px-5 py-2">
          <div className="flex items-center gap-1.5 text-label">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`rounded-chrome-sm px-3 py-1 font-medium transition-colors ${
                view === "list"
                  ? "bg-background text-foreground shadow-xs border border-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Connected Stores ({databases.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setView("connect")
                setTestResult(null)
              }}
              className={`inline-flex items-center gap-1 rounded-chrome-sm px-3 py-1 font-medium transition-colors ${
                view === "connect"
                  ? "bg-background text-foreground shadow-xs border border-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <PlusIcon size={13} weight="bold" />
              Connect Database (BYOD)
            </button>
            <button
              type="button"
              onClick={() => {
                setView("migrate")
                setMigrationResult(null)
                setMigrationError(null)
              }}
              className={`inline-flex items-center gap-1 rounded-chrome-sm px-3 py-1 font-medium transition-colors ${
                view === "migrate"
                  ? "bg-background text-foreground shadow-xs border border-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowRightIcon size={13} weight="bold" />
              Migrate Workspace
            </button>
          </div>
        </div>

        {/* Notice flash bar if active */}
        {actionNotice && (
          <div className="flex items-center justify-between border-b border-border/50 bg-muted/50 px-5 py-1.5 text-micro text-foreground">
            <span>{actionNotice}</span>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <XIcon size={11} />
            </button>
          </div>
        )}

        {/* Modal Content */}
        <div className="flex flex-col gap-3 overflow-y-auto overscroll-contain p-5 max-h-[60vh]">
          {/* VIEW 1: LIST CONNECTED DATABASES */}
          {view === "list" && (
            <>
              {/* Section: Connected Databases */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
                    Connected Databases
                  </span>
                  <span className="text-micro text-muted-foreground">
                    {databases.length} active
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {databases.map((db) => {
                    const isSelected = selectedDbId === db.id
                    const isLoading = connectingId === db.id || (isSelected && isSyncing)
                    const isCloud = db.provider === "zenithsui-cloud"
                    const isSupabase = db.provider === "supabase"
                    const isPostgres = db.provider === "postgres"

                    return (
                      <div
                        key={db.id}
                        onClick={() => handleSelect(db.id)}
                        className={`group relative flex cursor-pointer flex-col gap-2 rounded-chrome-md border p-3.5 transition-all ${
                          isSelected
                            ? "border-[var(--sq-ink)]/60 bg-accent/40 shadow-xs"
                            : "border-border/70 hover:border-border hover:bg-accent/20"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div
                              className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-chrome-sm ${
                                isSelected
                                  ? "bg-[var(--sq-ink)] text-background"
                                  : "bg-muted text-muted-foreground group-hover:text-foreground"
                              }`}
                            >
                              <CloudCheckIcon size={18} weight={isSelected ? "fill" : "regular"} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-row font-medium text-foreground">{db.displayName}</span>
                                <span className="rounded-chrome-xs border border-border/80 bg-muted px-1.5 py-0.5 text-micro font-medium text-muted-foreground">
                                  {isCloud ? "Cloud Store" : isSupabase ? "Supabase" : "PostgreSQL"}
                                </span>
                                {db.isDefault && (
                                  <span className="rounded-chrome-xs bg-[var(--sq-ink)]/10 px-1.5 py-0.5 text-micro font-medium text-[var(--sq-ink)]">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-label text-muted-foreground leading-relaxed line-clamp-2">
                                {db.description || `${db.provider.toUpperCase()} external storage`}
                              </p>

                              {/* Metadata & Status line */}
                              <div className="mt-2 flex items-center gap-3 text-micro text-muted-foreground flex-wrap">
                                <span className="inline-flex items-center gap-1.5">
                                  <CircleIcon
                                    size={7}
                                    weight="fill"
                                    className={
                                      db.status === "connected"
                                        ? "text-emerald-500"
                                        : db.status === "schema_missing" || db.status === "needs_migration" || db.status === "untested"
                                        ? "text-amber-500"
                                        : "text-red-500"
                                    }
                                  />
                                  {db.status === "connected"
                                    ? "Connected"
                                    : db.status === "schema_missing"
                                    ? "Schema Missing"
                                    : db.status === "needs_migration"
                                    ? "Needs Migration"
                                    : db.status === "untested"
                                    ? "Untested"
                                    : "Offline / Error"}
                                </span>
                                {db.configurationMetadata?.lastLatencyMs !== undefined && (
                                  <>
                                    <span>•</span>
                                    <span>{db.configurationMetadata.lastLatencyMs}ms</span>
                                  </>
                                )}
                                <span>•</span>
                                <span>
                                  {isSelected
                                    ? `${dbFiles.length} shared file${dbFiles.length === 1 ? "" : "s"}`
                                    : `${db.configurationMetadata?.tablesCount ?? 5} tables`}
                                </span>
                                {db.assignedWorkspaceNames && db.assignedWorkspaceNames.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>Workspace: {db.assignedWorkspaceNames.join(", ")}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick selection status / button */}
                          <div className="ml-3 flex shrink-0 items-center gap-1.5 pt-0.5">
                            {isSelected ? (
                              <>
                                <button
                                  type="button"
                                  title="Sync files"
                                  onClick={(e) => handleRefresh(e, db.id)}
                                  className="flex size-7 items-center justify-center rounded-chrome-sm text-muted-foreground hover:bg-background hover:text-foreground"
                                >
                                  <ArrowsClockwiseIcon
                                    size={14}
                                    className={isLoading ? "animate-spin" : ""}
                                  />
                                </button>
                                <span className="inline-flex items-center gap-1 rounded-chrome-sm bg-[var(--sq-ink)]/10 px-2 py-1 text-label font-medium text-[var(--sq-ink)]">
                                  <CheckIcon size={12} weight="bold" />
                                  Active
                                </span>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSelect(db.id)
                                }}
                                className="h-ctl rounded-chrome-sm border border-border bg-background px-3 text-label font-medium text-foreground hover:bg-accent"
                              >
                                {isLoading ? "Connecting..." : "Select"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Database Action Buttons */}
                        <div className="mt-1 flex items-center justify-between border-t border-border/50 pt-2 text-micro">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleTestExisting(e, db.id)}
                              className="inline-flex items-center gap-1 rounded-chrome-xs border border-border/70 bg-background px-2 py-0.5 text-muted-foreground hover:text-foreground hover:bg-accent"
                            >
                              <LightningIcon size={11} />
                              Test Connection
                            </button>
                            {!isCloud && (
                              <button
                                type="button"
                                onClick={(e) => handleInitExistingSchema(e, db.id)}
                                className="inline-flex items-center gap-1 rounded-chrome-xs border border-border/70 bg-background px-2 py-0.5 text-muted-foreground hover:text-foreground hover:bg-accent"
                              >
                                <TableIcon size={11} />
                                Verify Schema
                              </button>
                            )}
                          </div>

                          {!db.isDefault && db.id !== "zenithsui-cloud" && (
                            confirmingDisconnectId === db.id ? (
                              <div className="inline-flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded border border-red-200 dark:border-red-900/50">
                                <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">Disconnect?</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleDisconnect(e, db.id, db.displayName)}
                                  className="text-[11px] font-semibold text-red-700 dark:text-red-300 hover:underline px-1"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setConfirmingDisconnectId(null)
                                  }}
                                  className="text-[11px] text-muted-foreground hover:text-foreground px-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConfirmingDisconnectId(db.id)
                                }}
                                className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 px-1 py-0.5"
                              >
                                <TrashIcon size={12} />
                                Disconnect
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Section: Offline Storage */}
              <div className="mt-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
                    Offline Local Drawer
                  </span>
                </div>

                <div
                  onClick={() => handleSelect(null)}
                  className={`group relative flex cursor-pointer items-start justify-between rounded-chrome-md border p-3.5 transition-all ${
                    selectedDbId === null
                      ? "border-[var(--sq-ink)]/60 bg-accent/40 shadow-xs"
                      : "border-border/70 hover:border-border hover:bg-accent/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-chrome-sm ${
                        selectedDbId === null
                          ? "bg-[var(--sq-ink)] text-background"
                          : "bg-muted text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      <HardDriveIcon size={18} weight={selectedDbId === null ? "fill" : "regular"} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-row font-medium text-foreground">Local Browser Storage</span>
                        <span className="rounded-chrome-xs border border-border/80 bg-muted px-1.5 py-0.5 text-micro font-medium text-muted-foreground">
                          Local
                        </span>
                      </div>
                      <p className="mt-0.5 text-label text-muted-foreground leading-relaxed">
                        Store drawings privately in this browser. No network sync or external access.
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-micro text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CircleIcon
                            size={7}
                            weight="fill"
                            className={selectedDbId === null ? "text-emerald-500" : "text-muted-foreground"}
                          />
                          {selectedDbId === null ? "Active" : "Ready"}
                        </span>
                        <span>•</span>
                        <span>{localFiles.length} local file{localFiles.length === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-3 flex shrink-0 items-center gap-1.5 pt-0.5">
                    {selectedDbId === null ? (
                      <span className="inline-flex items-center gap-1 rounded-chrome-sm bg-[var(--sq-ink)]/10 px-2 py-1 text-label font-medium text-[var(--sq-ink)]">
                        <CheckIcon size={12} weight="bold" />
                        Active
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelect(null)
                        }}
                        className="h-ctl rounded-chrome-sm border border-border bg-background px-3 text-label font-medium text-foreground hover:bg-accent"
                      >
                        Switch to Local
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* VIEW 2: CONNECT EXTERNAL DATABASE (BYOD) */}
          {view === "connect" && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-row font-medium text-foreground">Connect External Database</h3>
                <p className="text-label text-muted-foreground">
                  Connect your own Supabase project or PostgreSQL instance to store wireframe boards, documents, and shares.
                </p>
              </div>

              {/* Provider Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
                  Database Provider
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormProvider("supabase")
                      setTestResult(null)
                    }}
                    className={`flex items-center gap-2 rounded-chrome-sm border p-3 text-left transition-colors ${
                      formProvider === "supabase"
                        ? "border-[var(--sq-ink)] bg-accent/40 text-foreground"
                        : "border-border/70 bg-background text-muted-foreground hover:bg-accent/20"
                    }`}
                  >
                    <CloudCheckIcon size={20} weight={formProvider === "supabase" ? "fill" : "regular"} />
                    <div>
                      <div className="font-medium text-xs">Supabase</div>
                      <div className="text-[10px] text-muted-foreground">Managed PostgreSQL + Storage</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormProvider("postgres")
                      setTestResult(null)
                    }}
                    className={`flex items-center gap-2 rounded-chrome-sm border p-3 text-left transition-colors ${
                      formProvider === "postgres"
                        ? "border-[var(--sq-ink)] bg-accent/40 text-foreground"
                        : "border-border/70 bg-background text-muted-foreground hover:bg-accent/20"
                    }`}
                  >
                    <DatabaseIcon size={20} weight={formProvider === "postgres" ? "fill" : "regular"} />
                    <div>
                      <div className="font-medium text-xs">PostgreSQL</div>
                      <div className="text-[10px] text-muted-foreground">Self-hosted, RDS, Cloud SQL, Neon</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Common Fields */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-micro font-medium text-foreground">Display Name *</label>
                  <input
                    type="text"
                    placeholder={formProvider === "supabase" ? "Production Supabase" : "Main Postgres DB"}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="h-ctl rounded-chrome-sm border border-border/80 bg-background px-2.5 text-label focus:border-[var(--sq-ink)] focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-micro font-medium text-foreground">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="E.g. Team design system storage"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="h-ctl rounded-chrome-sm border border-border/80 bg-background px-2.5 text-label focus:border-[var(--sq-ink)] focus:outline-none"
                  />
                </div>
              </div>

              {/* SUPABASE FORM FIELDS */}
              {formProvider === "supabase" && (
                <div className="flex flex-col gap-3 rounded-chrome-md border border-border/70 bg-muted/20 p-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-micro font-medium text-foreground">Supabase Project URL *</label>
                    <input
                      type="url"
                      placeholder="https://xyzcompany.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="h-ctl rounded-chrome-sm border border-border/80 bg-background px-2.5 text-label font-mono focus:border-[var(--sq-ink)] focus:outline-none"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Found in Supabase Dashboard &gt; Project Settings &gt; API
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-micro font-medium text-foreground">
                        Supabase API Key (Service Role or Anon) *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        {showKey ? <EyeSlashIcon size={12} /> : <EyeIcon size={12} />}
                        {showKey ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      type={showKey ? "text" : "password"}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      className="h-ctl rounded-chrome-sm border border-border/80 bg-background px-2.5 text-label font-mono focus:border-[var(--sq-ink)] focus:outline-none"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Stored securely on the server with AES-256-GCM encryption. Never sent to browser clients.
                    </span>
                  </div>
                </div>
              )}

              {/* POSTGRES FORM FIELDS */}
              {formProvider === "postgres" && (
                <div className="flex flex-col gap-3 rounded-chrome-md border border-border/70 bg-muted/20 p-3.5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPgMode("uri")}
                      className={`text-xs font-medium pb-0.5 border-b-2 ${
                        pgMode === "uri"
                          ? "border-[var(--sq-ink)] text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Connection String URI
                    </button>
                    <button
                      type="button"
                      onClick={() => setPgMode("params")}
                      className={`text-xs font-medium pb-0.5 border-b-2 ${
                        pgMode === "params"
                          ? "border-[var(--sq-ink)] text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Individual Parameters
                    </button>
                  </div>

                  {pgMode === "uri" ? (
                    <div className="flex flex-col gap-1">
                      <label className="text-micro font-medium text-foreground">Postgres URI *</label>
                      <input
                        type="text"
                        placeholder="postgresql://user:password@host:5432/database?sslmode=require"
                        value={pgUri}
                        onChange={(e) => setPgUri(e.target.value)}
                        className="h-ctl rounded-chrome-sm border border-border/80 bg-background px-2.5 text-label font-mono focus:border-[var(--sq-ink)] focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-micro font-medium text-foreground">Host *</label>
                        <input
                          type="text"
                          value={pgHost}
                          onChange={(e) => setPgHost(e.target.value)}
                          className="h-ctl rounded-chrome-sm border border-border/80 bg-background px-2.5 text-label focus:border-[var(--sq-ink)] focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-micro font-medium text-foreground">Port *</label>
                        <input
                          type="text"
                          value={pgPort}
                          onChange={(e) => setPgPort(e.target.value)}
                          className="h-ctl rounded-chrome-sm border border-border/80 bg-background px-2.5 text-label focus:border-[var(--sq-ink)] focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-micro font-medium text-foreground">Database *</label>
                        <input
                          type="text"
                          value={pgDatabase}
                          onChange={(e) => setPgDatabase(e.target.value)}
                          className="h-ctl rounded-chrome-sm border border-border/80 bg-background px-2.5 text-label focus:border-[var(--sq-ink)] focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-micro font-medium text-foreground">User *</label>
                        <input
                          type="text"
                          value={pgUser}
                          onChange={(e) => setPgUser(e.target.value)}
                          className="h-ctl rounded-chrome-sm border border-border/80 bg-background px-2.5 text-label focus:border-[var(--sq-ink)] focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2 flex flex-col gap-1">
                        <label className="text-micro font-medium text-foreground">Password *</label>
                        <input
                          type="password"
                          value={pgPassword}
                          onChange={(e) => setPgPassword(e.target.value)}
                          className="h-ctl rounded-chrome-sm border border-border/80 bg-background px-2.5 text-label focus:border-[var(--sq-ink)] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <label className="inline-flex items-center gap-2 text-micro text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pgSsl}
                      onChange={(e) => setPgSsl(e.target.checked)}
                      className="rounded-chrome-xs"
                    />
                    Enable SSL / TLS connection (Recommended for cloud databases)
                  </label>
                </div>
              )}

              {/* Live Test Feedback Area */}
              {testResult && (
                <div
                  className={`rounded-chrome-md border p-3 text-xs ${
                    testResult.success
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                      : "border-red-500/50 bg-red-500/10 text-red-900 dark:text-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {testResult.success ? (
                      <CheckIcon size={16} weight="bold" />
                    ) : (
                      <WarningIcon size={16} weight="bold" />
                    )}
                    {testResult.success ? "Connection Successful" : "Connection Failed"}
                    {testResult.latencyMs !== undefined && (
                      <span className="text-[10px] opacity-80">• {testResult.latencyMs}ms latency</span>
                    )}
                  </div>
                  {testResult.error && <p className="mt-1 text-label">{testResult.error}</p>}
                  {testResult.success && (
                    <div className="mt-1 text-[11px] opacity-90">
                      Schema Status: {testResult.schemaStatus} • Tables found:{" "}
                      {testResult.tablesFound.length > 0 ? testResult.tablesFound.join(", ") : "none"}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons for Form */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={isTesting || isSaving}
                  onClick={handleTestFormConnection}
                  className="inline-flex items-center gap-1.5 h-ctl rounded-chrome-sm border border-border bg-background px-3 text-label font-medium text-foreground hover:bg-accent disabled:opacity-50"
                >
                  <LightningIcon size={14} className={isTesting ? "animate-spin" : ""} />
                  {isTesting ? "Testing..." : "Test Connection"}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className="h-ctl rounded-chrome-sm px-3 text-label font-medium text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSaving || isTesting}
                    onClick={handleSaveAndConnect}
                    className="h-ctl rounded-chrome-sm bg-[var(--sq-ink)] px-4 text-label font-medium text-background hover:opacity-90 disabled:opacity-50"
                  >
                    {isSaving ? "Saving & Connecting..." : "Save & Connect"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: MIGRATE WORKSPACE DATA */}
          {view === "migrate" && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-row font-medium text-foreground">Migrate Workspace to Database</h3>
                <p className="text-label text-muted-foreground">
                  Move all boards, layers, documents, and sharing configs safely from one database provider to another.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-chrome-md border border-border/70 bg-muted/20 p-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-micro font-medium text-foreground">Select Workspace to Migrate</label>
                  <select
                    value={migrateWsId}
                    onChange={(e) => setMigrateWsId(e.target.value)}
                    className="h-ctl rounded-chrome-sm border border-border/80 bg-background px-2.5 text-label focus:border-[var(--sq-ink)] focus:outline-none"
                  >
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.boardCount} boards)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-micro font-medium text-foreground">Target Destination Database</label>
                  <select
                    value={migrateTargetDbId}
                    onChange={(e) => setMigrateTargetDbId(e.target.value)}
                    className="h-ctl rounded-chrome-sm border border-border/80 bg-background px-2.5 text-label focus:border-[var(--sq-ink)] focus:outline-none"
                  >
                    <option value="">Select target database...</option>
                    {databases.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.displayName} ({d.provider})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {migrationResult && (
                <div className="rounded-chrome-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckIcon size={16} weight="bold" />
                    Migration Completed Successfully!
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="rounded bg-background/50 p-1.5">
                      <div className="font-bold">{migrationResult.counts.boards}</div>
                      <div className="text-[10px] opacity-80">Boards</div>
                    </div>
                    <div className="rounded bg-background/50 p-1.5">
                      <div className="font-bold">{migrationResult.counts.nodes}</div>
                      <div className="text-[10px] opacity-80">Nodes / Layers</div>
                    </div>
                    <div className="rounded bg-background/50 p-1.5">
                      <div className="font-bold">{migrationResult.counts.shares}</div>
                      <div className="text-[10px] opacity-80">Shares</div>
                    </div>
                  </div>
                </div>
              )}

              {migrationError && (
                <div className="rounded-chrome-md border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-900 dark:text-red-200">
                  <div className="flex items-center gap-2 font-medium">
                    <WarningIcon size={16} weight="bold" />
                    Migration Failed
                  </div>
                  <p className="mt-1 text-label">{migrationError}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="h-ctl rounded-chrome-sm px-3 text-label font-medium text-muted-foreground hover:text-foreground"
                >
                  Back to Databases
                </button>
                <button
                  type="button"
                  disabled={isMigrating || !migrateWsId || !migrateTargetDbId}
                  onClick={handleRunMigration}
                  className="inline-flex items-center gap-1.5 h-ctl rounded-chrome-sm bg-[var(--sq-ink)] px-4 text-label font-medium text-background hover:opacity-90 disabled:opacity-50"
                >
                  {isMigrating ? (
                    <>
                      <ArrowsClockwiseIcon size={14} className="animate-spin" />
                      Migrating Workspace...
                    </>
                  ) : (
                    <>
                      <ArrowRightIcon size={14} weight="bold" />
                      Start Data Migration
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/70 bg-muted/30 px-5 py-3 text-micro text-muted-foreground">
          <span>
            {selectedDbId
              ? `Connected to ${databases.find((d) => d.id === selectedDbId)?.displayName || "shared database"}. Edits sync in real-time.`
              : "Using private local drawer. Connect a database to collaborate."}
          </span>
          <button
            type="button"
            className="h-ctl rounded-chrome-sm px-3 text-label font-medium text-foreground hover:bg-accent"
            onClick={() => st().setDatabaseModalOpen(false)}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

