"use client"

import { useEffect } from "react"

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    const register = () => {
      try {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            reg.onupdatefound = () => {
              const installing = reg.installing
              if (installing) {
                installing.onstatechange = () => {
                  if (installing.state === "installed" && navigator.serviceWorker.controller) {
                    console.info("[zenithsui] New version cached and ready for offline use.")
                  }
                }
              }
            }
          })
          .catch((err) => {
            console.warn("[zenithsui] ServiceWorker registration failed:", err)
          })
      } catch (err) {
        console.warn("[zenithsui] ServiceWorker could not be registered:", err)
      }
    }

    if (document.readyState === "complete") {
      register()
    } else {
      window.addEventListener("load", register, { once: true })
    }
  }, [])

  return null
}

