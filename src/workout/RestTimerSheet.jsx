// Visual redesign of the rest timer as a sticky bottom sheet.
//
// This is a PURE RE-SKIN of the `Timer` component in App.jsx — every event
// handler below calls the exact same props with the exact same arguments
// that Timer does. No timing math lives here: `restLeft`/`elapsed` arrive
// pre-computed every tick, and `onStartRest` owns the wall-clock anchoring.
// This file only decides how those numbers look.
import { Play, Pause, RotateCcw, SkipForward, Timer as TimerIcon, Bell } from "lucide-react";

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
  const resting = restLeft > 0;
  const urgent = resting && restLeft <= 10;
  const pct = resting ? (restLeft / rest) * 100 : 0;
  const presets = [60, 90, 120, 180];
  const adjust = (d) => setRest(Math.max(15, Math.min(600, rest + d)));

  const countdownColor = !resting ? "#5B626C" : urgent ? "#FF6B4A" : color;
  const runLabel = running ? "Pause" : elapsed ? "Resume" : "Start";

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
        padding: "12px 14px calc(12px + env(safe-area-inset-bottom, 0px))",
        color: "#E8EAED",
      }}
    >
      {/* Workout stopwatch — compact strip up top, same start/pause/reset behavior */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: "#8A919C", textTransform: "uppercase" }}>Workout</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{mmss(elapsed)}</div>
        </div>
        <button
          onClick={() => setRunning(!running)}
          style={{
            ...FONT, display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10,
            border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700,
            background: running ? "#333945" : color, color: running ? "#E8EAED" : "#14171C",
          }}
        >
          {running ? <Pause size={12} /> : <Play size={12} />} {runLabel}
        </button>
        <button
          onClick={() => { setRunning(false); setElapsed(0); setRestLeft(0); onRestCancel && onRestCancel(); }}
          style={{
            ...FONT, display: "flex", alignItems: "center", gap: 5, padding: "7px 10px", borderRadius: 10,
            cursor: "pointer", fontSize: 12.5, fontWeight: 600, background: "transparent",
            border: "1px solid #333945", color: "#8A919C",
          }}
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      <div style={{ height: 1, background: "#262B33", margin: "11px 0" }} />

      {/* Dominant rest countdown */}
      <div style={{ fontSize: 10.5, letterSpacing: 1.8, color: "#8A919C", textTransform: "uppercase", fontWeight: 600 }}>
        Rest
      </div>
      <div
        style={{
          fontVariantNumeric: "tabular-nums",
          fontWeight: 800,
          lineHeight: 1,
          margin: "4px 0 10px",
          fontSize: urgent ? 60 : resting ? 52 : 38,
          color: countdownColor,
          transition: "color 0.25s ease, font-size 0.2s ease",
        }}
      >
        {resting ? mmss(restLeft) : mmss(rest)}
      </div>

      {/* Progress bar — filled % of restLeft/rest, using the session accent color */}
      <div style={{ height: 7, background: "#262B33", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            height: "100%", width: pct + "%", borderRadius: 999,
            background: urgent ? "#FF6B4A" : color, transition: "width 1s linear",
          }}
        />
      </div>

      {/* Quick-start presets */}
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => { onPresetTap && onPresetTap(p); setRest(p); onStartRest(p); }}
            style={{
              ...FONT, flex: 1, padding: "8px 0", borderRadius: 10, cursor: "pointer", fontSize: 12.5,
              fontWeight: 600, border: "none", background: rest === p ? "#333945" : "#14171C",
              color: rest === p ? "#E8EAED" : "#8A919C",
            }}
          >
            {p}s
          </button>
        ))}
      </div>

      {/* Primary controls: −15s / Pause-Resume / +15s, generous touch targets */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 8, marginTop: 10 }}>
        <button
          onClick={() => adjust(-15)}
          style={{
            ...FONT, width: 56, minHeight: 52, borderRadius: 12, cursor: "pointer", fontSize: 14.5,
            fontWeight: 700, border: "1px solid #333945", background: "transparent", color: "#B9BFC7",
          }}
        >
          −15
        </button>
        <button
          onClick={() => setRunning(!running)}
          style={{
            ...FONT, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            minHeight: 52, borderRadius: 12, border: "none", cursor: "pointer", fontSize: 16, fontWeight: 700,
            background: running ? "#333945" : color, color: running ? "#E8EAED" : "#14171C",
          }}
        >
          {running ? <Pause size={17} /> : <Play size={17} />} {runLabel}
        </button>
        <button
          onClick={() => adjust(15)}
          style={{
            ...FONT, width: 56, minHeight: 52, borderRadius: 12, cursor: "pointer", fontSize: 14.5,
            fontWeight: 700, border: "1px solid #333945", background: "transparent", color: "#B9BFC7",
          }}
        >
          +15
        </button>
      </div>

      <div style={{ textAlign: "center", fontSize: 11, color: "#8A919C", marginTop: 6 }}>
        rest set to <b style={{ color: "#E8EAED" }}>{mmss(rest)}</b>
      </div>

      {resting && (
        <button
          onClick={() => { setRestLeft(0); onRestCancel && onRestCancel(); }}
          style={{
            ...FONT, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            minHeight: 48, borderRadius: 12, cursor: "pointer", fontSize: 14.5, fontWeight: 700,
            border: "1px solid #333945", background: "transparent", color: "#B9BFC7", marginTop: 8,
          }}
        >
          <SkipForward size={15} /> Skip
        </button>
      )}

      <div style={{ height: 1, background: "#262B33", margin: "12px 0 10px" }} />

      {/* Lock-screen options — Android phone-timer handoff + wake-lock toggle */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <a
          href={androidTimerUrl(restLeft > 0 ? restLeft : rest, "Rest " + mmss(restLeft > 0 ? restLeft : rest))}
          style={{
            ...FONT, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, background: "#14171C",
            border: "1px solid #333945", color: "#B9BFC7", textDecoration: "none",
          }}
        >
          <TimerIcon size={14} /> Phone timer ({mmss(restLeft > 0 ? restLeft : rest)})
        </a>
        <button
          onClick={() => setKeepAwake(!keepAwake)}
          style={{
            ...FONT, padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
            border: "1px solid " + (keepAwake ? color : "#333945"),
            background: keepAwake ? "rgba(255,255,255,0.06)" : "transparent",
            color: keepAwake ? "#E8EAED" : "#8A919C",
          }}
        >
          {keepAwake ? "Screen on ✓" : "Screen on"}
        </button>
      </div>

      <div style={{ fontSize: 10.5, color: "#5B626C", marginTop: 7, lineHeight: 1.45 }}>
        Ticking a set starts the rest countdown. "Phone timer" hands your current rest length to the
        Android clock so it rings even when locked{wakeState ? " · screen lock is being held off" : ""}.
      </div>

      {notifPerm === "default" && (
        <div
          onClick={() => onPresetTap && onPresetTap()}
          role="button"
          style={{
            display: "flex", alignItems: "center", gap: 4, fontSize: 11, color, marginTop: 6,
            cursor: "pointer", fontWeight: 600,
          }}
        >
          <Bell size={12} /> Enable lock-screen alerts
        </div>
      )}
      {notifPerm === "denied" && (
        <div style={{ fontSize: 11, color: "#8A919C", marginTop: 5 }}>
          Notifications blocked in browser settings
        </div>
      )}
      {exactAlarm !== "granted" && exactAlarm !== "unsupported" && (
        <div
          onClick={onFixExactAlarm}
          role="button"
          style={{
            display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#E5B93C", marginTop: 5,
            cursor: "pointer", fontWeight: 600,
          }}
        >
          <TimerIcon size={12} /> Rest alerts may arrive late — tap to allow exact alarms
        </div>
      )}
    </div>
  );
}
