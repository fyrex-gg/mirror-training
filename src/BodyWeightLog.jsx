import { useState } from "react";
import { Scale } from "lucide-react";

const FONT = { fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif" };
const CARD_BORDER = "1px solid rgba(255,255,255,0.055)";
const todayStr = () => new Date().toISOString().slice(0, 10);

// Body-weight log card: numeric input + "log today" button, a big current-value
// readout (styled like WSlider's number in App.jsx), and a hand-drawn SVG sparkline
// of the last ~14 entries — no chart library, same convention as MuscleMap.
export default function BodyWeightLog({ entries, setEntries, color }) {
  const [input, setInput] = useState("");

  const sorted = [...(entries || [])].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const latest = sorted[sorted.length - 1];
  const recent = sorted.slice(-14);

  const logToday = () => {
    const kg = parseFloat(input);
    if (!isFinite(kg) || kg <= 0) return;
    const today = todayStr();
    const idx = sorted.findIndex((e) => e.date === today);
    const next = idx >= 0
      ? sorted.map((e, i) => (i === idx ? { date: today, kg } : e))
      : [...sorted, { date: today, kg }];
    setEntries(next);
    setInput("");
  };

  return (
    <div style={{ background: "#1D2128", border: CARD_BORDER, borderRadius: 14, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Scale size={14} color={color} />
        <div style={{ ...FONT, fontSize: 13, fontWeight: 700, color: "#E8EAED" }}>Body weight</div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ ...FONT, fontSize: 34, fontWeight: 700, lineHeight: 1, color: "#E8EAED",
            fontVariantNumeric: "tabular-nums" }}>
            {latest ? latest.kg : "—"}
            <span style={{ fontSize: 15, color: "#8A919C", fontWeight: 600 }}> kg</span>
          </div>
          <div style={{ fontSize: 11, color: "#5B626C", marginTop: 3 }}>
            {latest ? "as of " + latest.date : "no entries yet"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="number"
          step="0.1"
          min="20"
          max="400"
          inputMode="decimal"
          placeholder="e.g. 82.4"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ ...FONT, flex: 1, minWidth: 0, background: "#14171C", border: "1px solid #333945",
            borderRadius: 10, padding: "9px 12px", fontSize: 15, color: "#E8EAED", fontVariantNumeric: "tabular-nums" }}
        />
        <button onClick={logToday}
          style={{ ...FONT, padding: "9px 14px", borderRadius: 10, border: "none", cursor: "pointer",
            fontSize: 13.5, fontWeight: 700, background: color, color: "#14171C", whiteSpace: "nowrap" }}>
          Log today's weight
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        {recent.length >= 2 ? (
          <Sparkline entries={recent} color={color} />
        ) : (
          <div style={{ fontSize: 11.5, color: "#5B626C" }}>
            Log a few more days to see a trend.
          </div>
        )}
      </div>
    </div>
  );
}

function Sparkline({ entries, color }) {
  const W = 260, H = 56, PAD = 6;
  const kgs = entries.map((e) => e.kg);
  const min = Math.min(...kgs), max = Math.max(...kgs);
  const range = max - min || 1;

  const points = entries.map((e, i) => {
    const x = PAD + (i / (entries.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((e.kg - min) / range) * (H - PAD * 2);
    return [x, y];
  });
  const polyStr = points.map((p) => p[0] + "," + p[1]).join(" ");
  const last = points[points.length - 1];

  return (
    <svg viewBox={"0 0 " + W + " " + H} width="100%" height={H} preserveAspectRatio="none"
      aria-label="Body weight trend, last 14 entries">
      <polyline points={polyStr} fill="none" stroke={color} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === points.length - 1 ? 3 : 1.6}
          fill={i === points.length - 1 ? color : "#5B626C"} />
      ))}
      {last && (
        <text x={last[0]} y={last[1] - 8} textAnchor="end" fontSize="9" fill="#8A919C" fontFamily="system-ui">
          {entries[entries.length - 1].kg}
        </text>
      )}
    </svg>
  );
}
