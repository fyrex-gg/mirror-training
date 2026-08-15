import { useState, useEffect } from "react";
import { Flame, ChevronRight, Play } from "lucide-react";
import { SESSIONS } from "../data/sessions.js";
import {
  FONT, SURFACE, SURFACE_ELEVATED, CARD_BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY,
  ACCENT, ACCENT_SOFT, ACCENT_INK, RADIUS_LG, RADIUS_MD, SPACE,
} from "../tokens.js";
import { getAllWorkouts, getActiveWorkout } from "../db/workoutDB.js";
import { workoutVolume, workoutSetCount, currentStreak, monthKey } from "../workout/workoutStats.js";

function relDate(ts) {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return days + " days ago";
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function HomeScreen({ onGoToWorkout }) {
  const [workouts, setWorkouts] = useState([]);
  const [active, setActive] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [all, a] = await Promise.all([getAllWorkouts(), getActiveWorkout()]);
      setWorkouts((all || []).filter((w) => w.completedAt).sort((x, y) => y.completedAt - x.completedAt));
      setActive(a || null);
      setLoaded(true);
    })();
  }, []);

  if (!loaded) {
    return <div style={{ padding: SPACE.xxl, textAlign: "center", color: TEXT_TERTIARY, fontSize: 13 }}>Loading…</div>;
  }

  const last = workouts[0];
  const lastSession = last && SESSIONS.find((s) => s.id === last.sessionType);
  const streak = currentStreak(workouts);
  const thisMonth = monthKey(Date.now());
  const monthWorkouts = workouts.filter((w) => monthKey(w.completedAt) === thisMonth);
  const monthVolume = monthWorkouts.reduce((a, w) => a + workoutVolume(w), 0);
  const monthSets = monthWorkouts.reduce((a, w) => a + workoutSetCount(w), 0);

  return (
    <div style={{ padding: SPACE.lg }}>
      <div style={{ ...FONT, fontSize: 11, letterSpacing: 2, color: TEXT_TERTIARY, fontWeight: 700 }}>
        MIRROR
      </div>
      <div style={{ ...FONT, fontSize: 28, fontWeight: 800, color: TEXT_PRIMARY, marginTop: 4, marginBottom: SPACE.lg }}>
        {active ? "Pick up where you left off" : "Ready to train?"}
      </div>

      {active ? (
        <button onClick={onGoToWorkout}
          style={{ ...FONT, display: "block", width: "100%", textAlign: "left", background: ACCENT_SOFT,
            border: "1px solid " + ACCENT, borderRadius: RADIUS_LG, padding: SPACE.lg, marginBottom: SPACE.md,
            cursor: "pointer" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, letterSpacing: 1 }}>WORKOUT IN PROGRESS</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: TEXT_PRIMARY }}>
              {(SESSIONS.find((s) => s.id === active.sessionType) || {}).name || "Workout"}
            </div>
            <Play size={18} color={ACCENT} fill={ACCENT} />
          </div>
        </button>
      ) : (
        <button onClick={onGoToWorkout}
          style={{ ...FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", background: ACCENT, border: "none", borderRadius: RADIUS_LG, padding: "16px 0",
            fontSize: 16, fontWeight: 800, color: ACCENT_INK, cursor: "pointer", marginBottom: SPACE.md }}>
          <Play size={17} fill={ACCENT_INK} /> Start a workout
        </button>
      )}

      {streak > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: SURFACE, border: CARD_BORDER,
          borderRadius: RADIUS_MD, padding: "12px 14px", marginBottom: SPACE.md }}>
          <Flame size={18} color="#E5B93C" fill="#E5B93C" />
          <div style={{ fontSize: 13.5, color: TEXT_PRIMARY, fontWeight: 600 }}>
            {streak} day{streak === 1 ? "" : "s"} streak
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SPACE.sm, marginBottom: SPACE.lg }}>
        <div style={{ background: SURFACE, border: CARD_BORDER, borderRadius: RADIUS_MD, padding: SPACE.md }}>
          <div style={{ ...FONT, fontSize: 20, fontWeight: 800, color: TEXT_PRIMARY }}>{monthWorkouts.length}</div>
          <div style={{ fontSize: 10.5, letterSpacing: 1, color: TEXT_TERTIARY, textTransform: "uppercase", marginTop: 2 }}>
            Workouts this month
          </div>
        </div>
        <div style={{ background: SURFACE, border: CARD_BORDER, borderRadius: RADIUS_MD, padding: SPACE.md }}>
          <div style={{ ...FONT, fontSize: 20, fontWeight: 800, color: TEXT_PRIMARY }}>{Math.round(monthVolume).toLocaleString()}</div>
          <div style={{ fontSize: 10.5, letterSpacing: 1, color: TEXT_TERTIARY, textTransform: "uppercase", marginTop: 2 }}>
            kg lifted ({monthSets} sets)
          </div>
        </div>
      </div>

      {last && lastSession ? (
        <>
          <div style={{ ...FONT, fontSize: 13, fontWeight: 700, color: TEXT_SECONDARY, marginBottom: SPACE.sm }}>Last workout</div>
          <div style={{ background: SURFACE, border: CARD_BORDER, borderRadius: RADIUS_MD, padding: SPACE.md,
            display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: lastSession.color }}>{lastSession.name}</div>
              <div style={{ fontSize: 11.5, color: TEXT_TERTIARY, marginTop: 3 }}>
                {relDate(last.completedAt)} · {workoutSetCount(last)} sets · {Math.round(workoutVolume(last))} kg
              </div>
            </div>
            <ChevronRight size={16} color={TEXT_TERTIARY} />
          </div>
        </>
      ) : (
        <div style={{ ...FONT, fontSize: 13, color: TEXT_TERTIARY, textAlign: "center", marginTop: SPACE.xl }}>
          No workouts logged yet — start your first one above.
        </div>
      )}
    </div>
  );
}
