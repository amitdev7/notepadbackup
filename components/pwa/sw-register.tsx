"use client"

import { useEffect } from "react"

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.onupdatefound = () => {
            const installing = reg.installing
            if (installing) {
              installing.onstatechange = () => {
                if (installing.state === "installed" && navigator.serviceWorker.controller) {
                  // A new update is ready
                  console.info("[zenithsui] New version cached and ready for offline use.")
                }
              }
            }
          }
        })
        .catch((err) => {
          console.warn("[zenithsui] ServiceWorker registration failed:", err)
        })
    }
  }, [])

  return null
}

