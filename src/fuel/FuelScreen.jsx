import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import FoodLog from "../FoodLog.jsx";
import BodyWeightLog from "../BodyWeightLog.jsx";
import {
  FONT,
  BODY,
  SURFACE,
  SURFACE_ELEVATED,
  CARD_BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  RADIUS_MD,
  RADIUS_LG,
  SPACE,
  TOUCH_MIN,
} from "../tokens.js";

// ---------- Reassembled-from-App.jsx constants (kept local — this file is self-contained by design) ----------
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

// Original App.jsx card visuals (macro card / food picker / shopping list / meal ideas) use this
// slightly softer border than tokens.CARD_BORDER — kept exact so nothing already shipped shifts.
// New pieces (trend chart, quick-add row) use the imported tokens.CARD_BORDER instead.
const LEGACY_CARD_BORDER = "1px solid rgba(255,255,255,0.055)";

const parseNum = (s) => Number(String(s).replace(/[^\d.]/g, "")) || 0;
const round = (n) => Math.round((n || 0) * 10) / 10;
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

function genId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now() + "-" + Math.random().toString(36).slice(2);
}

// ---------- New: hand-drawn SVG weekly kcal bar chart (same minimal convention as StatsScreen's VolumeBarChart) ----------
function WeekTrendChart({ days, target, color }) {
  const W = 320, H = 108, PAD = 4, BASE_Y = H - 20;
  const max = Math.max(1, target || 0, ...days.map((d) => d.kcal));
  const gap = 6;
  const barWidth = (W - PAD * 2 - gap * (days.length - 1)) / days.length;
  const targetY = target > 0 && target <= max ? BASE_Y - (target / max) * (BASE_Y - 12) : null;

  return (
    <svg viewBox={"0 0 " + W + " " + H} width="100%" height={H} preserveAspectRatio="none"
      style={{ display: "block" }} aria-label="Daily calories, last 7 days">
      {targetY != null && (
        <line x1={PAD} y1={targetY} x2={W - PAD} y2={targetY} stroke={color} strokeOpacity={0.35}
          strokeWidth={1} strokeDasharray="3,3" />
      )}
      {days.map((d, i) => {
        const barH = d.kcal > 0 ? Math.max((d.kcal / max) * (BASE_Y - 12), 2) : 0;
        const x = PAD + i * (barWidth + gap);
        const y = BASE_Y - barH;
        return (
          <g key={d.key}>
            <rect x={x} y={y} width={barWidth} height={Math.max(barH, 1)} rx={2}
              fill={color} opacity={d.kcal > 0 ? 0.9 : 0.14} />
            <text x={x + barWidth / 2} y={H - 6} textAnchor="middle" fontSize="9"
              fill={TEXT_TERTIARY} fontFamily="system-ui">
              {DOW[d.date.getDay()]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function FuelScreen({
  phase, setPhase,
  foodLog, setFoodLog,
  bodyWeight, setBodyWeight,
  foods, setFoods,
  bought, setBought,
  meals, mealLoading, mealErr, onGenMeals,
  color,
}) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayEntries = foodLog[todayKey] || [];
  const setTodayEntries = (next) => setFoodLog({ ...foodLog, [todayKey]: next });

  const targets = {
    kcal: parseNum(NUTRITION[phase].kcal),
    protein: parseNum(NUTRITION[phase].protein),
    fat: parseNum(NUTRITION[phase].fat),
    carbs: parseNum(NUTRITION[phase].carbs),
  };

  const selectedFoods = Object.keys(foods).filter((k) => foods[k]);

  // ---------- New: this-week kcal totals for the trend chart ----------
  const weekDays = useMemo(() => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entries = foodLog[key] || [];
      const kcal = entries.reduce((sum, e) => {
        const per100 = e && e.per100;
        if (!per100) return sum;
        return sum + (per100.kcal || 0) * ((e.qty || 0) / 100);
      }, 0);
      list.push({ key, date: d, kcal });
    }
    return list;
  }, [foodLog]);

  // ---------- New: quick-add chips ranked by how often each food has been logged ----------
  const quickAddFoods = useMemo(() => {
    const byName = {};
    const dateKeys = Object.keys(foodLog).sort();
    dateKeys.forEach((dk) => {
      (foodLog[dk] || []).forEach((e) => {
        if (!e || !e.name || !e.per100) return;
        if (!byName[e.name]) byName[e.name] = { name: e.name, per100: e.per100, count: 0 };
        byName[e.name].count += 1;
        byName[e.name].per100 = e.per100; // dateKeys sorted ascending — last write wins, so this stays the most recent value
      });
    });
    return Object.values(byName).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [foodLog]);

  function addQuickFood(item) {
    setTodayEntries([...todayEntries, { id: genId(), name: item.name, per100: item.per100, qty: 100 }]);
  }

  return (
    <div style={BODY}>
      {/* ---------- Phase toggle ---------- */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {["bulk", "cut"].map((ph) => (
          <button key={ph} onClick={() => setPhase(ph)}
            style={{ ...FONT, flex: 1, padding: "10px 0", fontSize: 15, fontWeight: 600, borderRadius: 10,
              cursor: "pointer", border: "none", background: phase === ph ? "#E8EAED" : "#1D2128",
              color: phase === ph ? "#14171C" : "#8A919C" }}>{NUTRITION[ph].label}</button>
        ))}
      </div>

      {/* ---------- Macro targets ---------- */}
      <div style={{ background: "#1D2128", border: LEGACY_CARD_BORDER, borderRadius: 14, padding: 16, marginBottom: 14 }}>
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

      {/* ---------- New: this week's kcal trend ---------- */}
      <div style={{ background: SURFACE, border: CARD_BORDER, borderRadius: RADIUS_LG, padding: SPACE.lg, marginBottom: 14 }}>
        <div style={{ ...FONT, fontSize: 13, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 2 }}>This week</div>
        <div style={{ fontSize: 11.5, color: TEXT_TERTIARY, marginBottom: 8 }}>
          Daily calories, last 7 days{targets.kcal > 0 ? " — dashed line is your target" : ""}
        </div>
        <WeekTrendChart days={weekDays} target={targets.kcal} color={color} />
      </div>

      {/* ---------- Body weight ---------- */}
      <div style={{ marginBottom: 14 }}>
        <BodyWeightLog entries={bodyWeight} setEntries={setBodyWeight} color={color} />
      </div>

      {/* ---------- New: quick-add recent/frequent foods ---------- */}
      {quickAddFoods.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...FONT, fontSize: 13, fontWeight: 700, color: TEXT_SECONDARY, marginBottom: 8 }}>Quick add</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {quickAddFoods.map((item) => (
              <button key={item.name} onClick={() => addQuickFood(item)}
                style={{ ...BODY, minHeight: TOUCH_MIN, padding: "0 14px", borderRadius: RADIUS_MD, fontSize: 13,
                  fontWeight: 600, cursor: "pointer", border: CARD_BORDER,
                  background: SURFACE_ELEVATED, color: TEXT_PRIMARY, display: "flex", alignItems: "center" }}>
                {item.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Search + log + today's totals (existing component, embedded as-is) ---------- */}
      <FoodLog log={todayEntries} setLog={setTodayEntries} targets={targets} color={color} />

      <div style={{ height: 1, background: "#262B33", margin: "18px 0 16px" }} />

      {/* ---------- Your foods ---------- */}
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
                  border: "1px solid " + (foods[f] ? color : "#333945"),
                  background: foods[f] ? "rgba(71,169,107,0.15)" : "#1D2128",
                  color: foods[f] ? "#8FD6AC" : "#B9BFC7", fontWeight: 500 }}>{f}</button>
            ))}
          </div>
        </div>
      ))}

      {/* ---------- Shopping list ---------- */}
      <div style={{ ...FONT, fontSize: 18, fontWeight: 700, margin: "16px 0 4px" }}>Shopping list</div>
      {selectedFoods.length === 0 ? (
        <div style={{ fontSize: 13, color: "#5B626C", marginBottom: 14 }}>Pick foods above to build the list.</div>
      ) : (
        <div style={{ background: "#1D2128", border: LEGACY_CARD_BORDER, borderRadius: 14, padding: "10px 14px", marginBottom: 14 }}>
          {selectedFoods.map((f) => (
            <div key={f} onClick={() => setBought({ ...bought, [f]: !bought[f] })}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", cursor: "pointer",
                borderBottom: "1px solid #262B33" }}>
              <div style={{ width: 17, height: 17, borderRadius: 5, flexShrink: 0,
                border: "2px solid " + (bought[f] ? color : "#3A404A"),
                background: bought[f] ? color : "transparent" }} />
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

      {/* ---------- Meal ideas ---------- */}
      <div style={{ ...FONT, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Meal ideas</div>
      <div style={{ fontSize: 12.5, color: "#8A919C", marginBottom: 10 }}>
        Searches TheMealDB for real recipes using the foods you picked. Ranked by how many of your ingredients each one uses. Tap a recipe for the full method.
      </div>
      <button onClick={onGenMeals} disabled={mealLoading || selectedFoods.length < 2}
        style={{ ...FONT, width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
          fontSize: 15, fontWeight: 700, cursor: mealLoading || selectedFoods.length < 2 ? "default" : "pointer",
          background: mealLoading || selectedFoods.length < 2 ? "#333945" : color,
          color: mealLoading || selectedFoods.length < 2 ? "#8A919C" : "#14171C", marginBottom: 10 }}>
        {mealLoading ? "Searching recipes…" : selectedFoods.length < 2 ? "Select at least 2 foods first" : "Find recipes with my foods"}
      </button>
      {mealErr && <div style={{ fontSize: 13, color: "#D64545", marginBottom: 10 }}>{mealErr}</div>}
      {meals.map((m, mi) => (
        <div key={m.id || mi} style={{ background: "#1D2128", border: LEGACY_CARD_BORDER, borderRadius: 14, overflow: "hidden", marginBottom: 8 }}>
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
    </div>
  );
}
