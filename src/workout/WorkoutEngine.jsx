import { useState, useEffect, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Info, Check, Plus, Trophy, RotateCcw, ExternalLink, TrendingUp, MoreVertical } from "lucide-react";
import { SESSIONS, DELOAD_WEEKS } from "../data/sessions.js";
import { WSlider } from "./WeightDial.jsx";
import { MuscleMap } from "./MuscleMap.jsx";
import { ExerciseModal } from "./ExerciseGuideModal.jsx";
import RestTimerSheet from "./RestTimerSheet.jsx";
import EXERCISE_INFO from "../data/exerciseInfo.json";
import {
  FONT, BODY, SURFACE, SURFACE_ELEVATED, SURFACE_INTERACTIVE, CARD_BORDER,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY,
  ACCENT, ACCENT_SOFT, ACCENT_INK, RADIUS_SM, RADIUS_MD, RADIUS_LG, RADIUS_XL,
  SPACE, TOUCH_MIN, TOUCH_PRIMARY,
} from "../tokens.js";
import { newWorkoutId, newSetId, putWorkout, getAllWorkouts, getActiveWorkout } from "../db/workoutDB.js";
import {
  estimatedOneRepMax, workoutVolume, workoutSetCount, workoutDurationSec,
  detectPRs, exerciseHistory, previousSessionSets, suggestNextWeight, bestBeforeByExercise,
} from "./workoutStats.js";
import ExerciseOptionsMenu from "./ExerciseOptionsMenu.jsx";
import PRToast from "./PRToast.jsx";

const mmss = (t) => Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
const imgLink = (q) => "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(q);

function topOfRange(r) {
  const n = parseInt(String(r).split("-").pop(), 10);
  return Number.isFinite(n) ? n : 10;
}

// One completed-or-upcoming set within an exercise card. Completed sets stay
// inline-editable (weight/reps/RPE are plain state, not locked) — only the
// checkmark distinguishes "logged" from "not yet".
function SetRow({ set, index, isNext, slot, color, onChange, onToggleComplete, onRemove, rpeEnabled }) {
  const done = !!set.completedAt;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isNext ? SPACE.md : SPACE.xs,
      background: isNext ? SURFACE_ELEVATED : "transparent",
      border: isNext ? "1px solid " + ACCENT_SOFT : "1px solid transparent",
      borderRadius: RADIUS_MD, padding: isNext ? SPACE.md : (SPACE.xs + "px " + SPACE.sm + "px"),
      marginBottom: SPACE.xs }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
        <div style={{ ...FONT, fontSize: set.type === "warmup" || set.type === "drop" ? 9.5 : 12, fontWeight: 700,
          color: done ? ACCENT : TEXT_TERTIARY, width: 18, textAlign: "center", flexShrink: 0 }}>
          {set.type === "warmup" ? "W" : set.type === "drop" ? "D" : index + 1}
        </div>

        {isNext ? (
          <div style={{ flex: 1 }}>
            <WSlider value={set.weight || slot.min} min={slot.min} max={slot.max} step={slot.step}
              onChange={(w) => onChange({ ...set, weight: w })} color={ACCENT} />
          </div>
        ) : (
          <>
            <div style={{ flex: 1, ...FONT, fontSize: 14, fontWeight: 600,
              color: done ? TEXT_SECONDARY : TEXT_PRIMARY }}>
              {set.weight || 0} kg
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <button onClick={() => onChange({ ...set, reps: Math.max(0, (set.reps || 0) - 1) })}
                aria-label="Fewer reps"
                style={{ width: TOUCH_MIN - 8, height: TOUCH_MIN - 8, borderRadius: RADIUS_SM, cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: TEXT_SECONDARY,
                  fontSize: 16, fontWeight: 700, lineHeight: 1 }}>−</button>
              <div style={{ ...FONT, minWidth: 30, textAlign: "center", fontSize: 16, fontWeight: 700,
                color: TEXT_PRIMARY, fontVariantNumeric: "tabular-nums" }}>{set.reps || 0}</div>
              <button onClick={() => onChange({ ...set, reps: (set.reps || 0) + 1 })}
                aria-label="More reps"
                style={{ width: TOUCH_MIN - 8, height: TOUCH_MIN - 8, borderRadius: RADIUS_SM, cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: TEXT_SECONDARY,
                  fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</button>
            </div>
          </>
        )}

        <button onClick={onToggleComplete} aria-label={done ? "Mark set incomplete" : "Complete set"}
          style={{ width: TOUCH_MIN - 4, height: TOUCH_MIN - 4, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
            border: "2px solid " + (done ? ACCENT : "rgba(255,255,255,0.16)"),
            background: done ? ACCENT : "transparent",
            color: done ? ACCENT_INK : TEXT_TERTIARY,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Check size={16} strokeWidth={3} />
        </button>
      </div>

      {isNext && (
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => onChange({ ...set, reps: Math.max(0, (set.reps || 0) - 1) })}
              aria-label="Fewer reps"
              style={{ width: TOUCH_MIN, height: TOUCH_MIN - 4, borderRadius: RADIUS_SM, cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.1)", background: SURFACE_INTERACTIVE, color: TEXT_SECONDARY,
                fontSize: 18, fontWeight: 700 }}>−</button>
            <div style={{ ...FONT, minWidth: 46, textAlign: "center", fontSize: 20, fontWeight: 800,
              color: TEXT_PRIMARY, fontVariantNumeric: "tabular-nums" }}>{set.reps || 0}<span
              style={{ fontSize: 10, color: TEXT_TERTIARY, fontWeight: 600, marginLeft: 3 }}>reps</span></div>
            <button onClick={() => onChange({ ...set, reps: (set.reps || 0) + 1 })}
              aria-label="More reps"
              style={{ width: TOUCH_MIN, height: TOUCH_MIN - 4, borderRadius: RADIUS_SM, cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.1)", background: SURFACE_INTERACTIVE, color: TEXT_SECONDARY,
                fontSize: 18, fontWeight: 700 }}>+</button>
          </div>
          {rpeEnabled && (
            <div style={{ display: "flex", gap: 3, flex: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
              {[6, 7, 8, 9, 10].map((r) => (
                <button key={r} onClick={() => onChange({ ...set, rpe: set.rpe === r ? null : r })}
                  style={{ ...FONT, width: 26, height: 26, borderRadius: "50%", cursor: "pointer", fontSize: 11,
                    fontWeight: 700, border: "1px solid " + (set.rpe === r ? ACCENT : "rgba(255,255,255,0.1)"),
                    background: set.rpe === r ? ACCENT_SOFT : "transparent",
                    color: set.rpe === r ? ACCENT : TEXT_TERTIARY }}>{r}</button>
              ))}
            </div>
          )}
        </div>
      )}
      {done && set.rpe && (
        <div style={{ fontSize: 10.5, color: TEXT_TERTIARY, paddingLeft: 26 }}>RPE {set.rpe}</div>
      )}
    </div>
  );
}

function ExerciseCard({ slot, exIndex, isDeload, exercise, onUpdateExercise, color, onOpenExercise,
                        previousSets, onCompleteSet, onOpenOptions, rpeEnabled }) {
  const [variant, setVariant] = useState(() => {
    const idx = slot.vars.findIndex((v) => v.n === (exercise && exercise.exerciseName));
    return idx >= 0 ? idx : 0;
  });
  const v = slot.vars[variant] || slot.vars[0];
  const nVars = slot.vars.length;
  const targetSets = isDeload ? 2 : slot.s;
  const sets = (exercise && exercise.sets) || [];
  const hasGuide = !!EXERCISE_INFO[v.n];

  const nextIndex = sets.findIndex((s) => !s.completedAt);
  // The full set-by-set breakdown from last time this exercise was trained —
  // not just the last number logged — so a lifter can compare set-for-set
  // while training, per the plan's "instant previous-vs-current" principle.
  const lastSet = previousSets.length ? previousSets[previousSets.length - 1] : null;
  const nudge = !isDeload ? suggestNextWeight(slot, previousSets) : null;

  const fillTo = (base) => {
    const defaultReps = lastSet ? lastSet.reps : topOfRange(slot.r);
    const defaultWeight = lastSet ? lastSet.weight : slot.min;
    const filled = base.slice();
    while (filled.length < targetSets) {
      filled.push({ id: newSetId(), type: "working", weight: defaultWeight, reps: defaultReps, rpe: null, completedAt: null });
    }
    return filled;
  };

  // Bumps every not-yet-completed set to the suggested weight — already-logged
  // sets are left untouched, matching how the old tick-based cards' nudge
  // worked (it only ever adjusted the weight dial, never rewrote history).
  const applyNudge = () => {
    if (!nudge) return;
    const copy = sets.map((s) => (s.completedAt ? s : { ...s, weight: nudge }));
    onUpdateExercise({ ...exercise, sets: copy });
  };

  // Creates the exercise on first render, fills sets up to the target count as
  // the week/deload status changes, and — if the user swipes to a different
  // variation before logging anything — retargets the exercise name and
  // starts its sets fresh. Once a set is completed under a name, switching
  // variation stops touching it (already-logged history shouldn't shift).
  useEffect(() => {
    if (!exercise) {
      onUpdateExercise({ exerciseName: v.n, variationId: variant, sets: fillTo([]), note: "" });
      return;
    }
    if (exercise.exerciseName !== v.n) {
      const anyCompleted = sets.some((s) => s.completedAt);
      if (!anyCompleted) {
        onUpdateExercise({ ...exercise, exerciseName: v.n, variationId: variant, sets: fillTo([]) });
      }
      return;
    }
    if (sets.length < targetSets) {
      onUpdateExercise({ ...exercise, sets: fillTo(sets) });
    }
  }, [v.n, targetSets]);

  const updateSet = (idx, next) => {
    const copy = sets.slice();
    copy[idx] = next;
    onUpdateExercise({ ...exercise, sets: copy });
  };

  const toggleComplete = (idx) => {
    const s = sets[idx];
    const wasComplete = !!s.completedAt;
    const next = { ...s, completedAt: wasComplete ? null : Date.now() };
    updateSet(idx, next);
    if (!wasComplete) onCompleteSet(v.n, next.weight, next.reps);
  };

  const addExtraSet = () => {
    const last = sets[sets.length - 1];
    const copy = sets.concat([{ id: newSetId(), type: "working",
      weight: last ? last.weight : slot.min, reps: last ? last.reps : topOfRange(slot.r), rpe: null, completedAt: null }]);
    onUpdateExercise({ ...exercise, sets: copy });
  };

  const go = (dir) => setVariant((variant + dir + nVars) % nVars);
  const doneCount = sets.filter((s) => s.completedAt).length;

  return (
    <div style={{ background: SURFACE, border: CARD_BORDER, borderRadius: RADIUS_LG, padding: SPACE.md, marginBottom: SPACE.md }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
        {nVars > 1 && (
          <button onClick={() => go(-1)} aria-label="Previous variation"
            style={{ width: 28, height: 28, borderRadius: RADIUS_SM, background: SURFACE_INTERACTIVE,
              border: "none", color: TEXT_SECONDARY, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0 }}><ChevronLeft size={15} /></button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...FONT, fontSize: 15.5, fontWeight: 700, color: TEXT_PRIMARY,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.n}</div>
          <div style={{ fontSize: 11.5, color: TEXT_TERTIARY, marginTop: 2 }}>
            {doneCount}/{targetSets} sets{isDeload ? " · deload 60%" : ""} · target {slot.r} reps
          </div>
        </div>
        {nVars > 1 && (
          <button onClick={() => go(1)} aria-label="Next variation"
            style={{ width: 28, height: 28, borderRadius: RADIUS_SM, background: SURFACE_INTERACTIVE,
              border: "none", color: TEXT_SECONDARY, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0 }}><ChevronRight size={15} /></button>
        )}
        {hasGuide ? (
          <button onClick={() => onOpenExercise(v.n, color)} aria-label="Exercise guide"
            style={{ width: 28, height: 28, borderRadius: RADIUS_SM, background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)", color, display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><Info size={14} /></button>
        ) : (
          <a href={imgLink(v.n + " exercise proper form")} target="_blank" rel="noreferrer" aria-label="Search for form guide"
            style={{ width: 28, height: 28, borderRadius: RADIUS_SM, background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)", color: TEXT_TERTIARY, display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0 }}><ExternalLink size={13} /></a>
        )}
        <button onClick={onOpenOptions} aria-label="Exercise options"
          style={{ width: 28, height: 28, borderRadius: RADIUS_SM, background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)", color: TEXT_TERTIARY, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><MoreVertical size={14} /></button>
      </div>

      {exercise && exercise.note && (
        <div style={{ fontSize: 11.5, color: TEXT_SECONDARY, marginTop: SPACE.sm, fontStyle: "italic",
          background: SURFACE_INTERACTIVE, borderRadius: RADIUS_SM, padding: "6px 8px" }}>
          {exercise.note}
        </div>
      )}

      {previousSets.length > 0 && (
        <div style={{ fontSize: 11.5, color: TEXT_TERTIARY, marginTop: SPACE.sm }}>
          Last time: {previousSets.map((s, i) => (
            <span key={i}>{i > 0 ? " · " : ""}{s.weight}×{s.reps}</span>
          ))}
          {previousSets.length > 1 && (" · e1RM " + Math.round(Math.max(...previousSets.map((s) => estimatedOneRepMax(s.weight, s.reps)))) + " kg")}
        </div>
      )}
      {nudge && (
        <button onClick={applyNudge}
          style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, padding: 0,
            background: "transparent", border: "none", cursor: "pointer",
            fontSize: 11.5, fontWeight: 600, color: ACCENT }}>
          <TrendingUp size={12} /> Hit target every set last time — try {nudge} kg
        </button>
      )}

      <div style={{ marginTop: SPACE.sm }}>
        {sets.map((s, i) => (
          <SetRow key={s.id} set={s} index={i} isNext={i === nextIndex} slot={slot} color={color}
            onChange={(next) => updateSet(i, next)} onToggleComplete={() => toggleComplete(i)} rpeEnabled={rpeEnabled} />
        ))}
      </div>

      {doneCount === targetSets && (
        <button onClick={addExtraSet}
          style={{ ...FONT, display: "flex", alignItems: "center", gap: 5, marginTop: SPACE.xs,
            background: "transparent", border: "none", color: TEXT_TERTIARY, fontSize: 12, fontWeight: 600,
            padding: "4px 2px", cursor: "pointer" }}>
          <Plus size={13} /> Add extra set
        </button>
      )}
    </div>
  );
}

// Post-completion summary — PRs, volume, duration, sets, one "Done" exit.
function SummaryScreen({ workout, allWorkouts, onDone }) {
  const prs = useMemo(() => detectPRs(workout, allWorkouts), [workout, allWorkouts]);
  const volume = workoutVolume(workout);
  const sets = workoutSetCount(workout);
  const dur = workoutDurationSec(workout);
  return (
    <div style={{ padding: SPACE.lg }}>
      <div style={{ textAlign: "center", marginTop: SPACE.xxl }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: ACCENT_SOFT, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Check size={30} color={ACCENT} strokeWidth={3} />
        </div>
        <div style={{ ...FONT, fontSize: 22, fontWeight: 800, color: TEXT_PRIMARY, marginTop: SPACE.md }}>Workout complete</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: SPACE.sm, marginTop: SPACE.xl }}>
        {[["Duration", Math.round(dur / 60) + " min"], ["Sets", String(sets)], ["Volume", Math.round(volume) + " kg"]].map(([l, val]) => (
          <div key={l} style={{ background: SURFACE, border: CARD_BORDER, borderRadius: RADIUS_MD, padding: SPACE.md, textAlign: "center" }}>
            <div style={{ ...FONT, fontSize: 18, fontWeight: 800, color: TEXT_PRIMARY }}>{val}</div>
            <div style={{ fontSize: 10, letterSpacing: 1.2, color: TEXT_TERTIARY, textTransform: "uppercase", marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      {prs.length > 0 && (
        <div style={{ marginTop: SPACE.xl }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, ...FONT, fontSize: 14, fontWeight: 700, color: ACCENT, marginBottom: SPACE.sm }}>
            <Trophy size={15} /> New personal records
          </div>
          {prs.map((pr) => (
            <div key={pr.exerciseName} style={{ background: ACCENT_SOFT, border: "1px solid " + ACCENT, borderRadius: RADIUS_MD,
              padding: "10px 12px", marginBottom: SPACE.xs, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: TEXT_PRIMARY }}>{pr.exerciseName}</div>
              <div style={{ ...FONT, fontSize: 13.5, fontWeight: 700, color: ACCENT }}>{pr.weight} kg × {pr.reps}</div>
            </div>
          ))}
        </div>
      )}

      <button onClick={onDone}
        style={{ ...FONT, width: "100%", marginTop: SPACE.xxl, padding: "16px 0", borderRadius: RADIUS_LG,
          border: "none", background: ACCENT, color: ACCENT_INK, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
        Done
      </button>
    </div>
  );
}

export default function WorkoutEngine({
  week, setWeek,
  rest, setRest, restLeft, setRestLeft, running, setRunning,
  elapsed, setElapsed, keepAwake, setKeepAwake, wakeState,
  notifPerm, onPresetTap, onRestCancel, exactAlarm, onFixExactAlarm,
  onCompleteSetRest, // (seconds, label) => void — arms notification + starts wall-clock rest
  rpeEnabled, onActiveChange, // rpeEnabled: bool, default-off RPE picker; onActiveChange: (bool)=>void, lets App.jsx de-emphasize its nav while a workout is in progress
}) {
  const [allWorkouts, setAllWorkouts] = useState([]);
  const [active, setActive] = useState(null); // in-progress workout record, or null
  const [resumePrompt, setResumePrompt] = useState(null); // found-on-load record awaiting confirm
  const [sessionId, setSessionId] = useState(SESSIONS[0].id);
  const [exerciseModal, setExerciseModal] = useState(null);
  const [summary, setSummary] = useState(null); // completed workout to show the recap for
  const [loaded, setLoaded] = useState(false);
  const [optionsFor, setOptionsFor] = useState(null); // slot index whose "..." menu is open, or null
  const [prToast, setPrToast] = useState(null); // { exerciseName, weight, reps } | null — instant PR celebration

  const session = SESSIONS.find((s) => s.id === sessionId) || SESSIONS[0];
  const isDeload = DELOAD_WEEKS.includes(week);

  useEffect(() => {
    if (onActiveChange) onActiveChange(!!active);
  }, [active]);

  useEffect(() => {
    (async () => {
      const [all, activeFound] = await Promise.all([getAllWorkouts(), getActiveWorkout()]);
      setAllWorkouts(all || []);
      if (activeFound) setResumePrompt(activeFound);
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback((workout) => {
    setActive(workout);
    putWorkout(workout);
  }, []);

  const startWorkout = () => {
    const w = {
      id: newWorkoutId(), programWeek: week, sessionType: session.id, sessionName: session.name,
      startedAt: Date.now(), completedAt: null, duration: 0, exercises: [], note: "",
    };
    persist(w);
    setElapsed(0);
    setRunning(true);
  };

  const resumeWorkout = () => {
    setSessionId(resumePrompt.sessionType);
    if (resumePrompt.programWeek) setWeek(resumePrompt.programWeek);
    setActive(resumePrompt);
    setElapsed(Math.round((Date.now() - resumePrompt.startedAt) / 1000));
    setRunning(true);
    setResumePrompt(null);
  };

  const discardActive = () => {
    if (resumePrompt) putWorkout({ ...resumePrompt, completedAt: Date.now(), discarded: true });
    setResumePrompt(null);
  };

  // Every exercise card mounts at once and each writes its own initial set list
  // on the same render pass, so this must fold onto the latest state via the
  // functional updater — computing off the `active` closure directly would let
  // each card's write stomp the others' (only the last one in the batch would
  // stick, since every closure captured the same pre-workout `active.exercises`).
  const updateExercise = (exIndex, exercise) => {
    setActive((prev) => {
      if (!prev) return prev;
      const exercises = prev.exercises.slice();
      exercises[exIndex] = exercise;
      const next = { ...prev, exercises };
      putWorkout(next);
      return next;
    });
  };

  const finishWorkout = () => {
    if (!active) return;
    const completed = { ...active, completedAt: Date.now() };
    persist(completed);
    setRunning(false);
    setAllWorkouts((prev) => prev.filter((w) => w.id !== completed.id).concat([completed]));
    setSummary(completed);
  };

  const closeSummary = () => {
    setSummary(null);
    setActive(null);
    setElapsed(0);
    setRestLeft(0);
  };

  const previousSetsFor = (exerciseName) =>
    active ? previousSessionSets(allWorkouts, exerciseName, active.startedAt) : [];

  // Fires the instant "New PR!" toast the moment a set beats the best this
  // exercise has ever hit before this session started — separate from (and
  // in addition to) the authoritative per-exercise best-set comparison
  // detectPRs() does once at the end, in SummaryScreen.
  const checkForPR = (exerciseName, weight, reps) => {
    if (!weight || !reps || !active) return;
    const before = bestBeforeByExercise(allWorkouts, active.startedAt);
    const prior = before.get(exerciseName);
    const e1rm = estimatedOneRepMax(weight, reps);
    if (!prior || e1rm > prior.bestE1RM) setPrToast({ exerciseName, weight, reps });
  };

  const addWarmupSet = (exIndex) => {
    const exercise = active.exercises[exIndex];
    if (!exercise) return;
    const first = exercise.sets[0];
    const warmup = { id: newSetId(), type: "warmup",
      weight: first ? Math.round((first.weight * 0.5) / 2.5) * 2.5 : 0,
      reps: first ? first.reps : 0, rpe: null, completedAt: null };
    updateExercise(exIndex, { ...exercise, sets: [warmup, ...exercise.sets] });
  };

  const addDropSet = (exIndex) => {
    const exercise = active.exercises[exIndex];
    if (!exercise) return;
    const last = exercise.sets[exercise.sets.length - 1];
    const drop = { id: newSetId(), type: "drop",
      weight: last ? Math.round((last.weight * 0.8) / 2.5) * 2.5 : 0,
      reps: last ? last.reps : 0, rpe: null, completedAt: null };
    updateExercise(exIndex, { ...exercise, sets: [...exercise.sets, drop] });
  };

  const saveNote = (exIndex, text) => {
    const exercise = active.exercises[exIndex];
    if (!exercise) return;
    updateExercise(exIndex, { ...exercise, note: text });
  };

  // A slot's exercise can't be spliced out of the array (that would shift
  // every other card's index-based identity) — mark it skipped instead and
  // hide it from the active view; any sets already completed stay in the
  // record and still count toward history/stats.
  const removeExercise = (exIndex) => {
    const exercise = active.exercises[exIndex];
    if (!exercise) return;
    updateExercise(exIndex, { ...exercise, skipped: true,
      sets: exercise.sets.filter((s) => s.completedAt) });
  };

  if (!loaded) {
    return <div style={{ padding: SPACE.xxl, textAlign: "center", color: TEXT_TERTIARY, fontSize: 13 }}>Loading…</div>;
  }

  if (summary) {
    return <SummaryScreen workout={summary} allWorkouts={allWorkouts} onDone={closeSummary} />;
  }

  if (resumePrompt) {
    const resumeSession = SESSIONS.find((s) => s.id === resumePrompt.sessionType) || SESSIONS[0];
    const resumeIsDeload = DELOAD_WEEKS.includes(resumePrompt.programWeek || 1);
    const resumeTotalSets = resumeSession.slots.reduce((a, s, i) => {
      const ex = (resumePrompt.exercises || [])[i];
      return a + (ex && ex.skipped ? 0 : (resumeIsDeload ? 2 : s.s));
    }, 0);
    const resumeDoneSets = workoutSetCount(resumePrompt);
    return (
      <div style={{ padding: SPACE.lg }}>
        <div style={{ background: SURFACE, border: "1px solid " + resumeSession.color, borderRadius: RADIUS_LG,
          padding: SPACE.lg, marginTop: SPACE.xl }}>
          <div style={{ ...FONT, fontSize: 17, fontWeight: 800, color: TEXT_PRIMARY }}>Resume workout?</div>
          <div style={{ fontSize: 13, color: TEXT_SECONDARY, marginTop: SPACE.xs, lineHeight: 1.5 }}>
            You have an unfinished <b style={{ color: resumeSession.color }}>{resumeSession.name}</b> session
            from {new Date(resumePrompt.startedAt).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })} —{" "}
            <b style={{ color: TEXT_PRIMARY }}>{resumeDoneSets}/{resumeTotalSets} sets</b> completed.
          </div>
          <div style={{ display: "flex", gap: SPACE.sm, marginTop: SPACE.lg }}>
            <button onClick={resumeWorkout}
              style={{ ...FONT, flex: 1, padding: "13px 0", borderRadius: RADIUS_MD, border: "none",
                background: ACCENT, color: ACCENT_INK, fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>Resume</button>
            <button onClick={discardActive}
              style={{ ...FONT, flex: 1, padding: "13px 0", borderRadius: RADIUS_MD,
                border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: TEXT_SECONDARY,
                fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}>Discard</button>
          </div>
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <div style={{ padding: SPACE.lg }}>
        <div style={{ ...FONT, fontSize: 20, fontWeight: 800, color: TEXT_PRIMARY, marginBottom: SPACE.md }}>Start a workout</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: SPACE.lg }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
            const dl = DELOAD_WEEKS.includes(w);
            return (
              <button key={w} onClick={() => setWeek(w)}
                style={{ ...FONT, minWidth: 38, padding: "6px 0", borderRadius: RADIUS_SM, cursor: "pointer",
                  border: dl ? "1px dashed " + TEXT_TERTIARY : CARD_BORDER,
                  background: week === w ? TEXT_PRIMARY : SURFACE,
                  color: week === w ? ACCENT_INK : TEXT_SECONDARY, fontSize: 12.5, fontWeight: 600 }}>W{w}</button>
            );
          })}
        </div>
        {SESSIONS.map((s) => (
          <button key={s.id} onClick={() => setSessionId(s.id)}
            style={{ ...FONT, display: "block", width: "100%", textAlign: "left", padding: SPACE.md,
              borderRadius: RADIUS_MD, marginBottom: SPACE.sm, cursor: "pointer",
              border: "1px solid " + (sessionId === s.id ? s.color : "rgba(255,255,255,0.08)"),
              background: sessionId === s.id ? "rgba(255,255,255,0.04)" : SURFACE }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: s.color }}>{s.name}</div>
            <div style={{ fontSize: 12, color: TEXT_TERTIARY, marginTop: 2 }}>{s.sub}</div>
          </button>
        ))}
        <button onClick={startWorkout}
          style={{ ...FONT, width: "100%", marginTop: SPACE.md, padding: "16px 0", borderRadius: RADIUS_LG,
            border: "none", background: ACCENT, color: ACCENT_INK, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
          Start {session.name}
        </button>
      </div>
    );
  }

  const totalSets = session.slots.reduce((a, s, i) =>
    a + ((active.exercises[i] && active.exercises[i].skipped) ? 0 : (isDeload ? 2 : s.s)), 0);
  const doneSets = (active.exercises || []).reduce((a, ex) => a + (ex.sets || []).filter((s) => s.completedAt).length, 0);
  const optionsExercise = optionsFor != null ? active.exercises[optionsFor] : null;

  return (
    <div style={{ padding: SPACE.lg, paddingBottom: 140 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: SPACE.md, gap: SPACE.sm }}>
        <div>
          <div style={{ ...FONT, fontSize: 20, fontWeight: 800, color: session.color }}>{session.name}</div>
          <div style={{ fontSize: 12, color: TEXT_TERTIARY, marginTop: 2 }}>
            {doneSets}/{totalSets} sets · {mmss(elapsed)}{isDeload ? " · deload week" : ""}
          </div>
        </div>
        <MuscleMap highlight={session.muscles} color={session.color} />
      </div>

      {session.slots.map((slot, i) => (
        (active.exercises[i] && active.exercises[i].skipped) ? null : (
          <ExerciseCard key={sessionId + i} slot={slot} exIndex={i} isDeload={isDeload}
            exercise={active.exercises[i]}
            onUpdateExercise={(ex) => updateExercise(i, ex)}
            color={session.color} onOpenExercise={(name, c) => setExerciseModal({ name, color: c })}
            previousSets={previousSetsFor(slot.vars[(active.exercises[i] && active.exercises[i].variationId) || 0].n)}
            onCompleteSet={(exerciseName, weight, reps) => {
              onCompleteSetRest(rest, exerciseName);
              checkForPR(exerciseName, weight, reps);
            }}
            onOpenOptions={() => setOptionsFor(i)} rpeEnabled={rpeEnabled} />
        )
      ))}

      <button onClick={finishWorkout}
        style={{ ...FONT, width: "100%", marginTop: SPACE.lg, padding: "16px 0", borderRadius: RADIUS_LG,
          border: "none", background: ACCENT, color: ACCENT_INK, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
        Finish workout
      </button>

      <RestTimerSheet color={ACCENT} rest={rest} setRest={setRest} restLeft={restLeft} setRestLeft={setRestLeft}
        running={running} setRunning={setRunning} elapsed={elapsed} setElapsed={setElapsed}
        keepAwake={keepAwake} setKeepAwake={setKeepAwake} wakeState={wakeState}
        notifPerm={notifPerm} onPresetTap={onPresetTap} onRestCancel={onRestCancel}
        exactAlarm={exactAlarm} onFixExactAlarm={onFixExactAlarm}
        onStartRest={(seconds) => onCompleteSetRest(seconds, "Next set")} />

      {exerciseModal && (
        <ExerciseModal name={exerciseModal.name} color={exerciseModal.color} onClose={() => setExerciseModal(null)} />
      )}

      {optionsExercise && (
        <ExerciseOptionsMenu exerciseName={optionsExercise.exerciseName} color={session.color}
          note={optionsExercise.note || ""}
          onAddWarmup={() => addWarmupSet(optionsFor)}
          onAddDrop={() => addDropSet(optionsFor)}
          onSaveNote={(text) => saveNote(optionsFor, text)}
          onRemove={() => removeExercise(optionsFor)}
          onClose={() => setOptionsFor(null)} />
      )}

      <PRToast pr={prToast} onDismiss={() => setPrToast(null)} />
    </div>
  );
}
