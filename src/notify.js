// Lock-screen rest-timer notifications, routed through the service worker —
// on Android Chrome, plain `new Notification()` doesn't work; only
// registration.showNotification() reaches the lock screen.

export function ensureNotificationPermission() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "default") {
    // Must run from a user gesture — call this from a tap handler, not on load.
    // Returns the permission promise so callers can update their own UI once it resolves.
    return Notification.requestPermission();
  }
}

async function postToSW(message) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage(message);
  } catch (e) {
    /* the beep + vibration in the page still fire regardless */
  }
}

export function notifyRestDone(body) {
  return postToSW({ type: "REST_DONE", body });
}

// Refreshes the same tray notification with the current time remaining —
// not a true native chronometer (web notifications can't tick on their own),
// just a periodic text update while the page is alive to send it.
export function notifyRestTick(body) {
  return postToSW({ type: "REST_TICK", body });
}

export function clearRestNotification() {
  return postToSW({ type: "REST_CANCEL" });
}
