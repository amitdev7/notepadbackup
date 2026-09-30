// ---------------------------------------------------------------------------
// Zenithsui Service Worker (v1.0.0) — Offline Shell & Asset Caching
// ---------------------------------------------------------------------------

const CACHE_NAME = "zenithsui-shell-v1"

const PRECACHE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg",
  "/favicon.ico",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        PRECACHE_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn(`[zenithsui-sw] Precache failed for ${asset}:`, err)
          })
        )
      )
    }).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  // 1. Skip non-GET requests and WebSocket / LAN endpoints
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/assets/signed-upload-url")) {
    return
  }

  // 2. Cache-First for static Next.js assets, images, and fonts
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // 3. Stale-While-Revalidate for HTML page navigations
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              const clone = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
            }
            return networkResponse
          })
          .catch(() => {
            // Offline fallback to root cached index
            return cached || caches.match("/")
          })

        return cached || fetchPromise
      })
    )
    return
  }

  // 4. Default: Network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse.status === 200) {
          const clone = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return networkResponse
      })
      .catch(() => caches.match(event.request))
  )
})

