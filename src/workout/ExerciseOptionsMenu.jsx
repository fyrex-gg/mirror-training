import { useState } from "react";
import { X, Flame, TrendingDown, StickyNote, Trash2 } from "lucide-react";
import {
  FONT, BODY, SURFACE_ELEVATED, SURFACE_INTERACTIVE, CARD_BORDER,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY,
  ACCENT_SOFT, ACCENT_INK, RADIUS_MD, RADIUS_LG, RADIUS_XL, SPACE, TOUCH_MIN,
} from "../tokens.js";

// Bottom-sheet "⋮" menu for an in-progress exercise card. Handles the
// actions the main card UI has no room for: warm-up/drop-set shortcuts, a
// per-exercise note, and removing the exercise from today's session. Every
// callback here just fires the prop the caller gave us and closes — no set
// math or persistence lives in this file.
export default function ExerciseOptionsMenu({
  exerciseName,
  color,
  note,
  onAddWarmup,
  onAddDrop,
  onSaveNote,
  onRemove,
  onClose,
}) {
  const [noteText, setNoteText] = useState(note || "");
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  function handleAddWarmup() {
    onAddWarmup();
    onClose();
  }

  function handleAddDrop() {
    onAddDrop();
    onClose();
  }

  function handleSaveNote() {
    onSaveNote(noteText);
    onClose();
  }

  function handleRemoveTap() {
    if (!confirmingRemove) {
      setConfirmingRemove(true);
      return;
    }
    onRemove();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={exerciseName + " options"}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...BODY,
          background: SURFACE_ELEVATED,
          border: CARD_BORDER,
          borderBottom: "none",
          borderRadius: RADIUS_XL + " " + RADIUS_XL + " 0 0",
          width: "100%",
          maxWidth: 480,
          maxHeight: "85vh",
          overflowY: "auto",
          padding: SPACE.lg + "px " + SPACE.lg + "px " + (SPACE.xxl + 8) + "px",
          color: TEXT_PRIMARY,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: SPACE.md }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", color: TEXT_TERTIARY }}>
              Exercise options
            </div>
            <div style={{ ...FONT, fontSize: 19, fontWeight: 800, color, marginTop: 2 }}>{exerciseName}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: SURFACE_INTERACTIVE,
              border: CARD_BORDER,
              borderRadius: RADIUS_MD,
              width: TOUCH_MIN,
              height: TOUCH_MIN,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: TEXT_SECONDARY,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Add warm-up set */}
        <button
          onClick={handleAddWarmup}
          style={{
            ...FONT,
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: SPACE.md,
            minHeight: TOUCH_MIN,
            marginTop: SPACE.lg,
            padding: SPACE.md,
            borderRadius: RADIUS_LG,
            border: CARD_BORDER,
            background: SURFACE_INTERACTIVE,
            color: TEXT_PRIMARY,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              width: 36, height: 36, borderRadius: RADIUS_MD, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: ACCENT_SOFT, color,
            }}
          >
            <Flame size={18} />
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 14.5, fontWeight: 700 }}>Add warm-up set</span>
            <span style={{ fontSize: 12, color: TEXT_TERTIARY, fontWeight: 500 }}>
              Lighter weight, doesn't count toward working volume
            </span>
          </span>
        </button>

        {/* Add drop set */}
        <button
          onClick={handleAddDrop}
          style={{
            ...FONT,
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: SPACE.md,
            minHeight: TOUCH_MIN,
            marginTop: SPACE.sm,
            padding: SPACE.md,
            borderRadius: RADIUS_LG,
            border: CARD_BORDER,
            background: SURFACE_INTERACTIVE,
            color: TEXT_PRIMARY,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              width: 36, height: 36, borderRadius: RADIUS_MD, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: ACCENT_SOFT, color,
            }}
          >
            <TrendingDown size={18} />
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 14.5, fontWeight: 700 }}>Add drop set</span>
            <span style={{ fontSize: 12, color: TEXT_TERTIARY, fontWeight: 500 }}>
              Same reps, straight after your last set, at a reduced weight
            </span>
          </span>
        </button>

        {/* Note */}
        <div style={{ marginTop: SPACE.xl }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: SPACE.sm }}>
            <StickyNote size={14} color={TEXT_SECONDARY} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: TEXT_SECONDARY }}>Note</span>
          </div>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            placeholder="Add a note for this exercise (form cue, equipment number, how it felt)…"
            style={{
              ...BODY,
              width: "100%",
              boxSizing: "border-box",
              resize: "vertical",
              background: SURFACE_INTERACTIVE,
              border: CARD_BORDER,
              borderRadius: RADIUS_MD,
              color: TEXT_PRIMARY,
              fontSize: 14,
              padding: SPACE.md,
              lineHeight: 1.5,
            }}
          />
          <button
            onClick={handleSaveNote}
            style={{
              ...FONT,
              width: "100%",
              minHeight: TOUCH_MIN,
              marginTop: SPACE.sm,
              borderRadius: RADIUS_MD,
              border: "none",
              cursor: "pointer",
              fontSize: 14.5,
              fontWeight: 700,
              background: color,
              color: ACCENT_INK,
            }}
          >
            Save note
          </button>
        </div>

        {/* Remove exercise */}
        <div style={{ marginTop: SPACE.xxl, paddingTop: SPACE.lg, borderTop: CARD_BORDER }}>
          {!confirmingRemove ? (
            <div
              onClick={handleRemoveTap}
              role="button"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                color: "#D64545",
                cursor: "pointer",
                padding: SPACE.md,
                minHeight: TOUCH_MIN,
              }}
            >
              <Trash2 size={16} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Remove exercise from today</span>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: SPACE.md,
                padding: SPACE.md,
              }}
            >
              <button
                onClick={() => setConfirmingRemove(false)}
                style={{
                  ...BODY,
                  fontSize: 13.5,
                  fontWeight: 600,
                  minHeight: TOUCH_MIN,
                  padding: "8px 14px",
                  borderRadius: RADIUS_MD,
                  border: CARD_BORDER,
                  background: SURFACE_INTERACTIVE,
                  color: TEXT_PRIMARY,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveTap}
                style={{
                  ...BODY,
                  fontSize: 13.5,
                  fontWeight: 700,
                  minHeight: TOUCH_MIN,
                  padding: "8px 14px",
                  borderRadius: RADIUS_MD,
                  border: "1px solid #D64545",
                  background: "transparent",
                  color: "#D64545",
                  cursor: "pointer",
                }}
              >
                Tap again to confirm
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
