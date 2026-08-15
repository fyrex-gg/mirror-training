// Program data: 2-1-2-2 split, chest & back 2x/week, legs light once/week.
// Extracted from App.jsx so both the legacy tick-based Train tab and the new
// WorkoutEngine can import it without a circular dependency between the two
// (App.jsx renders WorkoutEngine, so WorkoutEngine can't import back from App.jsx).
export const SESSIONS = [
  {
    id: "pushA", name: "Push A", sub: "Day 1 · Chest · Side/Rear Delts · Triceps", color: "#D64545",
    muscles: ["chest", "delts", "triceps"],
    slots: [
      { s: 4, r: "8-10", min: 15, max: 140, step: 2.5, vars: [
        { n: "Incline Dumbbell Press", note: "~30° bench, deep stretch, upper-chest bias" },
        { n: "Incline Machine Press", note: "Fixed path, joint-friendly" },
        { n: "Smith Machine Incline Press", note: "Stable bar path" }]},
      { s: 3, r: "12-15", min: 5, max: 100, step: 2.5, vars: [
        { n: "Pec Deck Fly", note: "Squeeze 1s at the peak — highest pec isolation" },
        { n: "Cable Crossover (high-to-low)", note: "Constant tension through the stretch" },
        { n: "Dumbbell Fly", note: "Soft elbows, big stretch" }]},
      { s: 4, r: "12-15", min: 2.5, max: 30, step: 1.25, vars: [
        { n: "Cable Lateral Raise", note: "Strict, no swing — constant tension" },
        { n: "Dumbbell Lateral Raise", note: "Lead with elbows" },
        { n: "Machine Lateral Raise", note: "Pause at the top" }]},
      { s: 3, r: "15", min: 5, max: 70, step: 2.5, vars: [
        { n: "Reverse Pec Deck", note: "Top pick for rear delts — arms long, no shrug" },
        { n: "Reverse Cable Fly", note: "Cross the cables" },
        { n: "Face Pull", note: "Pull to eyebrows, rotate out" }]},
      { s: 3, r: "10-12", min: 5, max: 70, step: 2.5, vars: [
        { n: "Overhead Cable Triceps Ext.", note: "Deep stretch — biases the long head" },
        { n: "Single-Arm OH Dumbbell Ext.", note: "Elbow points up" },
        { n: "EZ-Bar Skullcrusher", note: "Lower behind the head" }]},
      { s: 3, r: "12", min: 5, max: 80, step: 2.5, vars: [
        { n: "Rope Pushdown", note: "Split the rope at lockout" },
        { n: "Bar Pushdown", note: "Elbows pinned" },
        { n: "Dip Machine", note: "Slight forward lean" }]},
    ],
  },
  {
    id: "pullA", name: "Pull A", sub: "Day 2 · Back · Biceps · Abs", color: "#E5B93C",
    muscles: ["lats", "traps", "biceps", "forearms", "abs"],
    slots: [
      { s: 4, r: "8-10", min: 20, max: 140, step: 2.5, vars: [
        { n: "Wide-Grip Lat Pulldown", note: "Width focus" },
        { n: "Assisted Pull-Up", note: "Full hang each rep" },
        { n: "Single-Arm Pulldown", note: "Big stretch at the top" }]},
      { s: 4, r: "8-10", min: 20, max: 140, step: 2.5, vars: [
        { n: "Chest-Supported Row", note: "No torso momentum, spares the lower back" },
        { n: "Seated Cable Row", note: "Squeeze shoulder blades" },
        { n: "Single-Arm Dumbbell Row", note: "Full stretch each rep" }]},
      { s: 3, r: "12-15", min: 10, max: 90, step: 2.5, vars: [
        { n: "Straight-Arm Pulldown", note: "True lat isolation, strong stretch" },
        { n: "Cable Pullover", note: "Arms long, ribs down" },
        { n: "Dumbbell Pullover", note: "Stretch over the bench" }]},
      { s: 3, r: "10-12", min: 5, max: 40, step: 1.25, vars: [
        { n: "Incline Dumbbell Curl", note: "Lengthened-position bias — top pick" },
        { n: "Cable Curl", note: "Constant tension" },
        { n: "Preacher Curl (full extension)", note: "Loads the stretch" }]},
      { s: 3, r: "12", min: 5, max: 60, step: 2.5, vars: [
        { n: "EZ-Bar Curl", note: "Elbows pinned at your sides" },
        { n: "Hammer Curl", note: "Neutral grip, brachialis + forearms" },
        { n: "Reverse Curl", note: "Forearms + brachialis" }]},
      { s: 3, r: "10-15", min: 0, max: 40, step: 2.5, vars: [
        { n: "Hanging Leg Raise", note: "High activation of lower abs" },
        { n: "Cable Crunch", note: "Round the spine, hips still" },
        { n: "Ab Wheel", note: "Don't let the hips sag" }]},
    ],
  },
  {
    id: "pushB", name: "Push B", sub: "Day 3 · Chest · Shoulders · Arms (variation)", color: "#47A96B",
    muscles: ["chest", "delts", "biceps", "triceps"],
    slots: [
      { s: 4, r: "10-12", min: 15, max: 140, step: 2.5, vars: [
        { n: "Flat Machine Chest Press", note: "Different angle from Day 1's incline" },
        { n: "Flat Dumbbell Press", note: "Natural shoulder path" },
        { n: "Smith Machine Flat Press", note: "Stable bar path" }]},
      { s: 3, r: "12-15", min: 5, max: 100, step: 2.5, vars: [
        { n: "Cable Crossover (mid)", note: "Mid-chest stretch, different angle to Day 1" },
        { n: "Pec Deck Fly", note: "Squeeze at the peak" },
        { n: "Dumbbell Fly", note: "Deep stretch" }]},
      { s: 3, r: "10-12", min: 10, max: 60, step: 2.5, vars: [
        { n: "Seated DB Shoulder Press", note: "Front delt — joint-friendly overhead work" },
        { n: "Machine Shoulder Press", note: "Fixed path" },
        { n: "Arnold Press", note: "Full rotation through the range" }]},
      { s: 3, r: "12-15", min: 2.5, max: 30, step: 1.25, vars: [
        { n: "Dumbbell Lateral Raise (lean-away)", note: "Different loading curve to Day 1's cable" },
        { n: "Cable Lateral Raise (behind body)", note: "Loads the stretched position" },
        { n: "Machine Lateral Raise", note: "Pause at the top" }]},
      { s: 3, r: "10", min: 5, max: 40, step: 1.25, vars: [
        { n: "Preacher Curl", note: "No shoulder drift — second angle for biceps" },
        { n: "Spider Curl", note: "Strict, no swing" },
        { n: "Machine Curl", note: "Slow negatives" }]},
      { s: 3, r: "12", min: 5, max: 70, step: 2.5, vars: [
        { n: "Overhead Rope Extension", note: "Second triceps angle — long-head stretch" },
        { n: "Rope Pushdown", note: "Constant tension through lockout" },
        { n: "Close-Grip Push-Up / Dip", note: "Bodyweight option" }]},
    ],
  },
  {
    id: "pullB", name: "Pull B", sub: "Day 4 · Back · Light Legs · Core", color: "#3E7BD6",
    muscles: ["lats", "traps", "quads", "hams", "glutes", "abs"],
    slots: [
      { s: 3, r: "10-12", min: 20, max: 140, step: 2.5, vars: [
        { n: "Neutral-Grip Lat Pulldown", note: "Different grip from Day 2's wide grip" },
        { n: "Machine High Row", note: "Upper-back focus" },
        { n: "Straight-Arm Pulldown", note: "Lat isolation" }]},
      { s: 3, r: "10-12", min: 20, max: 140, step: 2.5, vars: [
        { n: "Seated Cable Row", note: "Thickness, controlled tempo" },
        { n: "Chest-Supported Row", note: "Spares the lower back" },
        { n: "Machine Row", note: "Chest stays on the pad" }]},
      { s: 3, r: "15-20", min: 5, max: 45, step: 2.5, vars: [
        { n: "Leg Extension (partial arc)", note: "Light load, pain-free range — no axial loading" },
        { n: "Sissy Squat (assisted)", note: "Bodyweight-scale quad work" }]},
      { s: 3, r: "15-20", min: 5, max: 45, step: 2.5, vars: [
        { n: "Seated Leg Curl", note: "Light load, isolates hamstrings, no spinal load" },
        { n: "Lying Leg Curl", note: "Hips stay down" }]},
      { s: 3, r: "12-20", min: 10, max: 90, step: 5, vars: [
        { n: "Hip Thrust", note: "Load on hips not spine — glutes/hams, moderate load" },
        { n: "Glute Bridge", note: "Bodyweight-scale option" },
        { n: "Cable Pull-Through", note: "Hip hinge, spine-friendly" }]},
      { s: 3, r: "12-15", min: 0, max: 40, step: 2.5, vars: [
        { n: "Cable Crunch", note: "Second ab angle to Day 2" },
        { n: "Weighted Sit-Up", note: "Full range" },
        { n: "Reverse Crunch", note: "Lower-ab bias" }]},
    ],
  },
];

export const SCHEDULE_NOTE = "2-1-2-2: Day 1 → Day 2 → rest → Day 3 → Day 4 → rest → rest (e.g. Mon/Tue train, Wed off, Thu/Fri train, Sat/Sun off).";
export const DELOAD_WEEKS = [4, 8, 12];
