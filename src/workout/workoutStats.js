// Pure functions over raw workout records (see db/workoutDB.js for the shape).
// Nothing here touches storage — volume, PRs, and 1RM are always computed from
// raw sets, never cached, per the "derive, don't duplicate" rule this app's
// design plan calls for.

export function estimatedOneRepMax(weight, reps) {
  if (!weight || !reps) return 0;
  // Epley formula — the standard estimate, accurate up to ~10 reps and still a
  // reasonable proxy beyond that for tracking trend direction.
  return weight * (1 + reps / 30);
}

// Only sets the user actually checked off count toward volume/history/PRs —
// every set starts pre-filled with a default weight/reps the moment its
// exercise card mounts (so the active-set UI has something to show), so an
// uncompleted set still has non-zero weight/reps and must be excluded here or
// it would silently count as work that was never done.
export function workoutVolume(workout) {
  let v = 0;
  for (const ex of workout.exercises || []) {
    for (const s of ex.sets || []) {
      if (s.completedAt && s.weight && s.reps) v += s.weight * s.reps;
    }
  }
  return v;
}

export function workoutSetCount(workout) {
  return (workout.exercises || []).reduce(
    (a, ex) => a + (ex.sets || []).filter((s) => s.completedAt).length, 0);
}

export function workoutDurationSec(workout) {
  if (!workout.startedAt) return 0;
  const end = workout.completedAt || Date.now();
  return Math.max(0, Math.round((end - workout.startedAt) / 1000));
}

// Best set (by estimated 1RM) ever logged for each exercise name, using only
// workouts that completed strictly before `beforeTime` — the record a session
// starting at `beforeTime` needs to beat for a PR.
export function bestBeforeByExercise(workouts, beforeTime) {
  const best = new Map();
  const prior = workouts
    .filter((w) => w.completedAt && w.completedAt < beforeTime)
    .sort((a, b) => a.completedAt - b.completedAt);
  for (const w of prior) {
    for (const ex of w.exercises || []) {
      for (const s of ex.sets || []) {
        if (!s.completedAt || !s.weight || !s.reps) continue;
        const e1rm = estimatedOneRepMax(s.weight, s.reps);
        const cur = best.get(ex.exerciseName);
        if (!cur || e1rm > cur.bestE1RM) {
          best.set(ex.exerciseName, { bestWeight: s.weight, bestReps: s.reps, bestE1RM: e1rm });
        }
      }
    }
  }
  return best;
}

// PR sets within one workout (usually the just-completed one), compared
// against everything strictly before it — one entry per exercise that hit a
// new best, using each exercise's single best set in the session.
export function detectPRs(workout, allWorkouts) {
  const before = bestBeforeByExercise(allWorkouts, workout.startedAt);
  const prs = [];
  for (const ex of workout.exercises || []) {
    let bestInSession = null;
    for (const s of ex.sets || []) {
      if (!s.completedAt || !s.weight || !s.reps) continue;
      const e1rm = estimatedOneRepMax(s.weight, s.reps);
      if (!bestInSession || e1rm > bestInSession.e1rm) bestInSession = { weight: s.weight, reps: s.reps, e1rm };
    }
    if (!bestInSession) continue;
    const prior = before.get(ex.exerciseName);
    if (!prior || bestInSession.e1rm > prior.bestE1RM) {
      prs.push({ exerciseName: ex.exerciseName, weight: bestInSession.weight, reps: bestInSession.reps, previous: prior || null });
    }
  }
  return prs;
}

// The full set-by-set breakdown from the most recent PRIOR session that
// included this exercise (strictly before `beforeTime`) — e.g. "30x10 30x9
// 32x7" rather than just a single best/last number, so a lifter can compare
// this session set-for-set against last time while training.
export function previousSessionSets(workouts, exerciseName, beforeTime) {
  const prior = workouts
    .filter((w) => w.completedAt && w.completedAt < beforeTime)
    .sort((a, b) => b.completedAt - a.completedAt);
  for (const w of prior) {
    for (const ex of w.exercises || []) {
      if (ex.exerciseName !== exerciseName) continue;
      const sets = (ex.sets || []).filter((s) => s.completedAt && s.weight && s.reps);
      if (sets.length) return sets.map((s) => ({ weight: s.weight, reps: s.reps, rpe: s.rpe || null }));
    }
  }
  return [];
}

// All logged sets for one exercise name across every workout, oldest first —
// the raw series exercise-history charts/lists are built from.
export function exerciseHistory(workouts, exerciseName) {
  const rows = [];
  for (const w of workouts) {
    if (!w.completedAt) continue;
    for (const ex of w.exercises || []) {
      if (ex.exerciseName !== exerciseName) continue;
      for (const s of ex.sets || []) {
        if (!s.completedAt || !s.weight || !s.reps) continue;
        rows.push({ date: w.completedAt, weight: s.weight, reps: s.reps, e1rm: estimatedOneRepMax(s.weight, s.reps) });
      }
    }
  }
  return rows.sort((a, b) => a.date - b.date);
}

// Double-progression suggestion using REAL logged reps (see also
// src/progression.js, the older doneCount-only heuristic the tick-based
// exercise cards still use) — hit the top of the slot's rep range on every
// set last session -> bump by the smallest increment next time.
export function suggestNextWeight(slot, lastSessionSets) {
  if (!lastSessionSets || lastSessionSets.length === 0) return null;
  const topOfRange = parseInt(String(slot.r).split("-").pop(), 10);
  if (!Number.isFinite(topOfRange)) return null;
  const allAtTop = lastSessionSets.every((s) => s.reps >= topOfRange);
  if (!allAtTop) return null;
  const weight = lastSessionSets[lastSessionSets.length - 1].weight;
  if (!weight || weight >= slot.max) return null;
  const next = Math.min(slot.max, Math.round((weight + slot.step) / slot.step) * slot.step);
  return next > weight ? next : null;
}

export function monthKey(ts) {
  const d = new Date(ts);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

export function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString([], { month: "long", year: "numeric" });
}

// Consecutive-day-bucket streak counting backward from today, where a
// "trained" bucket is any calendar day with at least one completed workout.
export function currentStreak(workouts) {
  const days = new Set(
    workouts.filter((w) => w.completedAt).map((w) => new Date(w.completedAt).toDateString())
  );
  let streak = 0;
  const cursor = new Date();
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
