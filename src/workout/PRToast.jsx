// Celebratory toast that fires the instant a set is checked off which beats
// the user's prior best for that exercise — distinct from the end-of-workout
// SummaryScreen's PR list (WorkoutEngine.jsx), which recaps after the fact.
// This is the in-the-moment "you just did that" beat.
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { FONT, ACCENT, ACCENT_SOFT, ACCENT_INK, RADIUS_LG, SPACE, MOTION } from "../tokens";

const DISMISS_MS = 2500;

export default function PRToast({ pr, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const prKey = pr ? pr.exerciseName + pr.weight + pr.reps : null;

  // Mount-transition trick: render at the pre-transition (hidden) styles on
  // the same tick pr shows up, then flip to visible one tick later so the
  // browser has committed the initial styles before the transition starts.
  useEffect(() => {
    if (!prKey) {
      setVisible(false);
      return;
    }
    setVisible(false);
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [prKey]);

  // Auto-dismiss, restarted whenever a genuinely new PR arrives (even one
  // with the same exercise/weight/reps shape as the last).
  useEffect(() => {
    if (!prKey) return;
    const t = setTimeout(() => {
      onDismiss && onDismiss();
    }, DISMISS_MS);
    return () => clearTimeout(t);
  }, [prKey, onDismiss]);

  if (!pr) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: visible ? "calc(env(safe-area-inset-top, 0px) + " + SPACE.lg + "px)" : "calc(env(safe-area-inset-top, 0px) - 8px)",
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - " + SPACE.lg * 2 + "px)",
        maxWidth: 480,
        zIndex: 60,
        opacity: visible ? 1 : 0,
        transition: "top " + MOTION.card + ", opacity " + MOTION.card,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          ...FONT,
          display: "flex",
          alignItems: "center",
          gap: SPACE.sm,
          background: ACCENT,
          border: "1px solid " + ACCENT,
          borderRadius: RADIUS_LG,
          padding: "12px 16px",
          boxShadow: "0 10px 28px rgba(0,0,0,0.35), 0 0 0 6px " + ACCENT_SOFT,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: "50%",
            background: ACCENT_INK,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Trophy size={19} color={ACCENT} strokeWidth={2.5} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: ACCENT_INK, lineHeight: 1.2 }}>New PR!</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: ACCENT_INK,
              opacity: 0.8,
              lineHeight: 1.3,
              marginTop: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {pr.exerciseName} · {pr.weight} kg × {pr.reps}
          </div>
        </div>
      </div>
    </div>
  );
}
