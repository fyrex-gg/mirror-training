import { ExternalLink, Info, Flame } from "lucide-react";
import EXERCISE_INFO from "../data/exerciseInfo.json";
import {
  FONT,
  BODY,
  SURFACE,
  SURFACE_ELEVATED,
  CARD_BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  ACCENT,
  ACCENT_SOFT,
  ACCENT_INK,
  RADIUS_MD,
  RADIUS_LG,
  SPACE,
  TOUCH_MIN,
} from "../tokens.js";

// ---------- Content (reassembled from App.jsx's old "off" moreTab block —
// same copy, same data, just relocated + restyled with the shared tokens).

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

const imgLink = (q) => "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(q);

// ---------- Streak helpers (date-map version of the "count consecutive days
// backward from today" pattern used by workout/workoutStats.js#currentStreak —
// rewritten locally since that one is keyed to workout completion timestamps,
// not a plain { "YYYY-MM-DD": true } map).

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function currentOffDayStreak(log) {
  let streak = 0;
  const cursor = new Date();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!log[key]) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ---------- Row — restyled with shared tokens; behavior (in-app guide vs
// external Google Images fallback) matches App.jsx's existing Row exactly.

function OffRow({ item, onOpenExercise, color }) {
  const hasGuide = !!EXERCISE_INFO[item.n];
  return (
    <div
      style={{
        background: SURFACE,
        border: CARD_BORDER,
        borderRadius: RADIUS_MD,
        padding: "10px 14px",
        marginBottom: SPACE.xs + 2,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{ ...BODY, fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY }}>{item.n}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", whiteSpace: "nowrap" }}>
          <div style={{ ...FONT, fontSize: 13, color: TEXT_SECONDARY }}>{item.d}</div>
          {hasGuide ? (
            <button
              onClick={() => onOpenExercise(item.n, color)}
              style={{
                fontSize: 12,
                color,
                background: "transparent",
                border: "none",
                padding: 0,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              guide <Info size={11} />
            </button>
          ) : (
            <a
              href={imgLink(item.q)}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: 12,
                color,
                textDecoration: "none",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              form <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
      {item.note && <div style={{ ...BODY, fontSize: 12, color: TEXT_TERTIARY, marginTop: 2 }}>{item.note}</div>}
    </div>
  );
}

export default function OffDaysScreen({ offDayLog, setOffDayLog, onOpenExercise, color }) {
  const log = offDayLog || {};
  const key = todayKey();
  const doneToday = !!log[key];
  const streak = currentOffDayStreak(log);

  const toggleToday = () => {
    const next = { ...log };
    if (next[key]) delete next[key];
    else next[key] = true;
    setOffDayLog(next);
  };

  return (
    <>
      {/* Mark today done + streak — the one new bit, kept as a calm, compact
          badge/row rather than a dashboard-style hero. */}
      <div
        style={{
          background: SURFACE_ELEVATED,
          border: CARD_BORDER,
          borderRadius: RADIUS_LG,
          padding: `${SPACE.md}px ${SPACE.lg}px`,
          marginBottom: SPACE.md,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: SPACE.md,
        }}
      >
        <div>
          <div style={{ ...FONT, fontSize: 16, fontWeight: 700, color: TEXT_PRIMARY }}>Today's off-day routine</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Flame size={14} color={streak > 0 ? ACCENT : TEXT_TERTIARY} fill={streak > 0 ? ACCENT : "none"} />
            <div style={{ ...BODY, fontSize: 13, color: TEXT_SECONDARY }}>
              {streak > 0 ? `${streak} day${streak === 1 ? "" : "s"} in a row` : "No streak yet"}
            </div>
          </div>
        </div>
        <button
          onClick={toggleToday}
          role="button"
          aria-pressed={doneToday}
          style={{
            ...FONT,
            minWidth: TOUCH_MIN,
            minHeight: TOUCH_MIN,
            padding: "0 18px",
            borderRadius: RADIUS_MD,
            border: doneToday ? "1px solid transparent" : CARD_BORDER,
            background: doneToday ? ACCENT : ACCENT_SOFT,
            color: doneToday ? ACCENT_INK : ACCENT,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {doneToday ? "Done ✓" : "Mark done"}
        </button>
      </div>

      {/* Pelvic floor — unchanged content, restyled with shared tokens. */}
      <div
        style={{
          background: SURFACE,
          border: CARD_BORDER,
          borderRadius: RADIUS_LG,
          padding: "12px 14px",
          marginBottom: 10,
        }}
      >
        <div style={{ ...FONT, fontSize: 18, fontWeight: 700, marginBottom: 4, color: TEXT_PRIMARY }}>
          Pelvic floor · daily, every day
        </div>
        <div style={{ ...BODY, fontSize: 12, color: TEXT_SECONDARY, marginBottom: 8 }}>{PELVIC.freq}</div>
        {PELVIC.steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <div style={{ ...BODY, fontSize: 13, color: TEXT_TERTIARY, flexShrink: 0 }}>{i + 1}.</div>
            <div style={{ ...BODY, fontSize: 13, color: TEXT_SECONDARY, lineHeight: 1.5 }}>{s}</div>
          </div>
        ))}
        <div style={{ ...BODY, fontSize: 12, color: TEXT_SECONDARY, marginTop: 6, lineHeight: 1.5, fontStyle: "italic" }}>
          {PELVIC.note}
        </div>
      </div>

      <div
        style={{
          background: SURFACE,
          border: CARD_BORDER,
          borderRadius: RADIUS_LG,
          padding: "12px 14px",
          marginBottom: 14,
          fontSize: 13,
          color: TEXT_SECONDARY,
          lineHeight: 1.55,
          ...BODY,
        }}
      >
        Off days = <b style={{ color: TEXT_PRIMARY }}>calisthenics + this mobility list</b>. 2–3 rounds of
        pull-ups / push-ups / dips, always 2+ reps from failure — it's skill work, not a fourth workout.
      </div>

      <div style={{ ...FONT, fontSize: 18, fontWeight: 700, marginBottom: 8, color: TEXT_PRIMARY }}>
        Mobility · ~12 min daily
      </div>
      {MOBILITY.map((m) => (
        <OffRow key={m.n} item={m} onOpenExercise={onOpenExercise} color={color} />
      ))}

      <div style={{ height: 16 }} />

      <div style={{ ...FONT, fontSize: 18, fontWeight: 700, marginBottom: 4, color: TEXT_PRIMARY }}>
        Cardio finisher · gym days only
      </div>
      <div style={{ ...BODY, fontSize: 12.5, color: TEXT_SECONDARY, marginBottom: 8 }}>
        Legs-only on purpose so arms/shoulders stay fresh for calisthenics. Do it after training, not on off days.
      </div>
      {FINISHERS.map((f) => (
        <OffRow key={f.n} item={f} onOpenExercise={onOpenExercise} color={color} />
      ))}
    </>
  );
}
