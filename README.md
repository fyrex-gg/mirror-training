# Mirror — Training

A personal gym training PWA: 12-week program (2-1-2-2 split), a workout stopwatch
and adjustable rest timer with lock-screen notifications, fuel/macro tracking with
recipe search, and off-day mobility/pelvic-floor routines. Everything is saved on
your device — no accounts, no backend.

## One-time setup: turn on GitHub Pages

Deployment is automatic on every push to `main`, but Pages has to be switched on
once by hand — nothing will be live until you do this:

1. Go to this repo's **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push (or re-run) the `Deploy to GitHub Pages` workflow under the **Actions** tab.

After that, the app is live at:

**https://fyrex-gg.github.io/mirror-training/**

## Installing it on your phone

1. Open the URL above in **Chrome on Android**.
2. Tap the **⋮** menu → **Add to Home screen** (Chrome may also prompt you
   automatically). This installs it as a standalone app icon — no app store needed.
3. On first use, tap **"Enable lock-screen alerts"** on the Timer card, or tap any
   rest-length preset button (60s/90s/120s/180s) — either one triggers Android's
   notification-permission prompt. You must grant it for rest-timer alerts to reach
   your lock screen with sound and vibration.
   - If you accidentally deny it, the Timer card will show *"Notifications blocked
     in browser settings"*. To fix: open Chrome's site settings for this page
     (tap the 🔒/ⓘ icon in the address bar → **Permissions → Notifications**) and
     set it back to **Allow**, then reload the page.
4. The beep + vibration in the page itself always work regardless of notification
   permission — the lock-screen alert is an extra layer for when the phone is
   locked or the tab is backgrounded.

## Editing your program

All training data lives in the `SESSIONS` array near the top of `src/App.jsx` —
exercises, sets, rep ranges, and weight min/max/step per exercise. Edit it there,
commit, and push to `main`; the live app updates itself next time you open it
(the service worker fetches the new build in the background).

## Updates

Every push to `main` triggers the `Deploy to GitHub Pages` workflow automatically.
Once it finishes (check the **Actions** tab), just reopen the app on your phone —
the service worker will pick up the new version. If a change doesn't seem to show
up, force-close and reopen the app once; the old version keeps serving offline
content until the new one has fully installed in the background.

## Local development

```bash
npm install
npm run dev       # http://localhost:5173/mirror-training/
npm run build      # production build to ./dist
npm run preview    # serve the production build locally
npm run gen-icons  # regenerate public/icon-192.png and icon-512.png
```

## What's under the hood

- **React + Vite**, no CSS framework, no CDN assets — bundled for offline use in a
  gym with no signal.
- **`public/sw.js`** — hand-written service worker. Cache-first for the app shell
  (offline-capable), network-first for TheMealDB recipe requests (fails gracefully
  offline instead of breaking the app), and it's the only way to get a real
  lock-screen notification on Android Chrome (`registration.showNotification()`,
  not the plain `Notification` constructor).
- **`src/notify.js`** — thin wrapper for requesting notification permission (from
  a user gesture) and posting the "rest is over" message to the service worker.
- **`localStorage`** under the key `program-state-v3` — your training history,
  weights, and progress. Back it up or move it to another device from the
  **Rules** tab (base64 code, copy/paste, no server involved).

## Known limits

- Full lock-screen notification behavior (appearing over the lock screen with
  sound/vibration while the app is fully backgrounded) needs a real Android
  device over HTTPS — GitHub Pages provides the HTTPS part automatically. Desktop
  browsers will show the same notification in the OS tray instead.
- The leg-day weight caps (45 kg / 90 kg) in the program data are a deliberate
  medical safety constraint — don't raise them.
