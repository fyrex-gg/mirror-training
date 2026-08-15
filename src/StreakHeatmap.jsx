const FONT = { fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif" };
const CARD_BORDER = "1px solid rgba(255,255,255,0.055)";
const CELL = 22;

// Read-only GitHub-contribution-style grid: 12 weeks × N sessions, one cell per pair.
// Each cell's opacity encodes what fraction of that session's sets were completed that
// week, shaded with the session's own color so the four rows stay visually distinct.
export default function StreakHeatmap({ done, sessions, deloadWeeks, color }) {
  const weeks = Array.from({ length: 12 }, (_, i) => i + 1);

  const fractionFor = (session, week) => {
    const isDeload = deloadWeeks.includes(week);
    let total = 0;
    let got = 0;
    session.slots.forEach((slot, i) => {
      const target = isDeload ? 2 : slot.s;
      const count = done[week + "-" + session.id + "-" + i] || 0;
      total += target;
      got += Math.min(count, target);
    });
    return total > 0 ? got / total : 0;
  };

  return (
    <div style={{ background: "#1D2128", border: CARD_BORDER, borderRadius: 14, padding: 14 }}>
      <div style={{ ...FONT, fontSize: 13, fontWeight: 700, color: "#E8EAED", marginBottom: 10 }}>
        Consistency
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "72px repeat(12, " + CELL + "px)",
          gridAutoRows: CELL, gap: 4, alignItems: "center", width: "max-content" }}>

          {/* header row */}
          <div />
          {weeks.map((w) => {
            const dl = deloadWeeks.includes(w);
            return (
              <div key={"h" + w} style={{ fontSize: 9.5, textAlign: "center", color: dl ? "#B9BFC7" : "#5B626C",
                fontWeight: dl ? 700 : 400 }}>
                {w}
              </div>
            );
          })}

          {/* one row per session */}
          {sessions.map((session) => (
            <RowFragment key={session.id} session={session} weeks={weeks} deloadWeeks={deloadWeeks}
              fractionFor={fractionFor} fallbackColor={color} />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 10.5, color: "#5B626C" }}>
        <span>less</span>
        {[0.12, 0.35, 0.6, 1].map((f) => (
          <div key={f} style={{ width: 10, height: 10, borderRadius: 2, background: color, opacity: 0.12 + f * 0.88 }} />
        ))}
        <span>more</span>
        <span style={{ marginLeft: 8, borderBottom: "1px dashed #8A919C", paddingBottom: 1 }}>dashed = deload</span>
      </div>
    </div>
  );
}

// Split out only so each session contributes a label cell + 12 week cells as
// direct children of the parent CSS grid (grid layout requires flat children).
function RowFragment({ session, weeks, deloadWeeks, fractionFor, fallbackColor }) {
  const sessionColor = session.color || fallbackColor;
  return (
    <>
      <div style={{ fontSize: 11, color: "#8A919C", whiteSpace: "nowrap", overflow: "hidden",
        textOverflow: "ellipsis", paddingRight: 4 }}>
        {session.name}
      </div>
      {weeks.map((w) => {
        const dl = deloadWeeks.includes(w);
        const frac = fractionFor(session, w);
        return (
          <div key={session.id + "-" + w}
            title={session.name + " · Week " + w + " · " + Math.round(frac * 100) + "%"}
            style={{ width: CELL, height: CELL, borderRadius: 5,
              background: sessionColor,
              opacity: 0.12 + frac * 0.88,
              border: dl ? "1px dashed rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.04)",
              boxSizing: "border-box" }} />
        );
      })}
    </>
  );
}
