// Double-progression suggester (see App.jsx RULES: "Double progression").
// The app only tracks a binary per-set done/not-done tick, never literal rep counts,
// so "completed every set this session" is used as the practical stand-in for
// "hit the top of the rep range on every set" — the real trigger for a weight bump.
export function suggestNextWeight(slot, weight, doneCount) {
  if (!weight || doneCount === 0 || doneCount < slot.s || weight >= slot.max) return null;

  const next = Math.min(slot.max, Math.round((weight + slot.step) / slot.step) * slot.step);
  if (next <= weight) return null;

  return { suggest: next, reason: "All sets done — try " + next + " kg next time" };
}
