import { notFound } from "next/navigation"
import LanViewerClient from "./lan-viewer-client"

interface LanViewPageProps {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<{ pin?: string }>
}

export default async function LanViewPage({ params, searchParams }: LanViewPageProps) {
  const { sessionId } = await params
  const { pin } = await searchParams

  if (!sessionId) {
    notFound()
  }

  return <LanViewerClient sessionId={sessionId} pin={pin || ""} />
}

