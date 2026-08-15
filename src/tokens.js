// Design tokens for Mirror's workout-engine screens (Home/Workout/History/Stats).
// Existing screens (Fuel/Off days/Rules, the original exercise cards) keep their
// proven inline colors — this file is additive, not a retrofit, so nothing
// already shipped shifts. New screens should pull from here.

export const FONT = { fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif" };
export const BODY = { fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" };

// Surface hierarchy — app background stays the existing #14171C so nothing
// already shipped shifts; the elevated/interactive tiers give real depth
// beyond the single flat card color the original screens use everywhere.
export const BG = "#14171C";
export const SURFACE = "#1B1F26";
export const SURFACE_ELEVATED = "#222730";
export const SURFACE_INTERACTIVE = "#292F39";
export const BORDER = "rgba(255,255,255,0.08)";
export const CARD_BORDER = "1px solid " + BORDER;

export const TEXT_PRIMARY = "#F5F7FA";
export const TEXT_SECONDARY = "#A8AFBA";
export const TEXT_TERTIARY = "#6F7783";
export const TEXT_DISABLED = "#4B525C";

// The single "this happened / do this now" accent — PRs, completed sets,
// primary CTAs, the active rest timer, selected nav. Deliberately separate
// from each session's own color (SESSIONS[].color in App.jsx), which still
// carries session identity on session tabs/headers/cards. Two different jobs:
// session color = "which day is this", accent = "act on this / you did this".
export const ACCENT = "#B8FF3D";
export const ACCENT_SOFT = "rgba(184,255,61,0.14)";
export const ACCENT_INK = "#14171C"; // text color when sitting on a solid ACCENT fill

export const RADIUS_SM = 10;
export const RADIUS_MD = 12;
export const RADIUS_LG = 16;
export const RADIUS_XL = 20;

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

export const TOUCH_MIN = 48;
export const TOUCH_PRIMARY = 56;

export const TYPE = {
  screenTitle: { ...FONT, fontSize: 28, fontWeight: 700 },
  sectionTitle: { ...FONT, fontSize: 18, fontWeight: 700 },
  exerciseTitle: { ...FONT, fontSize: 17, fontWeight: 700 },
  metricLarge: { ...FONT, fontSize: 36, fontWeight: 800, fontVariantNumeric: "tabular-nums" },
  value: { ...FONT, fontSize: 16, fontWeight: 600 },
  secondary: { ...BODY, fontSize: 13.5, fontWeight: 500 },
  meta: { ...BODY, fontSize: 11.5, fontWeight: 500, letterSpacing: 0.4, textTransform: "uppercase" },
};

export const MOTION = {
  setComplete: "120ms ease",
  card: "180ms ease",
  screen: "220ms ease",
};
