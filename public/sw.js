// Hand-written service worker: app-shell caching for offline gym use,
// plus lock-screen rest-timer notifications via postMessage from the page.

const CACHE_VERSION = "mirror-v2";
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

  if (url.origin !== self.location.origin) return;

  // The HTML shell: network-first, so a new deploy shows up on the very next
  // load instead of waiting for a second reload to pick up a refreshed cache.
  // Falls back to whatever shell is cached when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(BASE)))
    );
    return;
  }

  // Everything else (hashed JS/CSS bundle, icons, manifest): cache-first,
  // falling back to network and caching the result. Bundle filenames are
  // content-hashed per build, so cache-first here can never serve something stale.
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
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  if (data.type === "REST_DONE") {
    // Silent — the page's own beep() + navigator.vibrate() are the only
    // audible/haptic cue. This notification is a visual-only lock-screen record.
    self.registration.showNotification("Rest over", {
      body: data.body || "Next set",
      tag: "rest",
      renotify: true,
      silent: true,
      requireInteraction: false,
      icon: BASE + "icon-192.png",
    });
  } else if (data.type === "REST_TICK") {
    // Same tag as REST_DONE so it replaces in place — silent so a periodic
    // refresh never buzzes or re-alerts.
    self.registration.showNotification("Rest — counting down", {
      body: data.body || "",
      tag: "rest",
      renotify: false,
      silent: true,
      requireInteraction: false,
      icon: BASE + "icon-192.png",
    });
  } else if (data.type === "REST_CANCEL") {
    self.registration.getNotifications({ tag: "rest" }).then((list) => {
      list.forEach((n) => n.close());
    });
  }
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
