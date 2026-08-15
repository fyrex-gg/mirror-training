// Minimal promise-based IndexedDB wrapper for real workout history — separate
// from the existing localStorage program-state-v3 (week/session/weights/done),
// which stays untouched as the historical record of the old tick-based tracking.
//
// One denormalized "workouts" object store, not the workouts/sets/exerciseHistory/
// personalRecords split some workout-history plans suggest — PRs, volume, and 1RM
// are always derived from raw sets at read time (see workoutStats.js), never
// stored redundantly, so there's nothing to keep in sync across stores. At this
// app's scale (one person, a handful of workouts a week) a full table scan for
// stats is effectively instant.
//
// A workout record:
// { id, programWeek, sessionId, sessionName, startedAt, completedAt (null = in
//   progress), exercises: [{ exerciseName, slotIndex, note, sets: [{ id, weight,
//   reps, rpe, completedAt }] }], note }

const DB_NAME = "MirrorDB";
const DB_VERSION = 1;
const STORE = "workouts";

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB unavailable")); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("completedAt", "completedAt");
        store.createIndex("startedAt", "startedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function newWorkoutId() {
  return Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

export function newSetId() {
  return Math.random().toString(36).slice(2, 10);
}

// All calls below fail soft (resolve to [] / null) rather than throwing, so a
// storage hiccup never breaks the active workout screen — matches this app's
// existing localStorage resilience philosophy.

export async function putWorkout(workout) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(workout);
    await txDone(tx);
    return true;
  } catch (e) {
    return false;
  }
}

export async function getAllWorkouts() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readonly");
    const all = await reqToPromise(tx.objectStore(STORE).getAll());
    return all || [];
  } catch (e) {
    return [];
  }
}

export async function getWorkout(id) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readonly");
    return (await reqToPromise(tx.objectStore(STORE).get(id))) || null;
  } catch (e) {
    return null;
  }
}

export async function deleteWorkout(id) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await txDone(tx);
    return true;
  } catch (e) {
    return false;
  }
}

// The one workout with completedAt still null, if any — used to prompt
// "Resume workout?" on load instead of silently discarding an active session.
export async function getActiveWorkout() {
  const all = await getAllWorkouts();
  return all.find((w) => !w.completedAt) || null;
}
