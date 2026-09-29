import type { Database } from "../db/types"

export async function createClient() {
  const { createServerClient } = await import("@supabase/ssr")
  let cookieStore: any
  try {
    const { cookies } = await import("next/headers")
    cookieStore = await cookies()
  } catch {
    cookieStore = {
      getAll: () => [],
      set: () => {},
    }
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.anon",
    {
      cookies: {
        getAll() {
          return cookieStore ? cookieStore.getAll() : []
        },
        setAll(cookiesToSet) {
          if (!cookieStore) return
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ignore in server component context
          }
        },
      },
    }
  )
}

export const getSupabaseServerClient = createClient
