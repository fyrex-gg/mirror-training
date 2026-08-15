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

There are two ways to run Mirror on Android — pick one:

### Option A: PWA (installs from the browser, easiest)

1. Open the URL above in **Chrome on Android**.
2. Tap the **⋮** menu → **Add to Home screen** (Chrome may also prompt you
   automatically). This installs it as a standalone app icon — no app store needed.
3. On first use, tap **"Enable lock-screen alerts"** on the Timer card, or tap any
   rest-length preset button (60s/90s/120s/180s) — either one triggers Android's
   notification-permission prompt. You must grant it for rest-timer alerts to reach
   your lock screen.
   - If you accidentally deny it, the Timer card will show *"Notifications blocked
     in browser settings"*. To fix: open Chrome's site settings for this page
     (tap the 🔒/ⓘ icon in the address bar → **Permissions → Notifications**) and
     set it back to **Allow**, then reload the page.
4. The beep + vibration in the page itself always work regardless of notification
   permission. The notification itself is silent (no duplicate sound) — it's a
   visual lock-screen record, and on the web it can lag or stall once the screen
   actually locks (see the Android app option below for a fix to that).

### Option B: Android app (Phase 2 — reliable notifications even when locked)

The PWA's rest-timer countdown is driven by the page's own JavaScript, which
Android throttles or suspends once the screen locks — so the "rest over" alert
can lag or not fire at all if you lock your phone mid-rest. The Android app
fixes this by scheduling a real OS-level alarm the moment rest starts
(`LocalNotifications.schedule`), which Android fires at the exact time
regardless of whether the screen is locked or the app is closed.

Under the hood it's a thin native shell that loads this same live Pages URL —
so once installed, **your everyday updates (program changes, bug fixes, UI
tweaks) show up automatically, no reinstall needed**, exactly like the PWA.
You only need a new APK on the rare occasion the native shell itself changes
(a new permission, a new plugin).

**Install it:**

1. Grab the APK from this repo's **Releases** page (or the **Actions** tab →
   latest `Build Android APK` run → **Artifacts**).
2. On your phone: Settings → Security (or "Apps") → allow **"Install unknown
   apps"** for whichever app you downloaded the APK with (e.g. Chrome, Files).
3. Open the downloaded `app-debug.apk` and install it.
4. First launch will prompt for notification permission — grant it.

**Keeping it updated without the Play Store:** install
[**Obtainium**](https://github.com/ImranR98/Obtainium), point it at
`fyrex-gg/mirror-training`, and it'll check this repo's Releases and prompt
you to install new APKs when the native shell changes. Every build is signed
with the same committed debug keystore, so updates install cleanly over the
old version instead of requiring an uninstall first.

**Building an APK yourself:** push a tag (`git tag v1.0 && git push --tags`)
or run the `Build Android APK` workflow manually from the **Actions** tab —
either publishes a debug-signed APK to both the workflow artifacts and a
GitHub Release.

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
npm run dev               # http://localhost:5173/mirror-training/
npm run build              # production build to ./dist
npm run preview            # serve the production build locally
npm run gen-icons          # regenerate public/icon-192.png and icon-512.png
npm run gen-android-icons  # regenerate the Android launcher icon set
```

### Android app development

```bash
npm run build             # the Android shell loads the live Pages URL, but
                           # `npx cap sync` still needs a local dist/ present
npx cap sync android       # copy config + plugins into android/
npx cap open android       # open in Android Studio, or:
cd android && ./gradlew assembleDebug   # build android/app/build/outputs/apk/debug/app-debug.apk
```

The app ID is `com.mirror.training`. `capacitor.config.json` at the repo root
points the shell at `https://fyrex-gg.github.io/mirror-training/` — if you
rename the repo or move to a custom domain, update `server.url` there (and
`vite.config.js`'s `base`) together.

## What's under the hood

- **React + Vite**, no CSS framework, no CDN assets — bundled for offline use in a
  gym with no signal.
- **`public/sw.js`** — hand-written service worker. Network-first for the HTML
  shell (so a new deploy shows up on the very next load), cache-first for the
  hashed JS/CSS bundle and icons (safe, since their filenames change every
  build), network-first for TheMealDB recipe requests (fails gracefully offline
  instead of breaking the app), and it's the only way to get a real lock-screen
  notification on Android Chrome (`registration.showNotification()`, not the
  plain `Notification` constructor).
- **`src/notify.js`** — branches by platform. On the web it requests
  `Notification` permission and posts messages to the service worker (silent —
  the page's own beep/vibrate are the only audible cue, with the tray text
  refreshing every 5s while rest counts down). On the Capacitor native shell it
  uses `@capacitor/local-notifications` to schedule one OS-level alarm the
  moment rest starts, which fires exactly on time regardless of screen lock.
- **`capacitor.config.json`** + **`android/`** — the Capacitor Android shell
  (Phase 2). It loads the live Pages URL rather than bundling a snapshot of the
  web app, so ordinary content updates need no reinstall.
- **`localStorage`** under the key `program-state-v3` — your training history,
  weights, and progress. Back it up or move it to another device from the
  **Rules** tab (base64 code, copy/paste, no server involved).

## Known limits

- On the **PWA**, full lock-screen notification reliability (firing exactly on
  time while the screen is locked) isn't guaranteed — Android throttles page
  JavaScript once the screen locks. Use the **Android app** (above) if this
  matters to you; it schedules a real OS alarm instead.
- The leg-day weight caps (45 kg / 90 kg) in the program data are a deliberate
  medical safety constraint — don't raise them.
