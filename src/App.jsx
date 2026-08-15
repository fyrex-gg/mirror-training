import { useState, useEffect, useRef } from "react";
import { Home, Dumbbell, History as HistoryIcon, BarChart3, Menu, Utensils, Wind, BookOpen, Settings, Database, ChevronRight, ChevronLeft } from "lucide-react";
import { ensureNotificationPermission, currentPermissionState, armRestNotification, notifyRestDone, notifyRestTick, clearRestNotification, checkExactAlarmState, requestExactAlarm } from "./notify.js";
import { ExerciseModal } from "./workout/ExerciseGuideModal.jsx";
import HomeScreen from "./home/HomeScreen.jsx";
import WorkoutEngine from "./workout/WorkoutEngine.jsx";
import HistoryScreen from "./history/HistoryScreen.jsx";
import StatsScreen from "./stats/StatsScreen.jsx";
import OffDaysScreen from "./offdays/OffDaysScreen.jsx";
import FuelScreen from "./fuel/FuelScreen.jsx";

const RULES = [
  ["The split — 4 on, 3 off", "Day 1 Push A → Day 2 Pull A → rest → Day 3 Push B → Day 4 Pull B → rest → rest. Chest and back each get two sessions with different angles (see each session's sub-label) — research shows 2×/week beats 1×/week when volume is equal, but total weekly volume is what really drives growth, not frequency alone."],
  ["Legs — light on purpose", "Only 3 exercises, all on Day 4, kept to light-moderate loads with higher reps (15–20+). No heavy squats, deadlifts or heavy leg press — those need heavy load to work, which isn't the goal here. If you get blood-flow-restriction (BFR) cuffs, they let you build real strength at 20–30% of a heavy weight — ask your doctor first given your condition."],
  ["Pelvic floor training", "Do the daily Kegel routine below regardless of training day — it's the best-evidenced exercise for erection strength and staying power, better supported than hip thrusts or hip abduction for that specific goal."],
  ["Double progression", "Hit the top of the rep range on every set → add the smallest increment → drop back down. Micro-jumps only."],
  ["Deloads — weeks 4 · 8 · 12", "Same movements, 60% of working weight, 2 sets each. Suggested kg shows automatically on each card."],
  ["If a lift stalls", "Two weeks with zero progress → drop that lift 10% and rebuild over 2–3 weeks."],
  ["Aerobic target", "~160 min/week of moderate-vigorous cardio has the strongest exercise evidence for erectile function — the finishers below plus a couple of extra walks gets you there."],
];

const mmss = (t) => Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
const FONT = { fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif" };
const BODY = { fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" };
const CARD_BORDER = "1px solid rgba(255,255,255,0.055)";
const STORE_KEY = "program-state-v3";
const MEALDB_TERM = {
  "Chicken breast": "chicken_breast", "Eggs": "eggs", "Greek yogurt": "yogurt", "Whey": "milk",
  "Lean beef": "beef", "Salmon": "salmon", "Tuna": "tuna", "Cottage cheese": "cheese", "Tofu": "tofu",
  "Rice": "rice", "Oats": "oats", "Potatoes": "potatoes", "Pasta": "pasta", "Bread / wraps": "bread",
  "Beans": "beans", "Bananas": "banana", "Berries": "strawberries",
  "Olive oil": "olive_oil", "Nuts": "almonds", "Avocado": "avocado", "Peanut butter": "peanut_butter",
  "Broccoli": "broccoli", "Spinach": "spinach", "Peppers": "red_pepper", "Tomatoes": "tomatoes",
  "Cucumber": "cucumber", "Onions & garlic": "onion",
}; // set to your own proxy endpoint if you want AI meal ideas

function packState(s) {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(s)))); } catch (e) { return ""; }
}
function unpackState(code) {
  return JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
}

// ---------- App ----------
export default function Program() {
  const [loaded, setLoaded] = useState(false);
  const [week, setWeek] = useState(1);
  const [tab, setTab] = useState("home");
  const [moreView, setMoreView] = useState(null); // null = menu list; else "fuel" | "off" | "rules" | "settings" | "data"
  const [offDayLog, setOffDayLog] = useState({}); // { "YYYY-MM-DD": true } — off-day routine completion
  const [phase, setPhase] = useState("bulk");
  const [rpeEnabled, setRpeEnabled] = useState(false); // default off — opt-in per the plan
  const [workoutActive, setWorkoutActive] = useState(false); // de-emphasizes the bottom nav while a session is in progress
  const [foods, setFoods] = useState({});
  const [bought, setBought] = useState({});
  const [meals, setMeals] = useState([]);
  const [mealLoading, setMealLoading] = useState(false);
  const [mealErr, setMealErr] = useState(null);
  const [foodLog, setFoodLog] = useState([]);
  const [bodyWeight, setBodyWeight] = useState([]);

  const [storageOk, setStorageOk] = useState(null); // null=checking, true/false
  const [storageWhy, setStorageWhy] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  const [backupCode, setBackupCode] = useState("");
  const [pasteCode, setPasteCode] = useState("");
  const [restoreMsg, setRestoreMsg] = useState("");
  const [copyMsg, setCopyMsg] = useState("");

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [keepAwake, setKeepAwake] = useState(true);
  const [wakeState, setWakeState] = useState(false);
  const wakeRef = useRef(null);
  const silentRef = useRef(null);
  const [rest, setRest] = useState(90);
  const [restLeft, setRestLeft] = useState(0);
  const audioRef = useRef(null);
  const restLabelRef = useRef("");
  // Real wall-clock target for the current rest period. The countdown below
  // reads this every tick instead of naively decrementing by 1, so it
  // self-corrects for setInterval drift (delayed ticks, brief backgrounding)
  // and stays aligned with the native alarm scheduled against the same clock
  // — without this, the in-app beep and the OS notification could drift apart.
  const restEndRef = useRef(0);
  const [exerciseModal, setExerciseModal] = useState(null); // { name, color } | null
  const openExercise = (name, color) => setExerciseModal({ name, color });
  const [notifPerm, setNotifPerm] = useState("unsupported");
  useEffect(() => { currentPermissionState().then(setNotifPerm); }, []);
  const [exactAlarm, setExactAlarm] = useState("granted");
  useEffect(() => { checkExactAlarmState().then(setExactAlarm); }, []);
  const fixExactAlarm = async () => setExactAlarm(await requestExactAlarm());

  const fullState = () => ({ foods, bought, week, phase, meals, foodLog, bodyWeight, rpeEnabled, offDayLog });
  const applyState = (s) => {
    if (s.foods) setFoods(s.foods);
    if (s.bought) setBought(s.bought);
    if (s.week) setWeek(s.week);
    if (s.phase) setPhase(s.phase);
    if (s.meals) setMeals(s.meals);
    if (s.foodLog) setFoodLog(s.foodLog);
    if (s.bodyWeight) setBodyWeight(s.bodyWeight);
    if (typeof s.rpeEnabled === "boolean") setRpeEnabled(s.rpeEnabled);
    if (s.offDayLog) setOffDayLog(s.offDayLog);
  };

  // Load saved state from localStorage (works in any real browser / PWA / WebView).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) applyState(JSON.parse(raw));
      localStorage.setItem("__probe", "1");
      localStorage.removeItem("__probe");
      setStorageOk(true);
    } catch (e) {
      setStorageOk(false);
      setStorageWhy(e && e.message ? e.message : "localStorage unavailable (private browsing?)");
    }
    setLoaded(true);
  }, []);

  // Auto-save on every change.
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(fullState()));
        setStorageOk(true);
        setSavedAt(new Date());
      } catch (e) {
        setStorageOk(false);
        setStorageWhy(e && e.message ? e.message : "write failed");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [foods, bought, week, phase, meals, foodLog, bodyWeight, rpeEnabled, offDayLog, loaded]);

  // Keep the backup code fresh so it's always ready to copy.
  useEffect(() => { setBackupCode(packState(fullState())); },
    [foods, bought, week, phase, meals, foodLog, bodyWeight, rpeEnabled, offDayLog]);

  // Screen Wake Lock — stops the phone locking mid-set so the timer stays visible.
  useEffect(() => {
    let cancelled = false;
    async function acquire() {
      try {
        if (!("wakeLock" in navigator)) return;
        if (wakeRef.current) return;
        const wl = await navigator.wakeLock.request("screen");
        if (cancelled) { wl.release(); return; }
        wakeRef.current = wl;
        setWakeState(true);
        wl.addEventListener("release", () => { wakeRef.current = null; setWakeState(false); });
      } catch (e) { setWakeState(false); }
    }
    function release() {
      try { if (wakeRef.current) { wakeRef.current.release(); wakeRef.current = null; } } catch (e) {}
      setWakeState(false);
    }
    if (keepAwake && running) acquire(); else release();
    const onVis = () => { if (document.visibilityState === "visible" && keepAwake && running) acquire(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVis); };
  }, [keepAwake, running]);

  // Near-silent looping tone keeps the page alive if the screen does switch off,
  // so the end-of-rest beep still fires.
  useEffect(() => {
    if (!running) {
      if (silentRef.current) {
        try { silentRef.current.osc.stop(); } catch (e) {}
        silentRef.current = null;
      }
      return;
    }
    try {
      if (!audioRef.current) audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
      if (audioRef.current.state === "suspended") audioRef.current.resume();
      if (!silentRef.current) {
        const ctx = audioRef.current;
        const osc = ctx.createOscillator(), g = ctx.createGain();
        g.gain.value = 0.0001;
        osc.frequency.value = 30;
        osc.connect(g); g.connect(ctx.destination);
        osc.start();
        silentRef.current = { osc, g };
      }
    } catch (e) { /* audio blocked — wake lock still covers the normal case */ }
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setElapsed((e) => e + 1);
      setRestLeft((r) => {
        if (r <= 0) return 0;
        const next = restEndRef.current
          ? Math.max(0, Math.round((restEndRef.current - Date.now()) / 1000))
          : Math.max(0, r - 1);
        const label = restLabelRef.current || "Next set";
        if (next <= 0) {
          beep();
          notifyRestDone(label);
        } else if (next % 5 === 0) {
          // Refresh the tray notification's remaining-time text every 5s —
          // web notifications can't tick like a native chronometer, this is
          // the closest a periodic silent update can get.
          notifyRestTick(label + " · " + mmss(next) + " left");
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  function beep() {
    try {
      if (!audioRef.current) audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioRef.current;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.35, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      o.start(); o.stop(ctx.currentTime + 0.9);
      if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
    } catch (err) { /* visual countdown still works */ }
  }

  function copyBackup() {
    try {
      navigator.clipboard.writeText(backupCode);
      setCopyMsg("Copied ✓");
    } catch (e) { setCopyMsg("Select the text and copy manually"); }
    setTimeout(() => setCopyMsg(""), 2500);
  }

  function restoreFromCode() {
    try {
      applyState(unpackState(pasteCode));
      setRestoreMsg("Restored ✓");
    } catch (e) { setRestoreMsg("That code didn't parse — check you copied all of it."); }
    setTimeout(() => setRestoreMsg(""), 3000);
  }

  const startRest = (seconds) => {
    restEndRef.current = Date.now() + seconds * 1000;
    setRestLeft(seconds);
    setRunning(true);
  };

  const requestNotifPermission = async () => {
    await ensureNotificationPermission();
    setNotifPerm(await currentPermissionState());
  };

  const onPresetTap = async (seconds) => {
    restLabelRef.current = "";
    await requestNotifPermission();
    armRestNotification(seconds, "Next set");
  };

  const onRestCancel = () => { restEndRef.current = 0; clearRestNotification(); };

  // Used by WorkoutEngine when a set is marked complete — arms the native
  // notification with the exercise name as its label, then starts the same
  // wall-clock-anchored countdown the rest-timer engine above already owns.
  const startRestFor = (seconds, label) => {
    restLabelRef.current = label || "Next set";
    armRestNotification(seconds, restLabelRef.current);
    startRest(seconds);
  };

  const selectedFoods = Object.keys(foods).filter((k) => foods[k]);

  // Recipe lookup via TheMealDB — free, no API key, CORS-enabled, no backend needed.
  // Free tier filters by ONE ingredient per call, so we query each selected food
  // separately and rank the results by how many of your foods each recipe actually uses.
  async function genMeals() {
    setMealLoading(true); setMealErr(null);
    try {
      const picks = selectedFoods.slice(0, 5);
      const idHits = {};

      await Promise.all(picks.map(async (food) => {
        const term = MEALDB_TERM[food] || food.split(" ")[0].toLowerCase();
        try {
          const r = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?i=" + encodeURIComponent(term));
          const j = await r.json();
          if (j && Array.isArray(j.meals)) {
            j.meals.slice(0, 8).forEach((m) => {
              idHits[m.idMeal] = (idHits[m.idMeal] || 0) + 1;
            });
          }
        } catch (e) { /* one ingredient failing shouldn't kill the batch */ }
      }));

      const ranked = Object.keys(idHits).sort((a, b) => idHits[b] - idHits[a]).slice(0, 6);
      if (ranked.length === 0) {
        setMealErr("No recipes matched those ingredients. Try selecting a common protein like chicken or beef.");
        setMealLoading(false);
        return;
      }

      const details = await Promise.all(ranked.map(async (id) => {
        try {
          const r = await fetch("https://www.themealdb.com/api/json/v1/1/lookup.php?i=" + id);
          const j = await r.json();
          const m = j && j.meals && j.meals[0];
          if (!m) return null;
          const ings = [];
          for (let i = 1; i <= 20; i++) {
            const ing = m["strIngredient" + i], meas = m["strMeasure" + i];
            if (ing && ing.trim()) ings.push(((meas || "").trim() + " " + ing.trim()).trim());
          }
          return {
            id: m.idMeal,
            name: m.strMeal,
            thumb: m.strMealThumb,
            category: [m.strCategory, m.strArea].filter(Boolean).join(" · "),
            ingredients: ings,
            desc: (m.strInstructions || "").split(/\r?\n/).filter(Boolean)[0] || "",
            link: m.strSource || ("https://www.themealdb.com/meal/" + m.idMeal),
            matches: idHits[m.idMeal],
          };
        } catch (e) { return null; }
      }));

      const clean = details.filter(Boolean);
      if (clean.length === 0) throw new Error("no details");
      setMeals(clean);
    } catch (e) {
      setMealErr("Couldn't reach the recipe database — check your connection and try again.");
    }
    setMealLoading(false);
  }

  const tabs = [
    ["home", "Home", Home], ["workout", "Workout", Dumbbell], ["history", "History", HistoryIcon],
    ["stats", "Stats", BarChart3], ["more", "More", Menu],
  ];
  const moreMenu = [
    ["fuel", "Fuel", "Macros, food log, meal ideas", Utensils, "#47A96B"],
    ["off", "Off Days", "Mobility, pelvic floor, cardio", Wind, "#7FA8D9"],
    ["rules", "Program & Rules", "How the split and progression work", BookOpen, "#E5B93C"],
    ["settings", "Settings", "RPE tracking and other preferences", Settings, "#B9BFC7"],
    ["data", "Data & Backup", "Auto-save status and backup code", Database, "#B9BFC7"],
  ];
  const moreViewLabel = { fuel: "Fuel", off: "Off Days", rules: "Program & Rules", settings: "Settings", data: "Data & Backup" }[moreView];

  return (
    <div style={{ ...BODY, background: "#14171C", minHeight: "100vh", color: "#E8EAED" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 0 76px" }}>
        {tab === "home" && <HomeScreen onGoToWorkout={() => setTab("workout")} week={week} />}

        {tab === "workout" && (
          <WorkoutEngine week={week} setWeek={setWeek}
            rest={rest} setRest={setRest} restLeft={restLeft} setRestLeft={setRestLeft}
            running={running} setRunning={setRunning} elapsed={elapsed} setElapsed={setElapsed}
            keepAwake={keepAwake} setKeepAwake={setKeepAwake} wakeState={wakeState}
            notifPerm={notifPerm} onPresetTap={onPresetTap} onRestCancel={onRestCancel}
            exactAlarm={exactAlarm} onFixExactAlarm={fixExactAlarm}
            onCompleteSetRest={startRestFor}
            rpeEnabled={rpeEnabled} onActiveChange={setWorkoutActive} />
        )}

        {tab === "history" && <HistoryScreen />}
        {tab === "stats" && <StatsScreen />}

        {tab === "more" && moreView === null && (
          <div style={{ padding: "16px 16px 40px" }}>
            <div style={{ ...FONT, fontSize: 11, letterSpacing: 2, color: "#7A8189", fontWeight: 700 }}>
              MIRROR · 12-WEEK PROGRAM
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, marginTop: 6, marginBottom: 18,
              color: storageOk ? "#47A96B" : storageOk === false ? "#D64545" : "#5B626C" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: storageOk ? "#47A96B" : storageOk === false ? "#D64545" : "#5B626C" }} />
              {storageOk === true
                ? (savedAt ? "Saved " + savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Auto-save on")
                : storageOk === false ? "Auto-save off — see Data & Backup" : "Checking…"}
            </div>

            {moreMenu.map(([id, label, desc, Icon, iconColor]) => (
              <button key={id} onClick={() => setMoreView(id)}
                style={{ ...FONT, display: "flex", alignItems: "center", gap: 12, width: "100%",
                  textAlign: "left", padding: "13px 14px", borderRadius: 14, marginBottom: 8, cursor: "pointer",
                  background: "#1D2128", border: CARD_BORDER }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={17} color={iconColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: "#E8EAED" }}>{label}</div>
                  <div style={{ fontSize: 12, color: "#8A919C", marginTop: 1 }}>{desc}</div>
                </div>
                <ChevronRight size={16} color="#5B626C" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )}

        {tab === "more" && moreView !== null && (
          <div style={{ padding: "16px 16px 40px" }}>
            <button onClick={() => setMoreView(null)}
              style={{ ...FONT, display: "flex", alignItems: "center", gap: 4, background: "transparent",
                border: "none", color: "#8A919C", fontSize: 13, fontWeight: 600, cursor: "pointer",
                padding: 0, marginBottom: 14 }}>
              <ChevronLeft size={16} /> {moreViewLabel}
            </button>

        {moreView === "fuel" && (
          <FuelScreen phase={phase} setPhase={setPhase}
            foodLog={foodLog} setFoodLog={setFoodLog}
            bodyWeight={bodyWeight} setBodyWeight={setBodyWeight}
            foods={foods} setFoods={setFoods} bought={bought} setBought={setBought}
            meals={meals} mealLoading={mealLoading} mealErr={mealErr} onGenMeals={genMeals}
            color="#47A96B" />
        )}

        {moreView === "off" && (
          <OffDaysScreen offDayLog={offDayLog} setOffDayLog={setOffDayLog}
            onOpenExercise={openExercise} color="#7FA8D9" />
        )}

        {moreView === "rules" && (
          <>
            {RULES.map(([t, d]) => (
              <div key={t} style={{ background: "#1D2128", border: CARD_BORDER, borderRadius: 14, padding: "12px 14px", marginBottom: 8 }}>
                <div style={{ ...FONT, fontSize: 16, fontWeight: 700 }}>{t}</div>
                <div style={{ fontSize: 13, color: "#B9BFC7", marginTop: 3, lineHeight: 1.5 }}>{d}</div>
              </div>
            ))}
          </>
        )}

        {moreView === "settings" && (
          <div style={{ background: "#1D2128", border: CARD_BORDER, borderRadius: 14, padding: "12px 14px" }}>
            <div onClick={() => setRpeEnabled(!rpeEnabled)} role="button"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 13.5, color: "#E8EAED", fontWeight: 600 }}>RPE tracking</div>
                <div style={{ fontSize: 12, color: "#8A919C", marginTop: 2, lineHeight: 1.4 }}>
                  Show a 6–10 effort-rating picker on each set while training.
                </div>
              </div>
              <div style={{ width: 44, height: 26, borderRadius: 13, flexShrink: 0, position: "relative",
                background: rpeEnabled ? "#47A96B" : "#333945", transition: "background 150ms ease" }}>
                <div style={{ position: "absolute", top: 3, left: rpeEnabled ? 21 : 3, width: 20, height: 20,
                  borderRadius: "50%", background: "#E8EAED", transition: "left 150ms ease" }} />
              </div>
            </div>
          </div>
        )}

        {moreView === "data" && (
          <div style={{ background: "#1D2128", border: CARD_BORDER, borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ fontSize: 13, color: "#B9BFC7", lineHeight: 1.5, marginBottom: 10 }}>
                {storageOk
                  ? "Auto-save is working — phase, food picks and body weight save automatically and reload when you reopen. Workout history saves separately on this device too. The code below is a backup of your food/phase settings for moving to another device."
                  : "Auto-save isn't working here. Copy the backup code below before you close the app, and paste it back next time to restore everything."}
              </div>
              {storageOk === false && storageWhy && (
                <div style={{ fontSize: 11.5, color: "#8A919C", marginBottom: 10, fontStyle: "italic" }}>
                  Reason: {storageWhy}
                </div>
              )}

              <div style={{ fontSize: 12, color: "#8A919C", marginBottom: 4 }}>Your current backup code</div>
              <textarea readOnly value={backupCode} onFocus={(e) => e.target.select()}
                style={{ width: "100%", height: 56, background: "#14171C", border: "1px solid #333945",
                  borderRadius: 10, color: "#8A919C", fontSize: 11, padding: 8, resize: "none", boxSizing: "border-box" }} />
              <button onClick={copyBackup}
                style={{ ...FONT, marginTop: 8, padding: "9px 14px", borderRadius: 10, fontSize: 13.5, fontWeight: 600,
                  background: "#333945", border: "none", color: "#E8EAED", cursor: "pointer" }}>
                Copy code
              </button>
              {copyMsg && <span style={{ fontSize: 12.5, color: "#47A96B", marginLeft: 10 }}>{copyMsg}</span>}

              <div style={{ height: 1, background: "#262B33", margin: "14px 0" }} />

              <div style={{ fontSize: 12, color: "#8A919C", marginBottom: 4 }}>Restore from a code</div>
              <textarea value={pasteCode} onChange={(e) => setPasteCode(e.target.value)}
                placeholder="Paste a backup code here…"
                style={{ width: "100%", height: 56, background: "#14171C", border: "1px solid #333945",
                  borderRadius: 10, color: "#E8EAED", fontSize: 11, padding: 8, resize: "none", boxSizing: "border-box" }} />
              <button onClick={restoreFromCode} disabled={!pasteCode.trim()}
                style={{ ...FONT, marginTop: 8, padding: "9px 14px", borderRadius: 10, fontSize: 13.5, fontWeight: 600,
                  background: pasteCode.trim() ? "#47A96B" : "#333945", border: "none",
                  color: pasteCode.trim() ? "#14171C" : "#8A919C", cursor: pasteCode.trim() ? "pointer" : "default" }}>
                Restore
              </button>
              {restoreMsg && <span style={{ fontSize: 12.5, color: "#B9BFC7", marginLeft: 10 }}>{restoreMsg}</span>}

              <button onClick={() => {
                setFoods({}); setBought({}); setMeals([]);
                setWeek(1); setPhase("bulk");
                try { localStorage.removeItem(STORE_KEY); } catch (e) { /* nothing stored */ }
              }}
                style={{ ...FONT, marginTop: 16, padding: "9px 14px", borderRadius: 10, fontSize: 13,
                  fontWeight: 600, background: "transparent", border: "1px solid #D64545", color: "#D64545",
                  cursor: "pointer", display: "block" }}>
                Wipe all data
              </button>
          </div>
        )}
          </div>
        )}
      </div>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40,
        display: "flex", justifyContent: "center", background: "linear-gradient(to top, #14171C 60%, transparent)",
        paddingTop: 14 }}>
        <div style={{ maxWidth: 480, width: "100%", margin: "0 auto", padding: "0 12px 12px" }}>
          {/* While a workout is actively in progress, the nav shrinks (smaller
              icons, no labels, dimmer) so it reads as "still there if you need
              it" rather than an equally-weighted invitation to tap away mid-set. */}
          <div style={{ display: "flex", gap: 2, background: "#191C22", border: CARD_BORDER, borderRadius: 16,
            padding: 5, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            opacity: workoutActive && tab === "workout" ? 0.72 : 1,
            transition: "opacity 180ms ease" }}>
            {tabs.map(([id, label, Icon]) => {
              const compact = workoutActive && tab === "workout";
              return (
                <button key={id} onClick={() => setTab(id)}
                  style={{ ...FONT, flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                    gap: compact ? 0 : 3, padding: compact ? "6px 2px" : "8px 2px 7px", fontSize: 10,
                    fontWeight: 700, letterSpacing: 0.2,
                    background: "transparent", color: tab === id ? "#E8EAED" : "#5B626C",
                    border: "none", borderRadius: 11, cursor: "pointer" }}>
                  <Icon size={compact ? 16 : 19} strokeWidth={tab === id ? 2.4 : 2} />
                  {!compact && label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {exerciseModal && (
        <ExerciseModal name={exerciseModal.name} color={exerciseModal.color}
          onClose={() => setExerciseModal(null)} />
      )}
    </div>
  );
}


// ---------- In-app exercise guide — bottom sheet, replaces leaving the app for a
// Google Images search when we have real step-by-step data bundled (see
// src/data/exerciseInfo.json, matched from the free-exercise-db public-domain dataset).

