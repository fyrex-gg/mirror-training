import { useState, useEffect, useMemo } from "react";
import { TrendingUp, Flame, Target, Search, ChevronLeft } from "lucide-react";
import { getAllWorkouts } from "../db/workoutDB.js";
import {
  workoutVolume,
  workoutSetCount,
  workoutDurationSec,
  estimatedOneRepMax,
  exerciseHistory,
  bestBeforeByExercise,
  monthKey,
  monthLabel,
  currentStreak,
} from "../workout/workoutStats.js";
import {
  BG,
  SURFACE,
  SURFACE_ELEVATED,
  SURFACE_INTERACTIVE,
  BORDER,
  CARD_BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  ACCENT,
  ACCENT_SOFT,
  RADIUS_LG,
  RADIUS_MD,
  SPACE,
  TYPE,
  BODY,
} from "../tokens.js";

// ---------- Small formatting helpers ----------

function formatNumber(n) {
  return Math.round(n || 0).toLocaleString();
}

function formatDuration(totalSec) {
  const totalMin = Math.round((totalSec || 0) / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return m + "m";
  return h + "h " + m + "m";
}

function formatShortDate(ts) {
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

// PRs within a single workout compared against everything strictly before it —
// mirrors detectPRs' own definition, computed inline since we're walking every
// workout once anyway to build both the all-time and this-month counts.
function countPRs(workout, allWorkouts) {
  const before = bestBeforeByExercise(allWorkouts, workout.startedAt);
  let count = 0;
  for (const ex of workout.exercises || []) {
    let bestInSession = null;
    for (const s of ex.sets || []) {
      if (!s.weight || !s.reps) continue;
      const e1rm = estimatedOneRepMax(s.weight, s.reps);
      if (!bestInSession || e1rm > bestInSession) bestInSession = e1rm;
    }
    if (bestInSession == null) continue;
    const prior = before.get(ex.exerciseName);
    if (!prior || bestInSession > prior.bestE1RM) count++;
  }
  return count;
}

// ---------- Hand-drawn SVG charts (no library, same spirit as App.jsx's muscle diagram) ----------

function VolumeBarChart({ buckets }) {
  const W = 320;
  const H = 108;
  const PAD = 4;
  const BASE_Y = H - 16;
  const max = Math.max(1, ...buckets.map((b) => b.volume));
  const gap = 5;
  const barWidth = (W - PAD * 2 - gap * (buckets.length - 1)) / buckets.length;

  return (
    <svg viewBox={"0 0 " + W + " " + H} width="100%" height={H} preserveAspectRatio="none"
      style={{ display: "block" }}>
      <line x1={PAD} y1={BASE_Y} x2={W - PAD} y2={BASE_Y} stroke={BORDER} strokeWidth={1} />
      {buckets.map((b, i) => {
        const barH = (b.volume / max) * (BASE_Y - 12);
        const x = PAD + i * (barWidth + gap);
        const y = BASE_Y - barH;
        return (
          <rect key={i} x={x} y={y} width={barWidth} height={Math.max(barH, 1)} rx={2}
            fill={ACCENT} opacity={b.volume > 0 ? 0.9 : 0.14} />
        );
      })}
    </svg>
  );
}

function TrendLineChart({ points }) {
  const W = 320;
  const H = 92;
  const PAD = 8;

  if (points.length < 2) {
    return (
      <div style={{ ...TYPE.secondary, color: TEXT_TERTIARY, padding: SPACE.md + "px 0" }}>
        Not enough sets logged yet to chart a trend.
      </div>
    );
  }

  const values = points.map((p) => p.e1rm);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (W - PAD * 2) / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = PAD + i * stepX;
    const y = PAD + (1 - (p.e1rm - min) / range) * (H - PAD * 2);
    return [x, y];
  });

  const linePath = coords
    .map((c, i) => (i === 0 ? "M" : "L") + c[0].toFixed(1) + " " + c[1].toFixed(1))
    .join(" ");
  const areaPath =
    linePath +
    " L " + coords[coords.length - 1][0].toFixed(1) + " " + (H - PAD) +
    " L " + coords[0][0].toFixed(1) + " " + (H - PAD) + " Z";

  return (
    <svg viewBox={"0 0 " + W + " " + H} width="100%" height={H} preserveAspectRatio="none"
      style={{ display: "block" }}>
      <path d={areaPath} fill={ACCENT_SOFT} stroke="none" />
      <path d={linePath} fill="none" stroke={ACCENT} strokeWidth={2}
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ---------- Small presentational pieces ----------

function MetricCard({ label, value, accent }) {
  return (
    <div style={{ background: SURFACE, border: CARD_BORDER, borderRadius: RADIUS_LG,
      padding: SPACE.lg, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <div style={{ ...TYPE.metricLarge, color: accent ? ACCENT : TEXT_PRIMARY, whiteSpace: "nowrap",
        overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
      </div>
      <div style={{ ...TYPE.meta, color: TEXT_TERTIARY }}>{label}</div>
    </div>
  );
}

function SectionHeading({ icon, children, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: SPACE.md }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {icon}
        <div style={{ ...TYPE.sectionTitle, color: TEXT_PRIMARY }}>{children}</div>
      </div>
      {right}
    </div>
  );
}

// ---------- Consistency grid (GitHub-contribution style, day-based) ----------

const CONSISTENCY_WEEKS = 12;
const CELL = 15;

function ConsistencyGrid({ completed }) {
  const totalDays = CONSISTENCY_WEEKS * 7;

  const trainedDates = useMemo(() => {
    const set = new Set();
    for (const w of completed) set.add(new Date(w.completedAt).toDateString());
    return set;
  }, [completed]);

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const list = [];
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      list.push(d);
    }
    return list;
  }, [totalDays]);

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  let lastMonth = null;

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 3, width: "max-content" }}>
        {weeks.map((week, wi) => {
          const firstMonth = week[0].getMonth();
          const showLabel = wi === 0 || firstMonth !== lastMonth;
          lastMonth = firstMonth;
          return (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ ...TYPE.meta, color: TEXT_TERTIARY, fontSize: 9.5, height: 12,
                textTransform: "none", letterSpacing: 0 }}>
                {showLabel ? week[0].toLocaleDateString([], { month: "short" }) : ""}
              </div>
              {week.map((d, di) => {
                const trained = trainedDates.has(d.toDateString());
                return (
                  <div key={di} title={d.toLocaleDateString()}
                    style={{ width: CELL, height: CELL, borderRadius: 4,
                      background: trained ? ACCENT : SURFACE_INTERACTIVE,
                      border: trained ? "none" : "1px solid " + BORDER,
                      boxSizing: "border-box" }} />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Exercise history drill-down ----------

function ExerciseList({ names, workouts, onSelect }) {
  const [search, setSearch] = useState("");
  const filtered = names.filter((n) => n.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: SURFACE_ELEVATED,
        border: CARD_BORDER, borderRadius: RADIUS_MD, padding: SPACE.sm + "px " + SPACE.md + "px",
        marginBottom: SPACE.md }}>
        <Search size={16} color={TEXT_TERTIARY} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises"
          style={{ ...BODY, flex: 1, background: "transparent", border: "none", outline: "none",
            color: TEXT_PRIMARY, fontSize: 14 }}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ ...TYPE.secondary, color: TEXT_TERTIARY, padding: SPACE.md }}>
          No exercises match "{search}".
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: SPACE.xs, maxHeight: 340,
          overflowY: "auto" }}>
          {filtered.map((name) => (
            <button key={name} onClick={() => onSelect(name)}
              style={{ ...BODY, textAlign: "left", background: SURFACE, border: CARD_BORDER,
                borderRadius: RADIUS_MD, padding: SPACE.md, color: TEXT_PRIMARY, fontSize: 14,
                fontWeight: 600, cursor: "pointer" }}>
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseDetail({ name, workouts, onBack }) {
  const history = useMemo(() => exerciseHistory(workouts, name), [workouts, name]);

  const currentE1RM = useMemo(() => {
    if (history.length === 0) return 0;
    const mostRecentDate = history[history.length - 1].date;
    const rows = history.filter((r) => r.date === mostRecentDate);
    return Math.max(...rows.map((r) => r.e1rm));
  }, [history]);

  const bestWeight = history.length ? Math.max(...history.map((r) => r.weight)) : 0;
  const bestReps = history.length ? Math.max(...history.map((r) => r.reps)) : 0;
  const totalVolume = history.reduce((a, r) => a + r.weight * r.reps, 0);

  const sessions = useMemo(() => {
    const byDate = new Map();
    for (const r of history) {
      if (!byDate.has(r.date)) byDate.set(r.date, []);
      byDate.get(r.date).push(r);
    }
    return Array.from(byDate.entries()).sort((a, b) => b[0] - a[0]);
  }, [history]);

  return (
    <div>
      <button onClick={onBack}
        style={{ ...BODY, display: "flex", alignItems: "center", gap: 4, background: "transparent",
          border: "none", color: TEXT_SECONDARY, fontSize: 14, fontWeight: 600, cursor: "pointer",
          padding: 0, marginBottom: SPACE.lg }}>
        <ChevronLeft size={18} />
        Exercises
      </button>

      <div style={{ ...TYPE.sectionTitle, color: TEXT_PRIMARY, marginBottom: SPACE.lg }}>{name}</div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
        <TrendingUp size={18} color={ACCENT} />
        <div style={{ ...TYPE.metricLarge, color: ACCENT }}>{formatNumber(currentE1RM)}</div>
        <div style={{ ...TYPE.secondary, color: TEXT_TERTIARY }}>kg est. 1RM</div>
      </div>

      <div style={{ marginTop: SPACE.lg, marginBottom: SPACE.lg }}>
        <TrendLineChart points={history} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: SPACE.sm,
        marginBottom: SPACE.xl }}>
        <MetricCard label="Best weight" value={formatNumber(bestWeight)} />
        <MetricCard label="Best reps" value={formatNumber(bestReps)} />
        <MetricCard label="Total volume" value={formatNumber(totalVolume)} />
      </div>

      <div style={{ ...TYPE.sectionTitle, fontSize: 15, color: TEXT_PRIMARY, marginBottom: SPACE.sm }}>
        Recent sessions
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: SPACE.xs }}>
        {sessions.slice(0, 10).map(([date, rows]) => (
          <div key={date} style={{ background: SURFACE, border: CARD_BORDER, borderRadius: RADIUS_MD,
            padding: SPACE.md, display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ ...TYPE.meta, color: TEXT_TERTIARY }}>{formatShortDate(date)}</div>
            <div style={{ ...TYPE.value, color: TEXT_PRIMARY, fontSize: 14 }}>
              {rows.map((r) => r.weight + " × " + r.reps).join("  /  ")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Main screen ----------

export default function StatsScreen() {
  const [workouts, setWorkouts] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getAllWorkouts().then((all) => {
      if (!cancelled) setWorkouts(all);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const completed = useMemo(
    () => (workouts || []).filter((w) => w.completedAt).sort((a, b) => a.completedAt - b.completedAt),
    [workouts]
  );

  const thisMonthKey = monthKey(Date.now());

  const monthStats = useMemo(() => {
    const monthWorkouts = completed.filter((w) => monthKey(w.completedAt) === thisMonthKey);
    return {
      count: monthWorkouts.length,
      sets: monthWorkouts.reduce((a, w) => a + workoutSetCount(w), 0),
      volume: monthWorkouts.reduce((a, w) => a + workoutVolume(w), 0),
      seconds: monthWorkouts.reduce((a, w) => a + workoutDurationSec(w), 0),
    };
  }, [completed, thisMonthKey]);

  const volumeBuckets = useMemo(() => {
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const WEEKS_SHOWN = 10;
    const now = Date.now();
    return Array.from({ length: WEEKS_SHOWN }, (_, i) => {
      const end = now - (WEEKS_SHOWN - 1 - i) * WEEK_MS;
      const start = end - WEEK_MS;
      const volume = completed
        .filter((w) => w.completedAt >= start && w.completedAt < end)
        .reduce((a, w) => a + workoutVolume(w), 0);
      return { start, end, volume };
    });
  }, [completed]);

  const prStats = useMemo(() => {
    let total = 0;
    let month = 0;
    for (const w of completed) {
      const n = countPRs(w, workouts || []);
      total += n;
      if (monthKey(w.completedAt) === thisMonthKey) month += n;
    }
    return { total, month };
  }, [completed, workouts, thisMonthKey]);

  const exerciseNames = useMemo(() => {
    const set = new Set();
    for (const w of completed) {
      for (const ex of w.exercises || []) {
        if (ex.exerciseName) set.add(ex.exerciseName);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [completed]);

  const streak = useMemo(() => currentStreak(workouts || []), [workouts]);

  if (workouts === null) {
    return (
      <div style={{ background: BG, minHeight: "100%", padding: SPACE.xl }}>
        <div style={{ ...TYPE.secondary, color: TEXT_TERTIARY }}>Loading stats…</div>
      </div>
    );
  }

  if (completed.length === 0) {
    return (
      <div style={{ background: BG, minHeight: "100%", padding: SPACE.xl }}>
        <div style={{ ...TYPE.screenTitle, color: TEXT_PRIMARY, marginBottom: SPACE.lg }}>Stats</div>
        <div style={{ ...TYPE.sectionTitle, color: TEXT_PRIMARY, marginBottom: SPACE.sm }}>
          NO HISTORY
        </div>
        <div style={{ ...TYPE.secondary, color: TEXT_TERTIARY }}>
          Finish a workout and your monthly totals, volume trend, and personal records will show up here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: "100%", padding: SPACE.xl, ...BODY }}>
      <div style={{ ...TYPE.screenTitle, color: TEXT_PRIMARY, marginBottom: SPACE.xxl }}>Stats</div>

      {/* This month */}
      <div style={{ marginBottom: SPACE.xxl }}>
        <SectionHeading right={<div style={{ ...TYPE.meta, color: TEXT_TERTIARY }}>{monthLabel(thisMonthKey)}</div>}>
          This month
        </SectionHeading>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: SPACE.sm }}>
          <MetricCard label="Workouts" value={formatNumber(monthStats.count)} />
          <MetricCard label="Sets" value={formatNumber(monthStats.sets)} />
          <MetricCard label="Volume (kg)" value={formatNumber(monthStats.volume)} />
          <MetricCard label="Training time" value={formatDuration(monthStats.seconds)} />
        </div>
      </div>

      {/* Volume trend */}
      <div style={{ marginBottom: SPACE.xxl, background: SURFACE, border: CARD_BORDER,
        borderRadius: RADIUS_LG, padding: SPACE.lg }}>
        <SectionHeading icon={<TrendingUp size={17} color={TEXT_SECONDARY} />}>
          Volume, last {volumeBuckets.length} weeks
        </SectionHeading>
        <VolumeBarChart buckets={volumeBuckets} />
      </div>

      {/* Consistency */}
      <div style={{ marginBottom: SPACE.xxl, background: SURFACE, border: CARD_BORDER,
        borderRadius: RADIUS_LG, padding: SPACE.lg }}>
        <SectionHeading
          icon={<Target size={17} color={TEXT_SECONDARY} />}
          right={streak > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4, ...TYPE.meta, color: ACCENT }}>
              <Flame size={14} color={ACCENT} />
              {streak}-day streak
            </div>
          ) : null}
        >
          Consistency
        </SectionHeading>
        <ConsistencyGrid completed={completed} />
      </div>

      {/* Personal records */}
      <div style={{ marginBottom: SPACE.xxl, display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
        gap: SPACE.sm }}>
        <MetricCard label="PRs this month" value={formatNumber(prStats.month)} accent />
        <MetricCard label="PRs all-time" value={formatNumber(prStats.total)} accent />
      </div>

      {/* Exercise history */}
      <div>
        <SectionHeading>Exercise history</SectionHeading>
        {selectedExercise ? (
          <ExerciseDetail name={selectedExercise} workouts={workouts} onBack={() => setSelectedExercise(null)} />
        ) : (
          <ExerciseList names={exerciseNames} workouts={workouts} onSelect={setSelectedExercise} />
        )}
      </div>
    </div>
  );
}
