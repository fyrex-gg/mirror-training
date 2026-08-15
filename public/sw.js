// Hand-written service worker: app-shell caching for offline gym use,
// plus lock-screen rest-timer notifications via postMessage from the page.

const CACHE_VERSION = "mirror-v1";
const BASE = "/mirror-training/";
const SHELL_URLS = [BASE, BASE + "manifest.webmanifest", BASE + "icon-192.png", BASE + "icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Recipe lookups need the network and must never break the app when offline —
  // network-first, fail gracefully with no cached fallback.
  if (url.hostname.endsWith("themealdb.com")) {
    event.respondWith(
      fetch(request).catch(() => new Response(null, { status: 503, statusText: "Offline" }))
    );
    return;
  }

  // App shell: cache-first, falling back to network and caching the result.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            }
            return res;
          })
          .catch(() => cached);
      })
    );
  }
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "REST_DONE") return;
  self.registration.showNotification("Rest over", {
    body: data.body || "Next set",
    vibrate: [250, 120, 250],
    tag: "rest",
    renotify: true,
    requireInteraction: false,
    icon: BASE + "icon-192.png",
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(BASE) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(BASE);
    })
  );
});
