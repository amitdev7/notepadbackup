import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { resolvePublicDocument } from "@/lib/cloud/public"
import { ViewerClient } from "../../share/[token]/viewer-client"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const res = await resolvePublicDocument(slug)

  if (!res.found || !res.document) {
    return {
      title: "Document Not Found — Zenithsui",
      robots: { index: false, follow: false },
    }
  }

  const title = `${res.document.name} — Zenithsui`
  const description = `Interactive wireframe prototype published with Zenithsui.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: `/api/documents/${res.document.id}/og`,
          width: 1200,
          height: 630,
          alt: res.document.name,
        },
      ],
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function PublicSlugPage({ params }: PageProps) {
  const { slug } = await params
  if (!slug) notFound()

  const result = await resolvePublicDocument(slug)

  if (!result.found || !result.document) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-4 text-center font-mono">
        <h1 className="text-xl font-bold text-destructive">404 — Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error || "This document does not exist."}</p>
        <Link href="/" className="mt-6 text-xs text-primary underline">
          Return to Zenithsui
        </Link>
      </div>
    )
  }

  if (!result.isPublished) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-4 text-center font-mono">
        <h1 className="text-xl font-bold text-amber-600">410 — Unpublished</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This document has been unpublished by its owner and is no longer available.
        </p>
        <Link href="/" className="mt-6 text-xs text-primary underline">
          Return to Zenithsui
        </Link>
      </div>
    )
  }

  return (
    <ViewerClient
      token={slug}
      initialRequiresPassword={false}
      initialDoc={result.document}
      permission={result.document.public_role === "editor" ? "edit" : "view"}
      allowExport={true}
      allowDuplicate={true}
    />
  )
}

