// Lock-screen rest-timer notifications, routed through the service worker —
// on Android Chrome, plain `new Notification()` doesn't work; only
// registration.showNotification() reaches the lock screen.

export function ensureNotificationPermission() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "default") {
    // Must run from a user gesture — call this from a tap handler, not on load.
    Notification.requestPermission();
  }
}

export async function notifyRestDone(body) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    if (!reg) return;
    reg.active?.postMessage({ type: "REST_DONE", body });
  } catch (e) {
    /* the beep + vibration in the page still fire regardless */
  }
}
