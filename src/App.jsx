import { useState, useEffect, useRef } from "react";
import { ensureNotificationPermission, notifyRestDone, notifyRestTick, clearRestNotification } from "./notify.js";

// ---------- Program data: 2-1-2-2 split, chest & back 2x/week, legs light once/week ----------
const SESSIONS = [
  {
    id: "pushA", name: "Push A", sub: "Day 1 · Chest · Side/Rear Delts · Triceps", color: "#D64545",
    muscles: ["chest", "delts", "triceps"],
    slots: [
      { s: 4, r: "8-10", min: 15, max: 140, step: 2.5, vars: [
        { n: "Incline Dumbbell Press", note: "~30° bench, deep stretch, upper-chest bias" },
        { n: "Incline Machine Press", note: "Fixed path, joint-friendly" },
        { n: "Smith Machine Incline Press", note: "Stable bar path" }]},
      { s: 3, r: "12-15", min: 5, max: 100, step: 2.5, vars: [
        { n: "Pec Deck Fly", note: "Squeeze 1s at the peak — highest pec isolation" },
        { n: "Cable Crossover (high-to-low)", note: "Constant tension through the stretch" },
        { n: "Dumbbell Fly", note: "Soft elbows, big stretch" }]},
      { s: 4, r: "12-15", min: 2.5, max: 30, step: 1.25, vars: [
        { n: "Cable Lateral Raise", note: "Strict, no swing — constant tension" },
        { n: "Dumbbell Lateral Raise", note: "Lead with elbows" },
        { n: "Machine Lateral Raise", note: "Pause at the top" }]},
      { s: 3, r: "15", min: 5, max: 70, step: 2.5, vars: [
        { n: "Reverse Pec Deck", note: "Top pick for rear delts — arms long, no shrug" },
        { n: "Reverse Cable Fly", note: "Cross the cables" },
        { n: "Face Pull", note: "Pull to eyebrows, rotate out" }]},
      { s: 3, r: "10-12", min: 5, max: 70, step: 2.5, vars: [
        { n: "Overhead Cable Triceps Ext.", note: "Deep stretch — biases the long head" },
        { n: "Single-Arm OH Dumbbell Ext.", note: "Elbow points up" },
        { n: "EZ-Bar Skullcrusher", note: "Lower behind the head" }]},
      { s: 3, r: "12", min: 5, max: 80, step: 2.5, vars: [
        { n: "Rope Pushdown", note: "Split the rope at lockout" },
        { n: "Bar Pushdown", note: "Elbows pinned" },
        { n: "Dip Machine", note: "Slight forward lean" }]},
    ],
  },
  {
    id: "pullA", name: "Pull A", sub: "Day 2 · Back · Biceps · Abs", color: "#E5B93C",
    muscles: ["lats", "traps", "biceps", "forearms", "abs"],
    slots: [
      { s: 4, r: "8-10", min: 20, max: 140, step: 2.5, vars: [
        { n: "Wide-Grip Lat Pulldown", note: "Width focus" },
        { n: "Assisted Pull-Up", note: "Full hang each rep" },
        { n: "Single-Arm Pulldown", note: "Big stretch at the top" }]},
      { s: 4, r: "8-10", min: 20, max: 140, step: 2.5, vars: [
        { n: "Chest-Supported Row", note: "No torso momentum, spares the lower back" },
        { n: "Seated Cable Row", note: "Squeeze shoulder blades" },
        { n: "Single-Arm Dumbbell Row", note: "Full stretch each rep" }]},
      { s: 3, r: "12-15", min: 10, max: 90, step: 2.5, vars: [
        { n: "Straight-Arm Pulldown", note: "True lat isolation, strong stretch" },
        { n: "Cable Pullover", note: "Arms long, ribs down" },
        { n: "Dumbbell Pullover", note: "Stretch over the bench" }]},
      { s: 3, r: "10-12", min: 5, max: 40, step: 1.25, vars: [
        { n: "Incline Dumbbell Curl", note: "Lengthened-position bias — top pick" },
        { n: "Cable Curl", note: "Constant tension" },
        { n: "Preacher Curl (full extension)", note: "Loads the stretch" }]},
      { s: 3, r: "12", min: 5, max: 60, step: 2.5, vars: [
        { n: "EZ-Bar Curl", note: "Elbows pinned at your sides" },
        { n: "Hammer Curl", note: "Neutral grip, brachialis + forearms" },
        { n: "Reverse Curl", note: "Forearms + brachialis" }]},
      { s: 3, r: "10-15", min: 0, max: 40, step: 2.5, vars: [
        { n: "Hanging Leg Raise", note: "High activation of lower abs" },
        { n: "Cable Crunch", note: "Round the spine, hips still" },
        { n: "Ab Wheel", note: "Don't let the hips sag" }]},
    ],
  },
  {
    id: "pushB", name: "Push B", sub: "Day 3 · Chest · Shoulders · Arms (variation)", color: "#47A96B",
    muscles: ["chest", "delts", "biceps", "triceps"],
    slots: [
      { s: 4, r: "10-12", min: 15, max: 140, step: 2.5, vars: [
        { n: "Flat Machine Chest Press", note: "Different angle from Day 1's incline" },
        { n: "Flat Dumbbell Press", note: "Natural shoulder path" },
        { n: "Smith Machine Flat Press", note: "Stable bar path" }]},
      { s: 3, r: "12-15", min: 5, max: 100, step: 2.5, vars: [
        { n: "Cable Crossover (mid)", note: "Mid-chest stretch, different angle to Day 1" },
        { n: "Pec Deck Fly", note: "Squeeze at the peak" },
        { n: "Dumbbell Fly", note: "Deep stretch" }]},
      { s: 3, r: "10-12", min: 10, max: 60, step: 2.5, vars: [
        { n: "Seated DB Shoulder Press", note: "Front delt — joint-friendly overhead work" },
        { n: "Machine Shoulder Press", note: "Fixed path" },
        { n: "Arnold Press", note: "Full rotation through the range" }]},
      { s: 3, r: "12-15", min: 2.5, max: 30, step: 1.25, vars: [
        { n: "Dumbbell Lateral Raise (lean-away)", note: "Different loading curve to Day 1's cable" },
        { n: "Cable Lateral Raise (behind body)", note: "Loads the stretched position" },
        { n: "Machine Lateral Raise", note: "Pause at the top" }]},
      { s: 3, r: "10", min: 5, max: 40, step: 1.25, vars: [
        { n: "Preacher Curl", note: "No shoulder drift — second angle for biceps" },
        { n: "Spider Curl", note: "Strict, no swing" },
        { n: "Machine Curl", note: "Slow negatives" }]},
      { s: 3, r: "12", min: 5, max: 70, step: 2.5, vars: [
        { n: "Overhead Rope Extension", note: "Second triceps angle — long-head stretch" },
        { n: "Rope Pushdown", note: "Constant tension through lockout" },
        { n: "Close-Grip Push-Up / Dip", note: "Bodyweight option" }]},
    ],
  },
  {
    id: "pullB", name: "Pull B", sub: "Day 4 · Back · Light Legs · Core", color: "#3E7BD6",
    muscles: ["lats", "traps", "quads", "hams", "glutes", "abs"],
    slots: [
      { s: 3, r: "10-12", min: 20, max: 140, step: 2.5, vars: [
        { n: "Neutral-Grip Lat Pulldown", note: "Different grip from Day 2's wide grip" },
        { n: "Machine High Row", note: "Upper-back focus" },
        { n: "Straight-Arm Pulldown", note: "Lat isolation" }]},
      { s: 3, r: "10-12", min: 20, max: 140, step: 2.5, vars: [
        { n: "Seated Cable Row", note: "Thickness, controlled tempo" },
        { n: "Chest-Supported Row", note: "Spares the lower back" },
        { n: "Machine Row", note: "Chest stays on the pad" }]},
      { s: 3, r: "15-20", min: 5, max: 45, step: 2.5, vars: [
        { n: "Leg Extension (partial arc)", note: "Light load, pain-free range — no axial loading" },
        { n: "Sissy Squat (assisted)", note: "Bodyweight-scale quad work" }]},
      { s: 3, r: "15-20", min: 5, max: 45, step: 2.5, vars: [
        { n: "Seated Leg Curl", note: "Light load, isolates hamstrings, no spinal load" },
        { n: "Lying Leg Curl", note: "Hips stay down" }]},
      { s: 3, r: "12-20", min: 10, max: 90, step: 5, vars: [
        { n: "Hip Thrust", note: "Load on hips not spine — glutes/hams, moderate load" },
        { n: "Glute Bridge", note: "Bodyweight-scale option" },
        { n: "Cable Pull-Through", note: "Hip hinge, spine-friendly" }]},
      { s: 3, r: "12-15", min: 0, max: 40, step: 2.5, vars: [
        { n: "Cable Crunch", note: "Second ab angle to Day 2" },
        { n: "Weighted Sit-Up", note: "Full range" },
        { n: "Reverse Crunch", note: "Lower-ab bias" }]},
    ],
  },
];

const SCHEDULE_NOTE = "2-1-2-2: Day 1 → Day 2 → rest → Day 3 → Day 4 → rest → rest (e.g. Mon/Tue train, Wed off, Thu/Fri train, Sat/Sun off).";
const DELOAD_WEEKS = [4, 8, 12];

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
const FONT = { fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif" };
const BODY = { fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" };
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

// ---------- Weight dial: drag anywhere on it to scrub, like a slider without the track ----------
function WSlider({ value, min, max, step, onChange, color }) {
  const [drag, setDrag] = useState(false);
  const startY = useRef(0);
  const startVal = useRef(0);
  const moved = useRef(false);

  const commit = (v) => onChange(Math.min(max, Math.max(min, Math.round(v / step) * step)));

  const onDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    startVal.current = value;
    moved.current = false;
    setDrag(true);
  };
  const onMove = (e) => {
    if (!drag) return;
    const dy = startY.current - e.clientY;
    if (Math.abs(dy) > 2) moved.current = true;
    // 5px per increment, accelerating on longer drags so big jumps stay quick
    const accel = Math.abs(dy) > 90 ? 2.5 : 1;
    commit(startVal.current + Math.round(dy / 5) * step * accel);
  };
  const end = () => setDrag(false);

  const decimals = step < 1 ? 2 : (String(step).includes(".") ? 1 : 0);
  const shown = Number(value.toFixed(decimals));
  const frac = (value - min) / (max - min);

  // Faint tick column that fades in while dragging — the slider cue, no permanent chrome
  const ticks = [];
  for (let i = 0; i < 9; i++) {
    const near = Math.abs(i / 8 - (1 - frac)) < 0.14;
    ticks.push(
      <div key={i} style={{ height: 2, borderRadius: 1,
        width: near ? 13 : 7,
        background: near ? color : "#3A404A",
        opacity: drag ? 1 : 0, transition: "opacity 140ms ease" }} />
    );
  }

  return (
    <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={end} onPointerCancel={end}
      role="slider" aria-valuenow={shown} aria-valuemin={min} aria-valuemax={max}
      style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 84, alignSelf: "stretch",
        padding: "6px 2px 6px 6px", touchAction: "none", cursor: "ns-resize", userSelect: "none",
        borderRadius: 10, background: drag ? "rgba(255,255,255,0.04)" : "transparent",
        transition: "background 140ms ease" }}>

      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between",
        alignItems: "flex-start", height: 62 }}>
        {ticks}
      </div>

      <div style={{ flex: 1, textAlign: "center" }}>
        <div style={{ ...FONT, fontSize: 30, fontWeight: 700, lineHeight: 1,
          fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
          color: drag ? color : "#E8EAED",
          textShadow: drag ? "0 0 18px " + color + "66" : "none" }}>
          {shown}
        </div>
        <div style={{ fontSize: 10, letterSpacing: 1.8, marginTop: 4, textTransform: "uppercase",
          color: drag ? color : "#5B626C" }}>
          {drag ? "kg" : "drag"}
        </div>
      </div>
    </div>
  );
}

// ---------- Exercise card with swipeable variations ----------
function ExCard({ slot, isDeload, doneCount, onTick, variant, setVariant, weight, setWeight, color }) {
  const tX = useRef(0);
  const sets = isDeload ? 2 : slot.s;
  const v = slot.vars[variant] || slot.vars[0];
  const nVars = slot.vars.length;
  const go = (dir) => setVariant((variant + dir + nVars) % nVars);
  const deloadW = weight ? Math.round((weight * 0.6) / slot.step) * slot.step : 0;
  return (
    <div style={{ background: "#1D2128", borderRadius: 12, padding: "12px 12px 12px 14px", marginBottom: 8,
      display: "flex", gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}
        onTouchStart={(e) => (tX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - tX.current;
          if (dx < -40) go(1); else if (dx > 40) go(-1); }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {nVars > 1 && <Arrow onClick={() => go(-1)} label="Previous variation">‹</Arrow>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.n}</div>
          </div>
          {nVars > 1 && <Arrow onClick={() => go(1)} label="Next variation">›</Arrow>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 3, gap: 8 }}>
          <div style={{ fontSize: 12, color: "#8A919C", minWidth: 0 }}>{v.note}</div>
          <a href={imgLink(v.n + " exercise proper form")} target="_blank" rel="noreferrer"
            style={{ fontSize: 12, color, textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>form ↗</a>
        </div>
        <div style={{ ...FONT, fontSize: 14, fontWeight: 600, color: "#B9BFC7", marginTop: 6 }}>
          {sets} × {slot.r}{isDeload && <span style={{ color: "#8A919C" }}> @60%{weight ? " ≈ " + deloadW + " kg" : ""}</span>}
        </div>
        {nVars > 1 && (
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            {slot.vars.map((_, di) => (
              <div key={di} style={{ width: 5, height: 5, borderRadius: "50%",
                background: di === variant ? color : "#333945" }} />
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {Array.from({ length: sets }, (_, si) => (
            <button key={si} onClick={() => onTick(si, sets)} aria-label={"Set " + (si + 1)}
              style={{ width: 30, height: 30, borderRadius: "50%", cursor: "pointer",
                border: "2.5px solid " + (si < doneCount ? color : "#3A404A"),
                background: si < doneCount ? color : "transparent",
                color: si < doneCount ? "#14171C" : "#8A919C",
                fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{si + 1}</button>
          ))}
        </div>
      </div>
      <WSlider value={weight || slot.min} min={slot.min} max={slot.max} step={slot.step}
        onChange={setWeight} color={color} />
    </div>
  );
}

function Arrow({ children, onClick, label }) {
  return (
    <button onClick={onClick} aria-label={label}
      style={{ background: "#14171C", border: "1px solid #333945", color: "#B9BFC7", borderRadius: 7,
        width: 26, height: 26, cursor: "pointer", fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
      {children}
    </button>
  );
}

// ---------- Timer ----------
// Rest duration is fully adjustable; the Android system-timer handoff always uses
// whatever the user has currently set, never a hardcoded value.
function androidTimerUrl(seconds, label) {
  return "intent:#Intent;action=android.intent.action.SET_TIMER;" +
    "i.android.intent.extra.alarm.LENGTH=" + seconds + ";" +
    "B.android.intent.extra.alarm.SKIP_UI=true;" +
    "S.android.intent.extra.alarm.MESSAGE=" + encodeURIComponent(label) + ";end";
}

function Timer({ color, rest, setRest, restLeft, setRestLeft, running, setRunning,
                 elapsed, setElapsed, keepAwake, setKeepAwake, wakeState,
                 notifPerm, onPresetTap, onRestCancel }) {
  const pct = restLeft > 0 ? (restLeft / rest) * 100 : 0;
  const presets = [60, 90, 120, 180];
  const adjust = (d) => setRest(Math.max(15, Math.min(600, rest + d)));

  return (
    <div style={{ background: "#1D2128", borderRadius: 12, padding: "10px 12px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, letterSpacing: 1.6, color: "#8A919C", textTransform: "uppercase" }}>Workout</div>
          <div style={{ ...FONT, fontSize: 26, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{mmss(elapsed)}</div>
        </div>
        <button onClick={() => setRunning(!running)}
          style={{ ...FONT, padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: 14, fontWeight: 700, background: running ? "#333945" : color,
            color: running ? "#E8EAED" : "#14171C" }}>
          {running ? "Pause" : elapsed ? "Resume" : "Start"}
        </button>
        <button onClick={() => { setRunning(false); setElapsed(0); setRestLeft(0); onRestCancel && onRestCancel(); }}
          style={{ ...FONT, padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 14,
            fontWeight: 600, background: "transparent", border: "1px solid #333945", color: "#8A919C" }}>Reset</button>
      </div>

      <div style={{ height: 1, background: "#262B33", margin: "10px 0" }} />

      {/* Rest countdown */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ minWidth: 84 }}>
          <div style={{ fontSize: 10.5, letterSpacing: 1.6, color: "#8A919C", textTransform: "uppercase" }}>Rest</div>
          <div style={{ ...FONT, fontSize: 21, fontWeight: 700, fontVariantNumeric: "tabular-nums",
            color: restLeft > 0 ? color : "#5B626C" }}>{restLeft > 0 ? mmss(restLeft) : mmss(rest)}</div>
        </div>
        {presets.map((p) => (
          <button key={p} onClick={() => { onPresetTap && onPresetTap(); setRest(p); setRestLeft(p); setRunning(true); }}
            style={{ ...FONT, flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer", fontSize: 13.5,
              fontWeight: 600, border: "none", background: rest === p ? "#333945" : "#14171C",
              color: rest === p ? "#E8EAED" : "#8A919C" }}>{p}s</button>
        ))}
      </div>

      {/* Fine adjustment — rest can be any value from 15s to 10min */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <button onClick={() => adjust(-15)}
          style={{ ...FONT, padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 14,
            fontWeight: 700, border: "1px solid #333945", background: "transparent", color: "#B9BFC7" }}>−15s</button>
        <button onClick={() => adjust(15)}
          style={{ ...FONT, padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 14,
            fontWeight: 700, border: "1px solid #333945", background: "transparent", color: "#B9BFC7" }}>+15s</button>
        <div style={{ flex: 1, textAlign: "right", fontSize: 11.5, color: "#8A919C" }}>
          rest set to <b style={{ color: "#E8EAED" }}>{mmss(rest)}</b>
        </div>
        {restLeft > 0 && (
          <button onClick={() => { setRestLeft(0); onRestCancel && onRestCancel(); }}
            style={{ ...FONT, padding: "7px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13,
              fontWeight: 600, border: "1px solid #333945", background: "transparent", color: "#8A919C" }}>Skip</button>
        )}
      </div>

      <div style={{ height: 3, background: "#262B33", borderRadius: 2, marginTop: 9, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: color, transition: "width 1s linear" }} />
      </div>

      {/* Lock-screen options */}
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
        <a href={androidTimerUrl(restLeft > 0 ? restLeft : rest, "Rest " + mmss(restLeft > 0 ? restLeft : rest))}
          style={{ ...FONT, flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 8, fontSize: 13.5,
            fontWeight: 600, background: "#14171C", border: "1px solid #333945", color: "#B9BFC7",
            textDecoration: "none" }}>
          ⏱ Phone timer ({mmss(restLeft > 0 ? restLeft : rest)})
        </a>
        <button onClick={() => setKeepAwake(!keepAwake)}
          style={{ ...FONT, padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13.5,
            fontWeight: 600, border: "1px solid " + (keepAwake ? color : "#333945"),
            background: keepAwake ? "rgba(255,255,255,0.06)" : "transparent",
            color: keepAwake ? "#E8EAED" : "#8A919C" }}>
          {keepAwake ? "Screen on ✓" : "Screen on"}
        </button>
      </div>
      <div style={{ fontSize: 11, color: "#5B626C", marginTop: 7, lineHeight: 1.45 }}>
        Ticking a set starts the rest countdown. "Phone timer" hands your current rest length to the
        Android clock so it rings even when locked{wakeState ? " · screen lock is being held off" : ""}.
      </div>
      {notifPerm === "default" && (
        <div onClick={onPresetTap} role="button"
          style={{ fontSize: 11, color, marginTop: 5, cursor: "pointer", textDecoration: "underline" }}>
          Enable lock-screen alerts
        </div>
      )}
      {notifPerm === "denied" && (
        <div style={{ fontSize: 11, color: "#8A919C", marginTop: 5 }}>
          Notifications blocked in browser settings
        </div>
      )}
    </div>
  );
}

// ---------- App ----------
export default function Program() {
  const [loaded, setLoaded] = useState(false);
  const [week, setWeek] = useState(1);
  const [sessionId, setSessionId] = useState("pushA");
  const [tab, setTab] = useState("train");
  const [phase, setPhase] = useState("bulk");
  const [done, setDone] = useState({});
  const [weights, setWeights] = useState({});
  const [variants, setVariants] = useState({});
  const [foods, setFoods] = useState({});
  const [bought, setBought] = useState({});
  const [meals, setMeals] = useState([]);
  const [mealLoading, setMealLoading] = useState(false);
  const [mealErr, setMealErr] = useState(null);

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
  const [notifPerm, setNotifPerm] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  const session = SESSIONS.find((s) => s.id === sessionId);
  const isDeload = DELOAD_WEEKS.includes(week);

  const fullState = () => ({ done, weights, variants, foods, bought, week, phase, meals });
  const applyState = (s) => {
    if (s.done) setDone(s.done);
    if (s.weights) setWeights(s.weights);
    if (s.variants) setVariants(s.variants);
    if (s.foods) setFoods(s.foods);
    if (s.bought) setBought(s.bought);
    if (s.week) setWeek(s.week);
    if (s.phase) setPhase(s.phase);
    if (s.meals) setMeals(s.meals);
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
  }, [done, weights, variants, foods, bought, week, phase, meals, loaded]);

  // Keep the backup code fresh so it's always ready to copy.
  useEffect(() => { setBackupCode(packState(fullState())); },
    [done, weights, variants, foods, bought, week, phase, meals]);

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
        const next = r - 1;
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

  const dKey = (i) => week + "-" + sessionId + "-" + i;
  const vKey = (i) => sessionId + "-" + i;
  const wKey = (i) => sessionId + "-" + i + "-" + (variants[vKey(i)] || 0);

  const tick = (i) => (setIdx, total) => {
    const cur = done[dKey(i)] || 0;
    const next = setIdx < cur ? setIdx : Math.min(setIdx + 1, total);
    setDone({ ...done, [dKey(i)]: next });
    if (next > cur) {
      const slot = session.slots[i];
      const v = slot.vars[variants[vKey(i)] || 0] || slot.vars[0];
      restLabelRef.current = v ? v.n : "";
      setRestLeft(rest); setRunning(true);
    }
  };

  const requestNotifPermission = () => {
    const p = ensureNotificationPermission();
    if (p && p.then) p.then(() => setNotifPerm(Notification.permission));
    else if (typeof Notification !== "undefined") setNotifPerm(Notification.permission);
  };

  const onPresetTap = () => {
    restLabelRef.current = "";
    requestNotifPermission();
  };

  const onRestCancel = () => clearRestNotification();

  const totalSets = session.slots.reduce((a, s) => a + (isDeload ? 2 : s.s), 0);
  const doneSets = session.slots.reduce((a, s, i) => a + Math.min(done[dKey(i)] || 0, isDeload ? 2 : s.s), 0);
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

  const tabs = [["train", "Train"], ["fuel", "Fuel"], ["off", "Off days"], ["rules", "Rules"]];

  return (
    <div style={{ ...BODY, background: "#14171C", minHeight: "100vh", color: "#E8EAED" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 40px" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <div style={{ ...FONT, fontSize: 12, letterSpacing: 2.6, color: "#8A919C", fontWeight: 600 }}>
              12-WEEK PROGRAM · 2-1-2-2 SPLIT
            </div>
            <div style={{ fontSize: 11, whiteSpace: "nowrap",
              color: storageOk ? "#47A96B" : storageOk === false ? "#D64545" : "#5B626C" }}>
              {storageOk === true
                ? (savedAt ? "saved " + savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " ✓" : "auto-save on ✓")
                : storageOk === false ? "auto-save off — see Rules" : "checking…"}
            </div>
          </div>
          <div style={{ ...FONT, fontSize: 31, fontWeight: 700, lineHeight: 1.05, marginTop: 3 }}>
            Mirror, not the bar.
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ ...FONT, flex: 1, padding: "9px 2px", fontSize: 13.5, fontWeight: 600,
                background: tab === id ? "#E8EAED" : "#1D2128", color: tab === id ? "#14171C" : "#8A919C",
                border: "none", borderRadius: 8, cursor: "pointer" }}>{label}</button>
          ))}
        </div>

        {tab === "train" && (
          <>
            <Timer color={session.color} rest={rest} setRest={setRest} restLeft={restLeft}
              setRestLeft={setRestLeft} running={running} setRunning={setRunning}
              elapsed={elapsed} setElapsed={setElapsed}
              keepAwake={keepAwake} setKeepAwake={setKeepAwake} wakeState={wakeState}
              notifPerm={notifPerm} onPresetTap={onPresetTap} onRestCancel={onRestCancel} />

            <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 8, marginBottom: 8 }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
                const dl = DELOAD_WEEKS.includes(w);
                const active = w === week;
                return (
                  <button key={w} onClick={() => setWeek(w)}
                    style={{ ...FONT, minWidth: 44, padding: "7px 0", borderRadius: 8, cursor: "pointer",
                      border: dl ? "1px dashed #8A919C" : "1px solid transparent",
                      background: active ? "#E8EAED" : "#1D2128",
                      color: active ? "#14171C" : dl ? "#B9BFC7" : "#8A919C",
                      fontSize: 14, fontWeight: 600, lineHeight: 1.1 }}>
                    W{w}{dl && <div style={{ fontSize: 9, letterSpacing: 0.8 }}>DELOAD</div>}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: 12, color: "#8A919C", marginBottom: 10 }}>{SCHEDULE_NOTE}</div>

            {isDeload && (
              <div style={{ background: "#1D2128", border: "1px dashed #8A919C", borderRadius: 10,
                padding: "10px 12px", fontSize: 13, color: "#B9BFC7", marginBottom: 12 }}>
                Deload week — <b style={{ color: "#E8EAED" }}>2 sets at 60%</b> everywhere (suggested kg shows on
                each card).
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
              {SESSIONS.map((s) => (
                <button key={s.id} onClick={() => setSessionId(s.id)}
                  style={{ ...FONT, padding: "9px 2px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                    fontWeight: 600, background: "#1D2128", color: sessionId === s.id ? "#E8EAED" : "#8A919C",
                    border: "none", borderBottom: "3px solid " + (sessionId === s.id ? s.color : "#1D2128") }}>
                  {s.name}
                </button>
              ))}
            </div>

            <div style={{ background: "#1D2128", borderRadius: 12, padding: "12px 14px", marginBottom: 10,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ ...FONT, fontSize: 22, fontWeight: 700, color: session.color, lineHeight: 1 }}>{session.name}</div>
                <div style={{ fontSize: 12, color: "#8A919C", marginTop: 4 }}>{session.sub}</div>
                <div style={{ ...FONT, fontSize: 14, color: "#B9BFC7", marginTop: 10, fontVariantNumeric: "tabular-nums" }}>
                  {doneSets}/{totalSets} sets done
                </div>
              </div>
              <MuscleMap highlight={session.muscles} color={session.color} />
            </div>

            <div style={{ fontSize: 11.5, color: "#5B626C", marginBottom: 8 }}>
              Swipe a card (or use ‹ ›) to switch exercise variation · drag the number up/down to set your weight.
            </div>

            {session.slots.map((slot, i) => (
              <ExCard key={sessionId + i} slot={slot} isDeload={isDeload}
                doneCount={Math.min(done[dKey(i)] || 0, isDeload ? 2 : slot.s)}
                onTick={tick(i)}
                variant={variants[vKey(i)] || 0}
                setVariant={(vi) => setVariants({ ...variants, [vKey(i)]: vi })}
                weight={weights[wKey(i)]}
                setWeight={(w) => setWeights({ ...weights, [wKey(i)]: w })}
                color={session.color} />
            ))}
            <div style={{ fontSize: 11.5, color: "#5B626C", textAlign: "center", marginTop: 10 }}>
              {storageOk ? "Progress saves automatically on this device." : "Auto-save isn't available here — copy your backup code in the Rules tab before closing."}
            </div>
          </>
        )}

        {tab === "fuel" && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {["bulk", "cut"].map((ph) => (
                <button key={ph} onClick={() => setPhase(ph)}
                  style={{ ...FONT, flex: 1, padding: "10px 0", fontSize: 15, fontWeight: 600, borderRadius: 8,
                    cursor: "pointer", border: "none", background: phase === ph ? "#E8EAED" : "#1D2128",
                    color: phase === ph ? "#14171C" : "#8A919C" }}>{NUTRITION[ph].label}</button>
              ))}
            </div>

            <div style={{ background: "#1D2128", borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ ...FONT, fontSize: 38, fontWeight: 700, lineHeight: 1 }}>
                {NUTRITION[phase].kcal}<span style={{ fontSize: 17, color: "#8A919C" }}> kcal/day</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
                {[["Protein", NUTRITION[phase].protein], ["Fat", NUTRITION[phase].fat], ["Carbs", NUTRITION[phase].carbs]].map(([l, v]) => (
                  <div key={l} style={{ background: "#14171C", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ ...FONT, fontSize: 18, fontWeight: 700 }}>{v}</div>
                    <div style={{ fontSize: 10.5, letterSpacing: 1.4, color: "#8A919C", textTransform: "uppercase" }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: "#B9BFC7", marginTop: 12 }}>{NUTRITION[phase].rate}</div>
              <div style={{ fontSize: 12.5, color: "#8A919C", marginTop: 4 }}>{NUTRITION[phase].adjust}</div>
            </div>

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
              <div style={{ background: "#1D2128", borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
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
                  style={{ ...FONT, marginTop: 10, padding: "7px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600,
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
              <div key={m.id || mi} style={{ background: "#1D2128", borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 10, padding: 10 }}>
                  {m.thumb && (
                    <img src={m.thumb} alt="" width="74" height="74"
                      style={{ borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "#14171C" }} />
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
                        display: "inline-block", marginTop: 5 }}>
                      full recipe ↗
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

        {tab === "off" && (
          <>
            <div style={{ background: "#1D2128", borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
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

            <div style={{ background: "#1D2128", borderRadius: 12, padding: "12px 14px", marginBottom: 14,
              fontSize: 13, color: "#B9BFC7", lineHeight: 1.55 }}>
              Off days = <b style={{ color: "#E8EAED" }}>calisthenics + this mobility list</b>. 2–3 rounds of
              pull-ups / push-ups / dips, always 2+ reps from failure — it's skill work, not a fourth workout.
            </div>
            <div style={{ ...FONT, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Mobility · ~12 min daily</div>
            {MOBILITY.map((m) => <Row key={m.n} item={m} />)}
            <div style={{ height: 16 }} />
            <div style={{ ...FONT, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Cardio finisher · gym days only</div>
            <div style={{ fontSize: 12.5, color: "#8A919C", marginBottom: 8 }}>
              Legs-only on purpose so arms/shoulders stay fresh for calisthenics. Do it after training, not on off days.
            </div>
            {FINISHERS.map((f) => <Row key={f.n} item={f} />)}
          </>
        )}

        {tab === "rules" && (
          <>
            {RULES.map(([t, d]) => (
              <div key={t} style={{ background: "#1D2128", borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
                <div style={{ ...FONT, fontSize: 16, fontWeight: 700 }}>{t}</div>
                <div style={{ fontSize: 13, color: "#B9BFC7", marginTop: 3, lineHeight: 1.5 }}>{d}</div>
              </div>
            ))}

            <div style={{ background: "#1D2128", borderRadius: 12, padding: "12px 14px", marginTop: 14 }}>
              <div style={{ ...FONT, fontSize: 16, fontWeight: 700 }}>Saved data</div>
              <div style={{ fontSize: 13, color: "#B9BFC7", marginTop: 3, lineHeight: 1.5, marginBottom: 10 }}>
                {storageOk
                  ? "Auto-save is working — weights, sets, variations, week, phase and food picks save automatically and reload when you reopen. The code below is just a backup for moving to another device."
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
                  borderRadius: 8, color: "#8A919C", fontSize: 11, padding: 8, resize: "none", boxSizing: "border-box" }} />
              <button onClick={copyBackup}
                style={{ ...FONT, marginTop: 8, padding: "9px 14px", borderRadius: 8, fontSize: 13.5, fontWeight: 600,
                  background: "#333945", border: "none", color: "#E8EAED", cursor: "pointer" }}>
                Copy code
              </button>
              {copyMsg && <span style={{ fontSize: 12.5, color: "#47A96B", marginLeft: 10 }}>{copyMsg}</span>}

              <div style={{ height: 1, background: "#262B33", margin: "14px 0" }} />

              <div style={{ fontSize: 12, color: "#8A919C", marginBottom: 4 }}>Restore from a code</div>
              <textarea value={pasteCode} onChange={(e) => setPasteCode(e.target.value)}
                placeholder="Paste a backup code here…"
                style={{ width: "100%", height: 56, background: "#14171C", border: "1px solid #333945",
                  borderRadius: 8, color: "#E8EAED", fontSize: 11, padding: 8, resize: "none", boxSizing: "border-box" }} />
              <button onClick={restoreFromCode} disabled={!pasteCode.trim()}
                style={{ ...FONT, marginTop: 8, padding: "9px 14px", borderRadius: 8, fontSize: 13.5, fontWeight: 600,
                  background: pasteCode.trim() ? "#47A96B" : "#333945", border: "none",
                  color: pasteCode.trim() ? "#14171C" : "#8A919C", cursor: pasteCode.trim() ? "pointer" : "default" }}>
                Restore
              </button>
              {restoreMsg && <span style={{ fontSize: 12.5, color: "#B9BFC7", marginLeft: 10 }}>{restoreMsg}</span>}

              <button onClick={() => {
                setDone({}); setWeights({}); setVariants({}); setFoods({}); setBought({}); setMeals([]);
                setWeek(1); setPhase("bulk");
                try { localStorage.removeItem(STORE_KEY); } catch (e) { /* nothing stored */ }
              }}
                style={{ ...FONT, marginTop: 16, padding: "9px 14px", borderRadius: 8, fontSize: 13,
                  fontWeight: 600, background: "transparent", border: "1px solid #D64545", color: "#D64545",
                  cursor: "pointer", display: "block" }}>
                Wipe all data
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ item }) {
  return (
    <div style={{ background: "#1D2128", borderRadius: 10, padding: "10px 14px", marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{item.n}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", whiteSpace: "nowrap" }}>
          <div style={{ ...FONT, fontSize: 13, color: "#8A919C" }}>{item.d}</div>
          <a href={imgLink(item.q)} target="_blank" rel="noreferrer"
            style={{ fontSize: 12, color: "#7FA8D9", textDecoration: "none", fontWeight: 600 }}>form ↗</a>
        </div>
      </div>
      {item.note && <div style={{ fontSize: 12, color: "#5B626C", marginTop: 2 }}>{item.note}</div>}
    </div>
  );
}

function MuscleMap({ highlight, color }) {
  const BASE = "#262B33", DIM = "#333945";
  const on = (m) => (highlight.includes(m) ? color : DIM);
  return (
    <svg viewBox="0 0 200 152" width="146" height="111" aria-label="Muscles targeted">
      <circle cx="50" cy="12" r="8" fill={BASE} />
      <rect x="32" y="23" width="36" height="50" rx="10" fill={BASE} />
      <rect x="20" y="27" width="9" height="46" rx="4.5" fill={BASE} />
      <rect x="71" y="27" width="9" height="46" rx="4.5" fill={BASE} />
      <rect x="35" y="74" width="13" height="62" rx="6" fill={BASE} />
      <rect x="52" y="74" width="13" height="62" rx="6" fill={BASE} />
      <circle cx="27" cy="29" r="6" fill={on("delts")} />
      <circle cx="73" cy="29" r="6" fill={on("delts")} />
      <ellipse cx="42" cy="34" rx="8" ry="6" fill={on("chest")} />
      <ellipse cx="58" cy="34" rx="8" ry="6" fill={on("chest")} />
      <rect x="21" y="38" width="7" height="13" rx="3.5" fill={on("biceps")} />
      <rect x="72" y="38" width="7" height="13" rx="3.5" fill={on("biceps")} />
      <rect x="21" y="55" width="7" height="15" rx="3.5" fill={on("forearms")} />
      <rect x="72" y="55" width="7" height="15" rx="3.5" fill={on("forearms")} />
      <rect x="43" y="44" width="14" height="24" rx="4" fill={on("abs")} />
      <rect x="37" y="78" width="9" height="28" rx="4" fill={on("quads")} />
      <rect x="54" y="78" width="9" height="28" rx="4" fill={on("quads")} />
      <rect x="38" y="112" width="7" height="18" rx="3.5" fill={on("calvesF")} />
      <rect x="55" y="112" width="7" height="18" rx="3.5" fill={on("calvesF")} />
      <text x="50" y="148" textAnchor="middle" fontSize="9" fill="#5B626C" fontFamily="system-ui">FRONT</text>
      <circle cx="150" cy="12" r="8" fill={BASE} />
      <rect x="132" y="23" width="36" height="50" rx="10" fill={BASE} />
      <rect x="120" y="27" width="9" height="46" rx="4.5" fill={BASE} />
      <rect x="171" y="27" width="9" height="46" rx="4.5" fill={BASE} />
      <rect x="135" y="74" width="13" height="62" rx="6" fill={BASE} />
      <rect x="152" y="74" width="13" height="62" rx="6" fill={BASE} />
      <ellipse cx="150" cy="26" rx="12" ry="5" fill={on("traps")} />
      <ellipse cx="141" cy="42" rx="7" ry="12" fill={on("lats")} />
      <ellipse cx="159" cy="42" rx="7" ry="12" fill={on("lats")} />
      <rect x="121" y="38" width="7" height="14" rx="3.5" fill={on("triceps")} />
      <rect x="172" y="38" width="7" height="14" rx="3.5" fill={on("triceps")} />
      <ellipse cx="143.5" cy="80" rx="7" ry="7" fill={on("glutes")} />
      <ellipse cx="156.5" cy="80" rx="7" ry="7" fill={on("glutes")} />
      <rect x="137" y="90" width="9" height="22" rx="4" fill={on("hams")} />
      <rect x="154" y="90" width="9" height="22" rx="4" fill={on("hams")} />
      <rect x="138" y="116" width="7" height="16" rx="3.5" fill={on("calvesB")} />
      <rect x="155" y="116" width="7" height="16" rx="3.5" fill={on("calvesB")} />
      <text x="150" y="148" textAnchor="middle" fontSize="9" fill="#5B626C" fontFamily="system-ui">BACK</text>
    </svg>
  );
}
