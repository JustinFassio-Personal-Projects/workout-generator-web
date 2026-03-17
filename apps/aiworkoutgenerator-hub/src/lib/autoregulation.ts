import type { WeightSelection } from "@/types/autoregulation";

export function getRpeLabel(rpe: number): string {
  if (rpe <= 4) return "Recovery / Warm-up pace";
  if (rpe <= 6) return "Challenging but comfortable (Maintenance)";
  if (rpe <= 8) return "Hard. 2-3 reps left in the tank (Hypertrophy Zone)";
  return "Maximal Effort. Failure reached (Strength/Peaking)";
}

export const WEIGHT_SELECTION_LABELS: Record<WeightSelection, string> = {
  too_light: "Too Light",
  perfect: "Perfect",
  too_heavy: "Too Heavy",
};

export const SESSION_FEEDBACK_LABELS: Record<string, string> = {
  ran_out_of_time: "Ran out of time",
  joint_tendon_pain: "Joint/Tendon Pain",
  high_energy: "High Energy / Felt Strong",
  low_energy: "Low Energy / Sluggish",
  equipment_busy: "Equipment Busy",
};

export const SESSION_FEEDBACK_OPTIONS = [
  { value: "ran_out_of_time", label: SESSION_FEEDBACK_LABELS.ran_out_of_time },
  {
    value: "joint_tendon_pain",
    label: SESSION_FEEDBACK_LABELS.joint_tendon_pain,
  },
  { value: "high_energy", label: SESSION_FEEDBACK_LABELS.high_energy },
  { value: "low_energy", label: SESSION_FEEDBACK_LABELS.low_energy },
  { value: "equipment_busy", label: SESSION_FEEDBACK_LABELS.equipment_busy },
] as const;

/** Modal uses 0=Too Light, 1=Perfect, 2=Too Heavy. */
export const WEIGHT_INDEX_LABELS: [string, string, string] = [
  "Too Light",
  "Perfect",
  "Too Heavy",
];

export function weightIndexToSelection(i: number): WeightSelection {
  if (i === 0) return "too_light";
  if (i === 2) return "too_heavy";
  return "perfect";
}

export function weightSelectionToIndex(
  selection: WeightSelection | null | undefined
): number {
  if (selection === "too_light") return 0;
  if (selection === "too_heavy") return 2;
  return 1; // default to "perfect"
}

/** Type guard: true if value is a valid WeightSelection (non-null and one of the three allowed values). */
export function isValidWeightSelection(
  weight: WeightSelection | null | undefined
): weight is WeightSelection {
  return (
    weight != null &&
    (weight === "too_light" || weight === "perfect" || weight === "too_heavy")
  );
}
