"use client"

import { useState, useEffect, useSyncExternalStore } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function subscribeStandalone(callback: () => void) {
  if (typeof window === "undefined") return () => {}
  const mql = window.matchMedia("(display-mode: standalone)")
  mql.addEventListener("change", callback)
  window.addEventListener("appinstalled", callback)
  return () => {
    mql.removeEventListener("change", callback)
    window.removeEventListener("appinstalled", callback)
  }
}

function getStandaloneSnapshot(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(
      "standalone" in window.navigator &&
        (window.navigator as unknown as { standalone: boolean }).standalone === true
    )
  )
}

function getStandaloneServerSnapshot(): boolean {
  return false
}

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const isInstalled = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    getStandaloneServerSnapshot
  )

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    const onAppInstalled = () => {
      setIsInstallable(false)
      setInstallPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handler)
    window.addEventListener("appinstalled", onAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      window.removeEventListener("appinstalled", onAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (!installPrompt) return false
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === "accepted") {
      setIsInstallable(false)
    }
    return outcome === "accepted"
  }

  return { isInstallable, isInstalled, promptInstall }
}
