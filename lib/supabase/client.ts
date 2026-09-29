import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../db/types"

export function createClient(): SupabaseClient<Database> {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.anon"
  ) as unknown as SupabaseClient<Database>
}

export const getSupabaseBrowserClient = createClient
