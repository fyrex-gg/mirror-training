import { useState, useRef } from "react";
import { FONT } from "../tokens.js";

// Drag-to-scrub weight dial — extracted from App.jsx so both the legacy
// tick-based exercise cards and the new workout engine can share the exact
// same interaction without a circular import between the two.
export function WSlider({ value, min, max, step, onChange, color }) {
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
