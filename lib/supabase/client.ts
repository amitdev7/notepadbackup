import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "../db/types"

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.anon"
  )
}

export const getSupabaseBrowserClient = createClient
