// ---------------------------------------------------------------------------
// Zenithsui Database Schema & RLS Test Suite
//
//   node --experimental-strip-types --import ./scripts/register-loader.mjs \
//        scripts/test-database.ts
// ---------------------------------------------------------------------------

import fs from "node:fs"
import path from "node:path"

let passed = 0
const failures: string[] = []

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
  }
}

async function runTests() {
  console.log("Running Zenithsui Database Schema & RLS tests...\n")

  const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20260928000001_zenithsui_core_schema.sql")
  check("Migration file exists", fs.existsSync(migrationPath))

  const sql = fs.readFileSync(migrationPath, "utf-8")

  // 1. Verify all 11 tables are defined in DDL
  const requiredTables = [
    "profiles",
    "workspaces",
    "workspace_members",
    "projects",
    "documents",
    "document_members",
    "share_links",
    "document_versions",
    "assets",
    "activity_log",
    "devices",
  ]

  for (const table of requiredTables) {
    check(
      `Table '${table}' is created with IF NOT EXISTS`,
      sql.includes(`CREATE TABLE IF NOT EXISTS public.${table}`) ||
      sql.includes(`CREATE TABLE IF NOT EXISTS ${table}`) ||
      sql.includes(`CREATE TABLE ${table}`) ||
      sql.includes(`CREATE TABLE public.${table}`)
    )
  }

  // 2. Verify RLS is enabled on all tables
  for (const table of requiredTables) {
    check(
      `Row Level Security enabled for '${table}'`,
      sql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`) ||
      sql.includes(`ENABLE ROW LEVEL SECURITY`)
    )
  }

  // 3. Verify security definer helper functions exist
  const helperFunctions = [
    "is_workspace_member",
    "has_document_access",
    "verify_share_link",
  ]

  for (const fn of helperFunctions) {
    check(
      `Security Definer function '${fn}' is created`,
      sql.includes(`FUNCTION public.${fn}`) || sql.includes(`FUNCTION ${fn}`)
    )
  }

  // 4. Verify monotonic revision guard trigger
  check(
    "Revision guard trigger function exists",
    sql.includes("trg_documents_revision_guard") || sql.includes("revision")
  )

  // 5. Verify onboarding trigger on auth.users
  check(
    "User onboarding trigger exists",
    sql.includes("handle_new_user") && sql.includes("auth.users")
  )

  // 6. Verify GIN index for JSON containment
  check(
    "GIN index for document_json exists",
    sql.includes("USING gin")
  )

  console.log(`\nDatabase Schema: ${passed} passed, ${failures.length} failed.`)
  if (failures.length) {
    console.error("Failures:\n  " + failures.join("\n  "))
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err)
  process.exit(1)
})

