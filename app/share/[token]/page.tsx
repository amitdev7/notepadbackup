import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { resolveShareToken } from "@/lib/cloud/sharing"
import { cookies } from "next/headers"
import { ViewerClient } from "./viewer-client"

interface PageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  return {
    title: "Shared Document — Zenithsui",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  }
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params
  if (!token) notFound()

  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  let sessionCookie: string | null = null
  for (const c of allCookies) {
    if (c.name.startsWith("zs_share_pwd_")) {
      sessionCookie = c.value
      break
    }
  }

  const result = await resolveShareToken(token, sessionCookie)

  if (!result.valid) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-4 text-center font-mono">
        <h1 className="text-xl font-bold text-destructive">Link Inactive</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error || "This share link is no longer valid."}</p>
        <Link href="/" className="mt-6 text-xs text-primary underline">
          Return to Zenithsui
        </Link>
      </div>
    )
  }

  return (
    <ViewerClient
      token={token}
      initialRequiresPassword={result.requiresPassword ?? false}
      initialDoc={result.document ?? null}
      permission={result.permission ?? "view"}
      allowExport={result.allowExport ?? true}
      allowDuplicate={result.allowDuplicate ?? true}
    />
  )
}
