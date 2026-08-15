import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { getAllWorkouts, deleteWorkout, putWorkout } from "../db/workoutDB.js";
import { workoutVolume, workoutSetCount, workoutDurationSec, monthKey, monthLabel } from "../workout/workoutStats.js";
import {
  BG, SURFACE, SURFACE_ELEVATED, SURFACE_INTERACTIVE,
  BORDER, CARD_BORDER,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_DISABLED,
  ACCENT, ACCENT_SOFT, ACCENT_INK,
  RADIUS_SM, RADIUS_MD, RADIUS_LG, RADIUS_XL,
  SPACE, TOUCH_MIN, TOUCH_PRIMARY,
  TYPE, FONT, BODY,
} from "../tokens.js";

function formatVolume(v) {
  return Math.round(v || 0).toLocaleString();
}

function formatMinutes(sec) {
  return Math.round((sec || 0) / 60);
}

// "Today" / "Yesterday" / "Aug 14" — keeps history cards scannable without a
// full date on every row.
function formatCardDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatFullDate(ts) {
  return new Date(ts).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function groupByMonth(workouts) {
  const groups = new Map();
  for (const w of workouts) {
    const key = monthKey(w.completedAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(w);
  }
  // Map preserves insertion order; workouts arrive newest-first, so the first
  // workout seen for a month is also the most recent month overall.
  return Array.from(groups.entries()).map(([key, items]) => ({ key, label: monthLabel(key), items }));
}

function WorkoutCard({ workout, onOpen }) {
  const sets = workoutSetCount(workout);
  const volume = workoutVolume(workout);
  const minutes = formatMinutes(workoutDurationSec(workout));
  return (
    <div
      onClick={() => onOpen(workout.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: SPACE.md,
        background: SURFACE,
        border: CARD_BORDER,
        borderRadius: RADIUS_LG,
        padding: SPACE.lg,
        marginBottom: SPACE.sm,
        cursor: "pointer",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: SPACE.sm }}>
          <div style={{ ...TYPE.exerciseTitle, color: TEXT_PRIMARY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {workout.sessionName || "Workout"}
          </div>
          <div style={{ ...TYPE.secondary, color: TEXT_TERTIARY, flexShrink: 0 }}>
            {formatCardDate(workout.completedAt)}
          </div>
        </div>
        <div style={{ ...TYPE.secondary, color: TEXT_SECONDARY, marginTop: SPACE.xs }}>
          {minutes} min · {sets} set{sets === 1 ? "" : "s"} · {formatVolume(volume)} kg
        </div>
      </div>
      <ChevronRight size={18} color={TEXT_TERTIARY} style={{ flexShrink: 0 }} />
    </div>
  );
}

function SetRow({ set, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: SPACE.sm,
        padding: "10px 0",
        borderBottom: "1px solid " + BORDER,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="number"
          value={set.weight ?? ""}
          onChange={(e) => onChange({ ...set, weight: e.target.value === "" ? null : Number(e.target.value) })}
          style={{
            ...BODY,
            width: 58,
            padding: "7px 8px",
            borderRadius: RADIUS_SM,
            border: "1px solid " + BORDER,
            background: SURFACE_ELEVATED,
            color: TEXT_PRIMARY,
            fontSize: 13.5,
            textAlign: "right",
          }}
        />
        <span style={{ ...TYPE.secondary, color: TEXT_TERTIARY }}>kg ×</span>
        <input
          type="number"
          value={set.reps ?? ""}
          onChange={(e) => onChange({ ...set, reps: e.target.value === "" ? null : Number(e.target.value) })}
          style={{
            ...BODY,
            width: 46,
            padding: "7px 8px",
            borderRadius: RADIUS_SM,
            border: "1px solid " + BORDER,
            background: SURFACE_ELEVATED,
            color: TEXT_PRIMARY,
            fontSize: 13.5,
            textAlign: "right",
          }}
        />
      </div>
      {set.rpe != null && set.rpe !== "" && (
        <div style={{ ...TYPE.secondary, color: TEXT_TERTIARY, marginLeft: "auto" }}>RPE {set.rpe}</div>
      )}
    </div>
  );
}

function WorkoutDetail({ workout, onBack, onChangeSet, onDelete }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const sets = workoutSetCount(workout);
  const volume = workoutVolume(workout);
  const minutes = formatMinutes(workoutDurationSec(workout));

  return (
    <div>
      <div
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          color: TEXT_SECONDARY,
          cursor: "pointer",
          marginBottom: SPACE.lg,
          minHeight: TOUCH_MIN,
          width: "fit-content",
        }}
      >
        <ChevronLeft size={18} />
        <span style={{ ...TYPE.secondary }}>Back</span>
      </div>

      <div style={{ ...TYPE.screenTitle, color: TEXT_PRIMARY, marginBottom: 4 }}>
        {workout.sessionName || "Workout"}
      </div>
      <div style={{ ...TYPE.secondary, color: TEXT_TERTIARY, marginBottom: SPACE.lg }}>
        {formatFullDate(workout.completedAt)}
      </div>

      <div
        style={{
          display: "flex",
          gap: SPACE.md,
          background: SURFACE,
          border: CARD_BORDER,
          borderRadius: RADIUS_LG,
          padding: SPACE.lg,
          marginBottom: SPACE.xl,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ ...TYPE.meta, color: TEXT_TERTIARY }}>Duration</div>
          <div style={{ ...TYPE.value, color: TEXT_PRIMARY, marginTop: 4 }}>{minutes} min</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...TYPE.meta, color: TEXT_TERTIARY }}>Volume</div>
          <div style={{ ...TYPE.value, color: TEXT_PRIMARY, marginTop: 4 }}>{formatVolume(volume)} kg</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...TYPE.meta, color: TEXT_TERTIARY }}>Sets</div>
          <div style={{ ...TYPE.value, color: TEXT_PRIMARY, marginTop: 4 }}>{sets}</div>
        </div>
      </div>

      {(workout.exercises || []).map((ex, exIdx) => (
        <div key={exIdx} style={{ marginBottom: SPACE.xl }}>
          <div style={{ ...TYPE.sectionTitle, color: TEXT_PRIMARY, marginBottom: SPACE.xs }}>
            {ex.exerciseName}
          </div>
          {ex.note && (
            <div style={{ ...TYPE.secondary, color: TEXT_TERTIARY, marginBottom: SPACE.sm }}>{ex.note}</div>
          )}
          <div
            style={{
              background: SURFACE,
              border: CARD_BORDER,
              borderRadius: RADIUS_LG,
              padding: "0 " + SPACE.lg + "px",
            }}
          >
            {(ex.sets || []).length === 0 ? (
              <div style={{ ...TYPE.secondary, color: TEXT_TERTIARY, padding: "10px 0" }}>No sets logged.</div>
            ) : (
              ex.sets.map((set, setIdx) => (
                <div
                  key={set.id || setIdx}
                  style={setIdx === ex.sets.length - 1 ? { borderBottom: "none" } : undefined}
                >
                  <SetRow set={set} onChange={(next) => onChangeSet(exIdx, setIdx, next)} />
                </div>
              ))
            )}
          </div>
        </div>
      ))}

      <div style={{ marginTop: SPACE.xxl, paddingTop: SPACE.lg, borderTop: "1px solid " + BORDER }}>
        {!confirmingDelete ? (
          <div
            onClick={() => setConfirmingDelete(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              color: TEXT_TERTIARY,
              cursor: "pointer",
              padding: SPACE.md,
              minHeight: TOUCH_MIN,
            }}
          >
            <Trash2 size={16} />
            <span style={{ ...TYPE.secondary }}>Delete workout</span>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: SPACE.md,
              padding: SPACE.md,
            }}
          >
            <div style={{ ...TYPE.secondary, color: TEXT_SECONDARY }}>Delete this workout?</div>
            <button
              onClick={() => setConfirmingDelete(false)}
              style={{
                ...BODY,
                fontSize: 13.5,
                fontWeight: 600,
                padding: "8px 14px",
                borderRadius: RADIUS_SM,
                border: "1px solid " + BORDER,
                background: SURFACE_INTERACTIVE,
                color: TEXT_PRIMARY,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              style={{
                ...BODY,
                fontSize: 13.5,
                fontWeight: 600,
                padding: "8px 14px",
                borderRadius: RADIUS_SM,
                border: "none",
                background: "#D64545",
                color: "#FFFFFF",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryScreen() {
  const [workouts, setWorkouts] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getAllWorkouts().then((all) => {
      if (cancelled) return;
      const completed = all
        .filter((w) => w.completedAt)
        .sort((a, b) => b.completedAt - a.completedAt);
      setWorkouts(completed);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const openWorkout = workouts.find((w) => w.id === openId) || null;

  function handleChangeSet(exIdx, setIdx, nextSet) {
    if (!openWorkout) return;
    const nextExercises = openWorkout.exercises.map((ex, i) => {
      if (i !== exIdx) return ex;
      const nextSets = ex.sets.map((s, j) => (j === setIdx ? nextSet : s));
      return { ...ex, sets: nextSets };
    });
    const nextWorkout = { ...openWorkout, exercises: nextExercises };
    setWorkouts((prev) => prev.map((w) => (w.id === nextWorkout.id ? nextWorkout : w)));
    putWorkout(nextWorkout);
  }

  async function handleDelete() {
    if (!openWorkout) return;
    await deleteWorkout(openWorkout.id);
    setWorkouts((prev) => prev.filter((w) => w.id !== openWorkout.id));
    setOpenId(null);
  }

  if (openWorkout) {
    return (
      <div style={{ ...BODY, background: BG, color: TEXT_PRIMARY, minHeight: "100%", padding: SPACE.lg }}>
        <WorkoutDetail
          workout={openWorkout}
          onBack={() => setOpenId(null)}
          onChangeSet={handleChangeSet}
          onDelete={handleDelete}
        />
      </div>
    );
  }

  const months = groupByMonth(workouts);

  return (
    <div style={{ ...BODY, background: BG, color: TEXT_PRIMARY, minHeight: "100%", padding: SPACE.lg }}>
      <div style={{ ...TYPE.screenTitle, color: TEXT_PRIMARY, marginBottom: SPACE.xl }}>History</div>

      {workouts.length === 0 ? (
        <div style={{ padding: SPACE.xxl + "px 0" }}>
          <div style={{ ...TYPE.sectionTitle, color: TEXT_PRIMARY, marginBottom: SPACE.sm }}>NO WORKOUTS YET</div>
          <div style={{ ...TYPE.secondary, color: TEXT_TERTIARY }}>
            Complete your first workout and it'll show up here.
          </div>
        </div>
      ) : (
        months.map((month) => (
          <div key={month.key} style={{ marginBottom: SPACE.xl }}>
            <div style={{ ...TYPE.meta, color: TEXT_TERTIARY, marginBottom: SPACE.sm }}>{month.label}</div>
            {month.items.map((w) => (
              <WorkoutCard key={w.id} workout={w} onOpen={setOpenId} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
