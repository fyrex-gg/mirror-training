import { useState, useEffect, useRef } from "react";
import { ExternalLink, Info, Home, Dumbbell, History as HistoryIcon, BarChart3, Menu } from "lucide-react";
import { ensureNotificationPermission, currentPermissionState, armRestNotification, notifyRestDone, notifyRestTick, clearRestNotification, checkExactAlarmState, requestExactAlarm } from "./notify.js";
import EXERCISE_INFO from "./data/exerciseInfo.json";
import { ExerciseModal } from "./workout/ExerciseGuideModal.jsx";
import FoodLog from "./FoodLog.jsx";
import BodyWeightLog from "./BodyWeightLog.jsx";
import HomeScreen from "./home/HomeScreen.jsx";
import WorkoutEngine from "./workout/WorkoutEngine.jsx";
import HistoryScreen from "./history/HistoryScreen.jsx";
import StatsScreen from "./stats/StatsScreen.jsx";

const NUTRITION = {
  bulk: { label: "Lean bulk", kcal: "≈ 3,050", protein: "170 g", fat: "75 g", carbs: "≈ 425 g",
    rate: "Gain ~0.25–0.35 kg per week",
    adjust: "2-week average rising faster → cut 150 kcal of carbs. Stalled 2 weeks → add 150 kcal." },
  cut: { label: "Aggressive cut", kcal: "≈ 2,150", protein: "185 g", fat: "65 g", carbs: "≈ 205 g",
    rate: "Lose ~0.5–0.7 kg per week",
    adjust: "Stalled 2 weeks → remove 150 kcal of carbs or add one cardio finisher. Keep carbs around training." },
};

const FOOD_DB = {
  Protein: ["Chicken breast", "Eggs", "Greek yogurt", "Whey", "Lean beef", "Salmon", "Tuna", "Cottage cheese", "Tofu"],
  Carbs: ["Rice", "Oats", "Potatoes", "Pasta", "Bread / wraps", "Beans", "Bananas", "Berries"],
  Fats: ["Olive oil", "Nuts", "Avocado", "Peanut butter"],
  Veg: ["Broccoli", "Spinach", "Peppers", "Tomatoes", "Cucumber", "Onions & garlic"],
};

const PELVIC = {
  freq: "3×/day · ~10 reps each round (≈30/day)",
  steps: [
    "Find the muscles: the ones that stop urine mid-stream or hold in gas. A correct rep pulls the penis slightly upward/inward.",
    "Contract 3–5s, relax 3–5s. Keep your abs, glutes and thighs relaxed — isolate the pelvic floor only.",
    "Mix in 'quick flicks': fast 1–2s contract/release, 10 reps, to train fast-twitch fibers too.",
    "Progress to standing once you're consistent seated/lying — standing is harder and more functional.",
  ],
  note: "Backed by RCTs: Dorey et al. 2005 found 40% of men regained normal erectile function after 6 months of PFMT; Pastore et al. 2014 found average time-to-ejaculation rose from ~32s to ~146s over 12 weeks. Give it 8–12 weeks before judging results.",
};

const MOBILITY = [
  { n: "Dead hang", d: "2 × 30–45s", q: "dead hang shoulder decompression form", note: "Opens shoulders + grip for pull-ups" },
  { n: "Wrist rocks + extensor stretch", d: "60s", q: "wrist mobility rocks calisthenics warm up", note: "Preps wrists for push-up work" },
  { n: "Scapular push-up", d: "2 × 10", q: "scapular push up form", note: "Teaches shoulder-blade control" },
  { n: "Doorway pec stretch", d: "60s / side", q: "doorway pec stretch form", note: "Counters all the pushing volume" },
  { n: "Couch stretch (hip flexors)", d: "60s / side", q: "couch stretch hip flexor form", note: "Undoes sitting; helps leg day" },
  { n: "Deep squat hold, heels down", d: "2 × 45s", q: "deep squat hold mobility form", note: "Ankles + hips, low-impact" },
  { n: "Band dislocates", d: "2 × 12", q: "band shoulder dislocates form", note: "Keeps overhead range honest" },
];

const FINISHERS = [
  { n: "Incline walk", d: "10–12 min · 10–12% · 5–6 km/h", q: "incline treadmill walk posture form", note: "Zero joint impact, counts toward weekly aerobic target" },
  { n: "Bike intervals", d: "8 × (20s hard / 40s easy)", q: "stationary bike sprint interval seat position", note: "Legs only, joints spared" },
  { n: "Stairs", d: "10 min steady or 6 × (45s hard / 75s easy)", q: "stair climber machine proper form posture", note: "Keep it light given your leg condition" },
];

const RULES = [
  ["The split — 4 on, 3 off", "Day 1 Push A → Day 2 Pull A → rest → Day 3 Push B → Day 4 Pull B → rest → rest. Chest and back each get two sessions with different angles (see each session's sub-label) — research shows 2×/week beats 1×/week when volume is equal, but total weekly volume is what really drives growth, not frequency alone."],
  ["Legs — light on purpose", "Only 3 exercises, all on Day 4, kept to light-moderate loads with higher reps (15–20+). No heavy squats, deadlifts or heavy leg press — those need heavy load to work, which isn't the goal here. If you get blood-flow-restriction (BFR) cuffs, they let you build real strength at 20–30% of a heavy weight — ask your doctor first given your condition."],
  ["Pelvic floor training", "Do the daily Kegel routine below regardless of training day — it's the best-evidenced exercise for erection strength and staying power, better supported than hip thrusts or hip abduction for that specific goal."],
  ["Double progression", "Hit the top of the rep range on every set → add the smallest increment → drop back down. Micro-jumps only."],
  ["Deloads — weeks 4 · 8 · 12", "Same movements, 60% of working weight, 2 sets each. Suggested kg shows automatically on each card."],
  ["If a lift stalls", "Two weeks with zero progress → drop that lift 10% and rebuild over 2–3 weeks."],
  ["Aerobic target", "~160 min/week of moderate-vigorous cardio has the strongest exercise evidence for erectile function — the finishers below plus a couple of extra walks gets you there."],
];

const imgLink = (q) => "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(q);
const mmss = (t) => Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
const parseNum = (s) => Number(String(s).replace(/[^\d.]/g, "")) || 0;
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
  const [moreTab, setMoreTab] = useState("fuel");
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

  const fullState = () => ({ foods, bought, week, phase, meals, foodLog, bodyWeight, rpeEnabled });
  const applyState = (s) => {
    if (s.foods) setFoods(s.foods);
    if (s.bought) setBought(s.bought);
    if (s.week) setWeek(s.week);
    if (s.phase) setPhase(s.phase);
    if (s.meals) setMeals(s.meals);
    if (s.foodLog) setFoodLog(s.foodLog);
    if (s.bodyWeight) setBodyWeight(s.bodyWeight);
    if (typeof s.rpeEnabled === "boolean") setRpeEnabled(s.rpeEnabled);
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
  }, [foods, bought, week, phase, meals, foodLog, bodyWeight, rpeEnabled, loaded]);

  // Keep the backup code fresh so it's always ready to copy.
  useEffect(() => { setBackupCode(packState(fullState())); },
    [foods, bought, week, phase, meals, foodLog, bodyWeight, rpeEnabled]);

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

  // Food log is scoped per calendar day — foodLog is { "YYYY-MM-DD": entry[] }
  // so "Today's totals" actually means today, and old days don't pile up in view.
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayFoodLog = foodLog[todayKey] || [];
  const setTodayFoodLog = (entries) => setFoodLog({ ...foodLog, [todayKey]: entries });

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
  const moreTabs = [["fuel", "Fuel"], ["off", "Off days"], ["rules", "Rules"]];

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

        {tab === "more" && (
          <div style={{ padding: "16px 16px 40px" }}>
            <div style={{ ...FONT, fontSize: 11, letterSpacing: 2, color: "#7A8189", fontWeight: 700 }}>
              MIRROR · 12-WEEK PROGRAM
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, marginTop: 6, marginBottom: 14,
              color: storageOk ? "#47A96B" : storageOk === false ? "#D64545" : "#5B626C" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: storageOk ? "#47A96B" : storageOk === false ? "#D64545" : "#5B626C" }} />
              {storageOk === true
                ? (savedAt ? "Saved " + savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Auto-save on")
                : storageOk === false ? "Auto-save off — see Rules below" : "Checking…"}
            </div>

            <div style={{ display: "flex", gap: 3, marginBottom: 18, background: "#191C22",
              border: CARD_BORDER, borderRadius: 14, padding: 4 }}>
              {moreTabs.map(([id, label]) => (
                <button key={id} onClick={() => setMoreTab(id)}
                  style={{ ...FONT, flex: 1, padding: "9px 2px", fontSize: 13.5, fontWeight: 600,
                    background: moreTab === id ? "#E8EAED" : "transparent", color: moreTab === id ? "#14171C" : "#8A919C",
                    border: "none", borderRadius: 10, cursor: "pointer" }}>{label}</button>
              ))}
            </div>

        {moreTab === "fuel" && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {["bulk", "cut"].map((ph) => (
                <button key={ph} onClick={() => setPhase(ph)}
                  style={{ ...FONT, flex: 1, padding: "10px 0", fontSize: 15, fontWeight: 600, borderRadius: 10,
                    cursor: "pointer", border: "none", background: phase === ph ? "#E8EAED" : "#1D2128",
                    color: phase === ph ? "#14171C" : "#8A919C" }}>{NUTRITION[ph].label}</button>
              ))}
            </div>

            <div style={{ background: "#1D2128", border: CARD_BORDER, borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ ...FONT, fontSize: 38, fontWeight: 700, lineHeight: 1 }}>
                {NUTRITION[phase].kcal}<span style={{ fontSize: 17, color: "#8A919C" }}> kcal/day</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
                {[["Protein", NUTRITION[phase].protein], ["Fat", NUTRITION[phase].fat], ["Carbs", NUTRITION[phase].carbs]].map(([l, v]) => (
                  <div key={l} style={{ background: "#14171C", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ ...FONT, fontSize: 18, fontWeight: 700 }}>{v}</div>
                    <div style={{ fontSize: 10.5, letterSpacing: 1.4, color: "#8A919C", textTransform: "uppercase" }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: "#B9BFC7", marginTop: 12 }}>{NUTRITION[phase].rate}</div>
              <div style={{ fontSize: 12.5, color: "#8A919C", marginTop: 4 }}>{NUTRITION[phase].adjust}</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <BodyWeightLog entries={bodyWeight} setEntries={setBodyWeight} color="#47A96B" />
            </div>

            <FoodLog log={todayFoodLog} setLog={setTodayFoodLog}
              targets={{
                kcal: parseNum(NUTRITION[phase].kcal),
                protein: parseNum(NUTRITION[phase].protein),
                fat: parseNum(NUTRITION[phase].fat),
                carbs: parseNum(NUTRITION[phase].carbs),
              }}
              color="#47A96B" />

            <div style={{ height: 1, background: "#262B33", margin: "18px 0 16px" }} />

            <div style={{ ...FONT, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Your foods</div>
            <div style={{ fontSize: 12.5, color: "#8A919C", marginBottom: 10 }}>
              Tap what you actually eat — this builds your shopping list and feeds the meal generator.
            </div>
            {Object.entries(FOOD_DB).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: 1.6, color: "#8A919C", textTransform: "uppercase", marginBottom: 6 }}>{cat}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {items.map((f) => (
                    <button key={f} onClick={() => setFoods({ ...foods, [f]: !foods[f] })}
                      style={{ padding: "7px 11px", borderRadius: 16, fontSize: 13, cursor: "pointer",
                        border: "1px solid " + (foods[f] ? "#47A96B" : "#333945"),
                        background: foods[f] ? "rgba(71,169,107,0.15)" : "#1D2128",
                        color: foods[f] ? "#8FD6AC" : "#B9BFC7", fontWeight: 500 }}>{f}</button>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ ...FONT, fontSize: 18, fontWeight: 700, margin: "16px 0 4px" }}>Shopping list</div>
            {selectedFoods.length === 0 ? (
              <div style={{ fontSize: 13, color: "#5B626C", marginBottom: 14 }}>Pick foods above to build the list.</div>
            ) : (
              <div style={{ background: "#1D2128", border: CARD_BORDER, borderRadius: 14, padding: "10px 14px", marginBottom: 14 }}>
                {selectedFoods.map((f) => (
                  <div key={f} onClick={() => setBought({ ...bought, [f]: !bought[f] })}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", cursor: "pointer",
                      borderBottom: "1px solid #262B33" }}>
                    <div style={{ width: 17, height: 17, borderRadius: 5, flexShrink: 0,
                      border: "2px solid " + (bought[f] ? "#47A96B" : "#3A404A"),
                      background: bought[f] ? "#47A96B" : "transparent" }} />
                    <div style={{ fontSize: 14, color: bought[f] ? "#5B626C" : "#E8EAED",
                      textDecoration: bought[f] ? "line-through" : "none" }}>{f}</div>
                  </div>
                ))}
                <button onClick={() => setBought({})}
                  style={{ ...FONT, marginTop: 10, padding: "7px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: "transparent", border: "1px solid #333945", color: "#8A919C", cursor: "pointer" }}>
                  Uncheck all
                </button>
              </div>
            )}

            <div style={{ ...FONT, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Meal ideas</div>
            <div style={{ fontSize: 12.5, color: "#8A919C", marginBottom: 10 }}>
              Searches TheMealDB for real recipes using the foods you picked. Ranked by how many of your ingredients each one uses. Tap a recipe for the full method.
            </div>
            <button onClick={genMeals} disabled={mealLoading || selectedFoods.length < 2}
              style={{ ...FONT, width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
                fontSize: 15, fontWeight: 700, cursor: mealLoading || selectedFoods.length < 2 ? "default" : "pointer",
                background: mealLoading || selectedFoods.length < 2 ? "#333945" : "#47A96B",
                color: mealLoading || selectedFoods.length < 2 ? "#8A919C" : "#14171C", marginBottom: 10 }}>
              {mealLoading ? "Searching recipes…" : selectedFoods.length < 2 ? "Select at least 2 foods first" : "Find recipes with my foods"}
            </button>
            {mealErr && <div style={{ fontSize: 13, color: "#D64545", marginBottom: 10 }}>{mealErr}</div>}
            {meals.map((m, mi) => (
              <div key={m.id || mi} style={{ background: "#1D2128", border: CARD_BORDER, borderRadius: 14, overflow: "hidden", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 10, padding: 10 }}>
                  {m.thumb && (
                    <img src={m.thumb} alt="" width="74" height="74"
                      style={{ borderRadius: 10, objectFit: "cover", flexShrink: 0, background: "#14171C" }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 11.5, color: "#8A919C", marginTop: 2 }}>{m.category}</div>
                    {m.matches > 1 && (
                      <div style={{ fontSize: 11.5, color: "#8FD6AC", marginTop: 3 }}>
                        uses {m.matches} of your ingredients
                      </div>
                    )}
                    <a href={m.link} target="_blank" rel="noreferrer"
                      style={{ fontSize: 12, color: "#7FA8D9", textDecoration: "none", fontWeight: 600,
                        display: "inline-flex", alignItems: "center", gap: 3, marginTop: 5 }}>
                      full recipe <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
                {m.ingredients && m.ingredients.length > 0 && (
                  <div style={{ padding: "0 12px 11px", fontSize: 12, color: "#8A919C", lineHeight: 1.5 }}>
                    {m.ingredients.join(" · ")}
                  </div>
                )}
              </div>
            ))}
            {meals.length > 0 && (
              <div style={{ fontSize: 11, color: "#5B626C", textAlign: "center", marginTop: 6 }}>
                Recipes from TheMealDB. Check portions against your macro targets above.
              </div>
            )}
          </>
        )}

        {moreTab === "off" && (
          <>
            <div style={{ background: "#1D2128", border: CARD_BORDER, borderRadius: 14, padding: "12px 14px", marginBottom: 10 }}>
              <div style={{ ...FONT, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Pelvic floor · daily, every day</div>
              <div style={{ fontSize: 12, color: "#8A919C", marginBottom: 8 }}>{PELVIC.freq}</div>
              {PELVIC.steps.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 13, color: "#5B626C", flexShrink: 0 }}>{i + 1}.</div>
                  <div style={{ fontSize: 13, color: "#B9BFC7", lineHeight: 1.5 }}>{s}</div>
                </div>
              ))}
              <div style={{ fontSize: 12, color: "#8A919C", marginTop: 6, lineHeight: 1.5, fontStyle: "italic" }}>{PELVIC.note}</div>
            </div>

            <div style={{ background: "#1D2128", border: CARD_BORDER, borderRadius: 14, padding: "12px 14px", marginBottom: 14,
              fontSize: 13, color: "#B9BFC7", lineHeight: 1.55 }}>
              Off days = <b style={{ color: "#E8EAED" }}>calisthenics + this mobility list</b>. 2–3 rounds of
              pull-ups / push-ups / dips, always 2+ reps from failure — it's skill work, not a fourth workout.
            </div>
            <div style={{ ...FONT, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Mobility · ~12 min daily</div>
            {MOBILITY.map((m) => <Row key={m.n} item={m} onOpenExercise={openExercise} />)}
            <div style={{ height: 16 }} />
            <div style={{ ...FONT, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Cardio finisher · gym days only</div>
            <div style={{ fontSize: 12.5, color: "#8A919C", marginBottom: 8 }}>
              Legs-only on purpose so arms/shoulders stay fresh for calisthenics. Do it after training, not on off days.
            </div>
            {FINISHERS.map((f) => <Row key={f.n} item={f} onOpenExercise={openExercise} />)}
          </>
        )}

        {moreTab === "rules" && (
          <>
            {RULES.map(([t, d]) => (
              <div key={t} style={{ background: "#1D2128", border: CARD_BORDER, borderRadius: 14, padding: "12px 14px", marginBottom: 8 }}>
                <div style={{ ...FONT, fontSize: 16, fontWeight: 700 }}>{t}</div>
                <div style={{ fontSize: 13, color: "#B9BFC7", marginTop: 3, lineHeight: 1.5 }}>{d}</div>
              </div>
            ))}

            <div style={{ background: "#1D2128", border: CARD_BORDER, borderRadius: 14, padding: "12px 14px", marginTop: 14 }}>
              <div style={{ ...FONT, fontSize: 16, fontWeight: 700 }}>Settings</div>
              <div onClick={() => setRpeEnabled(!rpeEnabled)} role="button"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                  marginTop: 10, cursor: "pointer" }}>
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

            <div style={{ background: "#1D2128", border: CARD_BORDER, borderRadius: 14, padding: "12px 14px", marginTop: 10 }}>
              <div style={{ ...FONT, fontSize: 16, fontWeight: 700 }}>Saved data</div>
              <div style={{ fontSize: 13, color: "#B9BFC7", marginTop: 3, lineHeight: 1.5, marginBottom: 10 }}>
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
          </>
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

function Row({ item, onOpenExercise }) {
  const hasGuide = !!EXERCISE_INFO[item.n];
  return (
    <div style={{ background: "#1D2128", border: CARD_BORDER, borderRadius: 12, padding: "10px 14px", marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{item.n}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", whiteSpace: "nowrap" }}>
          <div style={{ ...FONT, fontSize: 13, color: "#8A919C" }}>{item.d}</div>
          {hasGuide ? (
            <button onClick={() => onOpenExercise(item.n, "#7FA8D9")}
              style={{ fontSize: 12, color: "#7FA8D9", background: "transparent", border: "none", padding: 0,
                fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 }}>
              guide <Info size={11} />
            </button>
          ) : (
            <a href={imgLink(item.q)} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, color: "#7FA8D9", textDecoration: "none", fontWeight: 600,
                display: "inline-flex", alignItems: "center", gap: 3 }}>
              form <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
      {item.note && <div style={{ fontSize: 12, color: "#5B626C", marginTop: 2 }}>{item.note}</div>}
    </div>
  );
}

// ---------- In-app exercise guide — bottom sheet, replaces leaving the app for a
// Google Images search when we have real step-by-step data bundled (see
// src/data/exerciseInfo.json, matched from the free-exercise-db public-domain dataset).

