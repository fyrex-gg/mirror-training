// Hand-drawn muscle-group diagram — extracted from App.jsx so the new workout
// engine can reuse it without a circular import between the two.
export function MuscleMap({ highlight, color }) {
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
