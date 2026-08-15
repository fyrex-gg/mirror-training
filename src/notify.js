// Rest-timer notifications. Two completely different mechanisms depending on
// where the app is running:
//
// - Web / installed PWA: routed through the service worker — on Android
//   Chrome, plain `new Notification()` doesn't work; only
//   registration.showNotification() reaches the lock screen. This still
//   depends on the page's JS staying alive, so it can lag or stall once the
//   screen actually locks.
// - Capacitor native shell: a single OS-level alarm is scheduled up front via
//   LocalNotifications.schedule({at}) the moment rest starts. Android's own
//   AlarmManager fires it at the exact time regardless of whether the page's
//   JS is suspended, the screen is locked, or the app is fully closed — the
//   thing no web notification can do.

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const isNative = () => Capacitor.isNativePlatform();
const REST_NOTIF_ID = 42;

export async function ensureNotificationPermission() {
  if (isNative()) {
    try {
      const { display } = await LocalNotifications.checkPermissions();
      if (display !== "granted") await LocalNotifications.requestPermissions();
    } catch (e) {}
    return;
  }
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "default") {
    // Must run from a user gesture — call this from a tap handler, not on load.
    // Returns the permission promise so callers can update their own UI once it resolves.
    return Notification.requestPermission();
  }
}

// Android 12+ gates *exact* alarms behind a separate "Alarms & reminders" app
// setting — distinct from, and not covered by, the notification permission
// above. Without it, the OS silently downgrades our scheduled alarm to an
// inexact one, which Doze/battery optimization can delay by many minutes.
// Only meaningful on the native shell; always reads as "granted" on web/pre-12
// so callers don't need an extra platform check.
export async function checkExactAlarmState() {
  if (!isNative()) return "granted";
  try {
    const { exact_alarm } = await LocalNotifications.checkExactNotificationSetting();
    return exact_alarm;
  } catch (e) {
    return "unsupported";
  }
}

// Deep-links to the system settings screen for the exact-alarm toggle. Resolves
// with the new state once the user returns to the app, so the caller can
// update its own UI immediately without a separate re-check.
export async function requestExactAlarm() {
  if (!isNative()) return "granted";
  try {
    const { exact_alarm } = await LocalNotifications.changeExactNotificationSetting();
    return exact_alarm;
  } catch (e) {
    return "unsupported";
  }
}

// Resolves to "granted" | "denied" | "default" | "unsupported", used to drive
// the Timer card's permission hint on both platforms.
export async function currentPermissionState() {
  if (isNative()) {
    try {
      const { display } = await LocalNotifications.checkPermissions();
      if (display === "granted") return "granted";
      if (display === "denied") return "denied";
      return "default";
    } catch (e) {
      return "unsupported";
    }
  }
  return typeof Notification !== "undefined" ? Notification.permission : "unsupported";
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

// Call once, the moment a rest period starts, with its full length. No-ops
// on web — the web path fires from the per-second countdown instead.
export async function armRestNotification(seconds, label) {
  if (!isNative() || !seconds || seconds <= 0) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIF_ID }] });
    const result = await LocalNotifications.schedule({
      notifications: [{
        id: REST_NOTIF_ID,
        title: "Rest over",
        body: label || "Next set",
        schedule: { at: new Date(Date.now() + seconds * 1000), allowWhileIdle: true },
      }],
    });
    // If exact-alarm permission isn't granted, the plugin falls back to an
    // inexact alarm and reports it here — the Timer card's exact-alarm hint
    // is the primary fix path, this is just a console breadcrumb for debugging.
    if (result && result.warning) console.warn("[notify] " + result.warning.message);
  } catch (e) {}
}

export function notifyRestDone(body) {
  if (isNative()) return; // handled by the alarm armed in armRestNotification
  return postToSW({ type: "REST_DONE", body });
}

// Refreshes the same tray notification with the current time remaining —
// not a true native chronometer (web notifications can't tick on their own),
// just a periodic text update while the page is alive to send it.
export function notifyRestTick(body) {
  if (isNative()) return; // the native alarm doesn't need a live-updating tick
  return postToSW({ type: "REST_TICK", body });
}

export async function clearRestNotification() {
  if (isNative()) {
    try { await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIF_ID }] }); } catch (e) {}
    return;
  }
  return postToSW({ type: "REST_CANCEL" });
}
