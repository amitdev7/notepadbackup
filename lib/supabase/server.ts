import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import type { Database } from "../db/types"

export async function createClient(): Promise<SupabaseClient<Database>> {
  let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null
  try {
    cookieStore = await cookies()
  } catch {
    // Context where cookies() cannot be accessed (e.g. static generation)
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "http://localhost:54321"
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.anon"

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore ? cookieStore.getAll() : []
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          if (!cookieStore) return
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore?.set(name, value, options as any)
            })
          } catch {
            // Ignore in Server Component context
          }
        },
      },
    }
  ) as unknown as SupabaseClient<Database>
}

export const getSupabaseServerClient = createClient

