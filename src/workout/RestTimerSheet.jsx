// Visual redesign of the rest timer as a sticky bottom sheet.
//
// This is a PURE RE-SKIN of the `Timer` component in App.jsx — every event
// handler below calls the exact same props with the exact same arguments
// that Timer does. No timing math lives here: `restLeft`/`elapsed` arrive
// pre-computed every tick, and `onStartRest` owns the wall-clock anchoring.
// This file only decides how those numbers look.
//
// Redesigned to cut down on always-visible chrome (user feedback: the
// original stacked 13 rows at once, including two separate buttons that
// both just toggled the same `running` state). Now: a slim one-line strip
// when idle, a focused countdown + minimal controls while actually resting,
// and everything else (presets, phone-timer handoff, screen-on toggle, help
// text) tucked behind a small expandable section instead of always showing.
import { useState } from "react";
import { Play, Pause, RotateCcw, SkipForward, Timer as TimerIcon, Bell, ChevronDown, ChevronUp } from "lucide-react";

const FONT = { fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif" };
const CARD_BORDER = "1px solid rgba(255,255,255,0.055)";
const mmss = (t) => Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");

// Same intent:// handoff URL the original Timer builds — Android-only, opens
// the system clock app's timer pre-filled with the current rest length.
function androidTimerUrl(seconds, label) {
  return "intent:#Intent;action=android.intent.action.SET_TIMER;" +
    "i.android.intent.extra.alarm.LENGTH=" + seconds + ";" +
    "B.android.intent.extra.alarm.SKIP_UI=true;" +
    "S.android.intent.extra.alarm.MESSAGE=" + encodeURIComponent(label) + ";end";
}

export default function RestTimerSheet({
  color, rest, setRest, restLeft, setRestLeft, running, setRunning,
  elapsed, setElapsed, keepAwake, setKeepAwake, wakeState,
  notifPerm, onPresetTap, onRestCancel, exactAlarm, onFixExactAlarm, onStartRest,
}) {
  const [expanded, setExpanded] = useState(false);
  const resting = restLeft > 0;
  const urgent = resting && restLeft <= 10;
  const pct = resting ? (restLeft / rest) * 100 : 0;
  const presets = [60, 90, 120, 180];
  const adjust = (d) => setRest(Math.max(15, Math.min(600, rest + d)));

  const countdownColor = urgent ? "#FF6B4A" : color;
  const runLabel = running ? "Pause" : elapsed ? "Resume" : "Start";
  const needsAttention = notifPerm === "default" || (exactAlarm !== "granted" && exactAlarm !== "unsupported");

  return (
    <div
      style={{
        ...FONT,
        position: "sticky",
        bottom: 12,
        zIndex: 40,
        marginTop: 16,
        marginBottom: 4,
        background: "#1D2128",
        border: CARD_BORDER,
        borderRadius: 16,
        padding: "10px 14px calc(10px + env(safe-area-inset-bottom, 0px))",
        color: "#E8EAED",
      }}
    >
      {/* Always-visible line: workout stopwatch + the one pause/resume control
          (it drives both the elapsed timer and the rest countdown — they were
          two separate buttons before, which was confusing since they controlled
          the same thing). */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: 1.5, color: "#8A919C", textTransform: "uppercase" }}>Workout</div>
        <div style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", flex: 1 }}>{mmss(elapsed)}</div>
        <button
          onClick={() => setRunning(!running)}
          aria-label={runLabel}
          style={{
            ...FONT, display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10,
            border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700,
            background: running ? "#333945" : color, color: running ? "#E8EAED" : "#14171C",
          }}
        >
          {running ? <Pause size={12} /> : <Play size={12} />} {runLabel}
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Hide timer settings" : "Show timer settings"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30,
            borderRadius: 9, cursor: "pointer", background: "transparent", border: "1px solid #333945",
            color: "#8A919C", flexShrink: 0,
          }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Rest countdown — only takes real space once a rest period is actually
          running. Before that, resting === false and this whole block is gone,
          which is most of a workout (you're doing reps, not resting). */}
      {resting && (
        <>
          <div style={{ height: 1, background: "#262B33", margin: "10px 0" }} />
          <div style={{ fontSize: 10.5, letterSpacing: 1.8, color: "#8A919C", textTransform: "uppercase", fontWeight: 600 }}>
            Rest
          </div>
          <div
            style={{
              fontVariantNumeric: "tabular-nums", fontWeight: 800, lineHeight: 1, margin: "4px 0 10px",
              fontSize: urgent ? 56 : 46, color: countdownColor, transition: "color 0.25s ease, font-size 0.2s ease",
            }}
          >
            {mmss(restLeft)}
          </div>
          <div style={{ height: 6, background: "#262B33", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: pct + "%", borderRadius: 999,
              background: urgent ? "#FF6B4A" : color, transition: "width 1s linear" }} />
          </div>

          <div style={{ display: "flex", alignItems: "stretch", gap: 8, marginTop: 10 }}>
            <button
              onClick={() => adjust(-15)}
              style={{ ...FONT, width: 52, minHeight: 48, borderRadius: 12, cursor: "pointer", fontSize: 14,
                fontWeight: 700, border: "1px solid #333945", background: "transparent", color: "#B9BFC7" }}
            >
              −15
            </button>
            <button
              onClick={() => { setRestLeft(0); onRestCancel && onRestCancel(); }}
              style={{ ...FONT, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                minHeight: 48, borderRadius: 12, cursor: "pointer", fontSize: 14.5, fontWeight: 700,
                border: "none", background: color, color: "#14171C" }}
            >
              <SkipForward size={15} /> Skip rest
            </button>
            <button
              onClick={() => adjust(15)}
              style={{ ...FONT, width: 52, minHeight: 48, borderRadius: 12, cursor: "pointer", fontSize: 14,
                fontWeight: 700, border: "1px solid #333945", background: "transparent", color: "#B9BFC7" }}
            >
              +15
            </button>
          </div>
        </>
      )}

      {/* A single unobtrusive line when something actually needs the user's
          attention (notifications off, exact alarms not granted) — shown
          regardless of the expand state since it affects whether rest alerts
          work at all, but kept to one line instead of a stacked block. */}
      {!expanded && needsAttention && (
        <div
          onClick={notifPerm === "default" ? () => onPresetTap && onPresetTap() : onFixExactAlarm}
          role="button"
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11,
            color: notifPerm === "default" ? color : "#E5B93C", marginTop: 8, cursor: "pointer", fontWeight: 600 }}
        >
          <Bell size={12} />
          {notifPerm === "default" ? "Enable lock-screen alerts" : "Rest alerts may arrive late — tap to allow exact alarms"}
        </div>
      )}

      {/* Everything else — presets, phone-timer handoff, screen-on toggle,
          reset, help text — lives behind the chevron instead of always
          taking up space. */}
      {expanded && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 1, background: "#262B33", margin: "0 0 10px" }} />

          <div style={{ display: "flex", gap: 6 }}>
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => { onPresetTap && onPresetTap(p); setRest(p); onStartRest(p); }}
                style={{ ...FONT, flex: 1, padding: "8px 0", borderRadius: 10, cursor: "pointer", fontSize: 12.5,
                  fontWeight: 600, border: "none", background: rest === p ? "#333945" : "#14171C",
                  color: rest === p ? "#E8EAED" : "#8A919C" }}
              >
                {p}s
              </button>
            ))}
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: "#8A919C", marginTop: 6 }}>
            rest set to <b style={{ color: "#E8EAED" }}>{mmss(rest)}</b>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
            <a
              href={androidTimerUrl(restLeft > 0 ? restLeft : rest, "Rest " + mmss(restLeft > 0 ? restLeft : rest))}
              style={{ ...FONT, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, background: "#14171C",
                border: "1px solid #333945", color: "#B9BFC7", textDecoration: "none" }}
            >
              <TimerIcon size={14} /> Phone timer ({mmss(restLeft > 0 ? restLeft : rest)})
            </a>
            <button
              onClick={() => setKeepAwake(!keepAwake)}
              style={{ ...FONT, padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
                border: "1px solid " + (keepAwake ? color : "#333945"),
                background: keepAwake ? "rgba(255,255,255,0.06)" : "transparent",
                color: keepAwake ? "#E8EAED" : "#8A919C" }}
            >
              {keepAwake ? "Screen on ✓" : "Screen on"}
            </button>
          </div>

          <button
            onClick={() => { setRunning(false); setElapsed(0); setRestLeft(0); onRestCancel && onRestCancel(); }}
            style={{ ...FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
              marginTop: 10, padding: "8px 0", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
              background: "transparent", border: "1px solid #333945", color: "#8A919C" }}
          >
            <RotateCcw size={12} /> Reset workout timer
          </button>

          <div style={{ fontSize: 10.5, color: "#5B626C", marginTop: 9, lineHeight: 1.45 }}>
            Ticking a set starts the rest countdown. "Phone timer" hands your current rest length to the
            Android clock so it rings even when locked{wakeState ? " · screen lock is being held off" : ""}.
          </div>
          {notifPerm === "denied" && (
            <div style={{ fontSize: 11, color: "#8A919C", marginTop: 6 }}>
              Notifications blocked in browser settings
            </div>
          )}
        </div>
      )}
    </div>
  );
}
