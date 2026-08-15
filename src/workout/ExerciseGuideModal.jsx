import { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import { FONT, BODY, CARD_BORDER } from "../tokens.js";
import EXERCISE_INFO from "../data/exerciseInfo.json";

const imgLink = (q) => "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(q);

// In-app exercise guide bottom sheet — extracted from App.jsx so both the
// legacy tick-based cards and the new workout engine can share it without a
// circular import between the two. Matched from the free-exercise-db public-
// domain dataset (see src/data/exerciseInfo.json) — only 54 of 72 exercises
// have a verified match, so callers should check EXERCISE_INFO[name] first
// and fall back to an external link when there's no entry.
export function ExerciseModal({ name, color, onClose }) {
  const info = EXERCISE_INFO[name];
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!info) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={name + " guide"} onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50,
        display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ ...BODY, background: "#1D2128", border: CARD_BORDER, borderBottom: "none",
          borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 480, maxHeight: "85vh",
          overflowY: "auto", padding: "18px 18px 28px", color: "#E8EAED" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ ...FONT, fontSize: 19, fontWeight: 800, color }}>{name}</div>
            <div style={{ fontSize: 11.5, color: "#8A919C", marginTop: 3, textTransform: "capitalize" }}>
              {[info.equipment, ...(info.primaryMuscles || [])].filter(Boolean).join(" · ")}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{ background: "#14171C", border: "1px solid #333945", borderRadius: 10, width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center", color: "#B9BFC7", cursor: "pointer",
              flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {info.images && info.images.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 14, overflowX: "auto" }} className="no-scrollbar">
            {info.images.map((src) => (
              <img key={src} src={src} alt="" loading="lazy"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
                style={{ height: 160, borderRadius: 10, background: "#14171C", flexShrink: 0 }} />
            ))}
          </div>
        )}

        <ol style={{ margin: "16px 0 0", padding: "0 0 0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {info.instructions.map((step, i) => (
            <li key={i} style={{ fontSize: 13.5, color: "#B9BFC7", lineHeight: 1.55, paddingLeft: 2 }}>{step}</li>
          ))}
        </ol>

        <a href={imgLink(name + " exercise proper form")} target="_blank" rel="noreferrer"
          style={{ fontSize: 11.5, color: "#5B626C", textDecoration: "none", fontWeight: 600,
            display: "inline-flex", alignItems: "center", gap: 3, marginTop: 16 }}>
          More examples <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}
