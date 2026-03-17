import {
  FileText,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Target,
  Combine,
  Dumbbell,
  GraduationCap,
  ArrowLeftRight,
  Link,
  Scale,
  Wrench,
  User,
  Home,
  Cog,
  Search,
  Zap,
  Shield,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import type { EditMode, AISwapConstraints } from "@/types/ai-exercise-editor";

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  mode: EditMode;
  defaultPrompt?: string; // If no input required
  requiresInput?: boolean; // If true, user must provide additional input
  inputPlaceholder?: string; // Placeholder for input field when requiresInput is true
}

/**
 * Pre-configured quick actions for AI exercise editing.
 * Each action has a specific mode and may require user input.
 */
export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "add_detail",
    label: "Add Detail",
    icon: FileText,
    description: "Expand with step-by-step instructions",
    mode: "add_detail",
    defaultPrompt:
      "Add more detailed step-by-step instructions suitable for my fitness level",
  },
  {
    id: "make_easier",
    label: "Make Easier",
    icon: TrendingDown,
    description: "Reduce difficulty",
    mode: "adjust_difficulty",
    defaultPrompt: "Make this exercise easier for a beginner",
  },
  {
    id: "make_harder",
    label: "Make Harder",
    icon: TrendingUp,
    description: "Increase challenge",
    mode: "adjust_difficulty",
    defaultPrompt:
      "Make this exercise more challenging for an advanced athlete",
  },
  {
    id: "modify_injury",
    label: "Injury Modification",
    icon: AlertCircle,
    description: "Adapt for injury",
    mode: "modify_for_injury",
    requiresInput: true,
    inputPlaceholder:
      "Which injury or limitation? (e.g., 'sore right shoulder')",
  },
  {
    id: "improve_cues",
    label: "Better Cues",
    icon: Target,
    description: "Rewrite form cues",
    mode: "rewrite_cues",
    defaultPrompt:
      "Rewrite the technique cues to be clearer and more actionable for my fitness level",
  },
  {
    id: "create_complex",
    label: "Create Complex",
    icon: Combine,
    description: "Combine exercises",
    mode: "create_complex",
    requiresInput: true,
    inputPlaceholder: "Combine with which movement? (e.g., 'push-up')",
  },
  {
    id: "change_equipment",
    label: "Change Equipment",
    icon: Dumbbell,
    description: "Use different equipment",
    mode: "adjust_equipment",
    requiresInput: true,
    inputPlaceholder: "What equipment to use instead?",
  },
  // {
  //   id: "better_images",
  //   label: "Better Images",
  //   icon: Image,
  //   description: "Regenerate images",
  //   mode: "update_images",
  //   requiresInput: true,
  //   inputPlaceholder: "Image requirements (e.g., 'side angle view')",
  // },
  {
    id: "coach_explain",
    label: "Coach Explain",
    icon: GraduationCap,
    description: "Get personalized exercise breakdown",
    mode: "coach_explain",
  },
];

/**
 * Get a quick action by ID.
 */
export function getQuickAction(id: string): QuickAction | undefined {
  return QUICK_ACTIONS.find((action) => action.id === id);
}

export interface SwapOption {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  defaultReason?: string;
  requiresInput?: boolean;
  constraintPreset?: Partial<AISwapConstraints>;
}

/**
 * Pre-configured swap options for AI exercise swap.
 * Mirrors Quick Actions layout; options map to reason + optional constraint presets.
 */
export const SWAP_OPTIONS: SwapOption[] = [
  {
    id: "opposing_movement",
    label: "Opposing Movement",
    icon: ArrowLeftRight,
    description: "Swap push for pull",
    defaultReason: "Swap push for pull",
  },
  {
    id: "complementary",
    label: "Complementary Exercise",
    icon: Link,
    description: "Find pairing exercise",
    defaultReason: "Find pairing exercise",
  },
  {
    id: "same_muscle_group",
    label: "Same Muscle Group",
    icon: Target,
    description: "Different exercise, same muscles",
    defaultReason: "Different exercise, same muscles",
    constraintPreset: { same_muscle_group: true },
  },
  {
    id: "similar_difficulty",
    label: "Similar Difficulty",
    icon: Scale,
    description: "Keep challenge level",
    defaultReason: "Keep similar difficulty level",
    constraintPreset: { same_difficulty: true },
  },
  {
    id: "change_equipment",
    label: "Change Equipment",
    icon: Wrench,
    description: "Use different equipment",
    defaultReason: "Use different equipment",
    constraintPreset: { same_equipment: false },
  },
  {
    id: "bodyweight",
    label: "Bodyweight Alternative",
    icon: User,
    description: "No equipment needed",
    defaultReason: "Bodyweight alternative, no equipment needed",
    constraintPreset: { same_equipment: false },
  },
  {
    id: "home_gym",
    label: "Home Gym Friendly",
    icon: Home,
    description: "Minimal equipment version",
    defaultReason: "Home gym friendly, minimal equipment",
    constraintPreset: { same_equipment: false },
  },
  {
    id: "machine",
    label: "Machine Alternative",
    icon: Cog,
    description: "Guided movement option",
    defaultReason: "Machine alternative, guided movement",
  },
  {
    id: "search_by_name",
    label: "Search by Name",
    icon: Search,
    description: "Find specific exercise",
    requiresInput: true,
  },
  {
    id: "plyometric",
    label: "Plyometric",
    icon: Zap,
    description: "Explosive, jumping movements",
    defaultReason: "Plyometric alternative with explosive, jumping movements",
  },
  {
    id: "non_plyometric",
    label: "Non-Plyometric",
    icon: Shield,
    description: "Controlled, steady movements",
    defaultReason:
      "Non-plyometric alternative with controlled, steady movements",
  },
  {
    id: "environment_friendly",
    label: "Environment Friendly",
    icon: VolumeX,
    description:
      "Quiet version for apartments, hotels, or when others are sleeping",
    defaultReason:
      "Quiet, low-noise alternative for working out in apartments, hotels, or around sleeping children",
  },
];

/**
 * Get a swap option by ID.
 */
export function getSwapOption(id: string): SwapOption | undefined {
  return SWAP_OPTIONS.find((opt) => opt.id === id);
}
