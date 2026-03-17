import type { Timestamp } from "firebase/firestore";

/**
 * Trainer IDs for the 6 AI trainer personas.
 * Used as document IDs in Firestore and for type safety.
 */
export type TrainerId =
  | "marcus_chen"
  | "rivera_santos"
  | "alex_kim"
  | "jordan_williams"
  | "elena_popov"
  | "ryder_cross";

/**
 * Focus area that a trainer specializes in.
 * Each trainer has one primary focus and 2-3 secondary focuses.
 */
export interface TrainerFocus {
  id: string;
  name: string;
  icon: string;
  isPrimary: boolean;
}

/**
 * Complete trainer persona definition.
 * Stored in Firestore `trainers` collection.
 */
export interface Trainer {
  id: TrainerId;
  name: string;
  nickname: string;
  tagline: string;
  description: string;
  philosophy: string;
  personality: string;
  imageUrl: string | null;
  // Admin-compatible fields (optional, snake_case in Firestore)
  profile_image_url?: string | null;
  profile_image_storage_path?: string | null;
  banner_image_url?: string | null;
  banner_image_storage_path?: string | null;
  prompt_set_id?: string | null;
  prompt_injections?: string[];
  accentColor: string;
  borderColor: string;
  focuses: TrainerFocus[];
  stats: {
    workoutsGenerated: number;
    avgRating: number;
  };
  recommendedFor: string[]; // Goal IDs for smart recommendations
  isActive: boolean;
  displayOrder: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Trainer data for seeding/static use (without Firestore timestamps).
 */
export type TrainerSeedData = Omit<Trainer, "createdAt" | "updatedAt">;

/**
 * All available focus IDs across all trainers.
 * Maps to the original 16 workout types.
 */
export type FocusId =
  | "strength_training"
  | "powerlifting"
  | "functional_fitness"
  | "core_abs"
  | "cardio"
  | "hiit"
  | "circuit_training"
  | "sports_specific"
  | "yoga"
  | "flexibility_mobility"
  | "pilates"
  | "stretching_recovery"
  | "bodyweight_training"
  | "calisthenics"
  | "crossfit_style"
  | "dance_fitness";

/**
 * Mapping of user fitness goals to recommended trainers.
 * Used for smart recommendations on the Generate page.
 */
export const GOAL_TO_TRAINER_MAP: Record<string, TrainerId> = {
  build_muscle: "marcus_chen",
  gain_strength: "marcus_chen",
  lose_weight: "rivera_santos",
  improve_cardio: "rivera_santos",
  increase_flexibility: "alex_kim",
  reduce_stress: "alex_kim",
  general_fitness: "jordan_williams",
  stay_active: "jordan_williams",
  tone_body: "elena_popov",
  improve_posture: "elena_popov",
  athletic_performance: "ryder_cross",
  build_endurance: "ryder_cross",
};

/**
 * Static trainer data for all 6 AI trainers.
 * This is the source of truth for seeding Firestore.
 */
export const TRAINERS: TrainerSeedData[] = [
  {
    id: "marcus_chen",
    name: "Marcus Chen",
    nickname: "The Foundation",
    tagline: "Build unshakeable strength from the ground up",
    description:
      "Former collegiate athlete turned strength coach with a focus on compound movements and progressive overload.",
    philosophy:
      "Compound movements, progressive overload, consistency over intensity",
    personality:
      "Calm, methodical, encouraging. Loves deadlifts, progressive overload, and meal prep Sundays.",
    imageUrl: null,
    accentColor: "bg-blue-500/20",
    borderColor: "border-blue-500",
    focuses: [
      {
        id: "strength_training",
        name: "Strength Training",
        icon: "💪",
        isPrimary: true,
      },
      {
        id: "powerlifting",
        name: "Powerlifting",
        icon: "🏋️",
        isPrimary: false,
      },
      {
        id: "functional_fitness",
        name: "Functional Fitness",
        icon: "🎯",
        isPrimary: false,
      },
      { id: "core_abs", name: "Core & Abs", icon: "🎪", isPrimary: false },
    ],
    stats: { workoutsGenerated: 12847, avgRating: 4.8 },
    recommendedFor: ["build_muscle", "gain_strength"],
    isActive: true,
    displayOrder: 1,
  },
  {
    id: "rivera_santos",
    name: "Rivera Santos",
    nickname: "The Engine",
    tagline: "Cardiovascular power meets mental toughness",
    description:
      "Marathon runner and triathlete who believes your heart is your most important muscle.",
    philosophy: "Your heart is your most important muscle—train it smart",
    personality:
      "Dynamic, high-energy, motivating. Runs 50+ miles/week, believes rest days are sacred.",
    imageUrl: null,
    accentColor: "bg-orange-500/20",
    borderColor: "border-orange-500",
    focuses: [
      { id: "cardio", name: "Cardio", icon: "🏃", isPrimary: true },
      { id: "hiit", name: "HIIT", icon: "🔥", isPrimary: false },
      {
        id: "circuit_training",
        name: "Circuit Training",
        icon: "🔄",
        isPrimary: false,
      },
      {
        id: "sports_specific",
        name: "Sports-Specific Training",
        icon: "⚽",
        isPrimary: false,
      },
    ],
    stats: { workoutsGenerated: 9523, avgRating: 4.7 },
    recommendedFor: ["lose_weight", "improve_cardio"],
    isActive: true,
    displayOrder: 2,
  },
  {
    id: "alex_kim",
    name: "Alex Kim",
    nickname: "The Flow",
    tagline: "Mind, body, breath—unified strength",
    description:
      "500-hour certified yoga instructor and former dancer focused on flexibility and mental resilience.",
    philosophy: "Flexibility isn't just physical—it's mental resilience",
    personality:
      "Serene, mindful, patient. Breathwork enthusiast, former stress case turned zen warrior.",
    imageUrl: null,
    accentColor: "bg-purple-500/20",
    borderColor: "border-purple-500",
    focuses: [
      { id: "yoga", name: "Yoga", icon: "🧘", isPrimary: true },
      {
        id: "flexibility_mobility",
        name: "Flexibility & Mobility",
        icon: "🤸",
        isPrimary: false,
      },
      { id: "pilates", name: "Pilates", icon: "🩰", isPrimary: false },
      {
        id: "stretching_recovery",
        name: "Stretching & Recovery",
        icon: "💆",
        isPrimary: false,
      },
    ],
    stats: { workoutsGenerated: 7891, avgRating: 4.9 },
    recommendedFor: ["increase_flexibility", "reduce_stress"],
    isActive: true,
    displayOrder: 3,
  },
  {
    id: "jordan_williams",
    name: "Jordan Williams",
    nickname: "The Nomad",
    tagline: "Zero equipment, infinite possibilities",
    description:
      "Digital nomad with military background, specializing in calisthenics and bodyweight training.",
    philosophy: "Your body is the only gym you'll ever need",
    personality:
      "Adventurous, resourceful, practical. Has trained in 47 countries with just a backpack.",
    imageUrl: null,
    accentColor: "bg-green-500/20",
    borderColor: "border-green-500",
    focuses: [
      {
        id: "bodyweight_training",
        name: "Bodyweight Training",
        icon: "🤾",
        isPrimary: true,
      },
      {
        id: "calisthenics",
        name: "Calisthenics",
        icon: "🎪",
        isPrimary: false,
      },
      { id: "hiit", name: "HIIT (Bodyweight)", icon: "🔥", isPrimary: false },
      {
        id: "functional_fitness",
        name: "Functional Fitness",
        icon: "🎯",
        isPrimary: false,
      },
    ],
    stats: { workoutsGenerated: 11234, avgRating: 4.8 },
    recommendedFor: ["general_fitness", "stay_active"],
    isActive: true,
    displayOrder: 4,
  },
  {
    id: "elena_popov",
    name: "Elena Popov",
    nickname: "The Sculptor",
    tagline: "Precision movements, powerful results",
    description:
      "Former ballet dancer and Pilates master trainer focused on control and sustainable transformation.",
    philosophy: "Control and form create sustainable transformation",
    personality:
      "Precise, elegant, detail-oriented. Believes every rep counts, precision over speed.",
    imageUrl: null,
    accentColor: "bg-pink-500/20",
    borderColor: "border-pink-500",
    focuses: [
      { id: "pilates", name: "Pilates", icon: "🩰", isPrimary: true },
      { id: "core_abs", name: "Core & Abs", icon: "🎪", isPrimary: false },
      {
        id: "flexibility_mobility",
        name: "Flexibility & Mobility",
        icon: "🤸",
        isPrimary: false,
      },
      {
        id: "circuit_training",
        name: "Circuit Training (Fusion)",
        icon: "🔄",
        isPrimary: false,
      },
    ],
    stats: { workoutsGenerated: 6789, avgRating: 4.9 },
    recommendedFor: ["tone_body", "improve_posture"],
    isActive: true,
    displayOrder: 5,
  },
  {
    id: "ryder_cross",
    name: "Ryder Cross",
    nickname: "The Maverick",
    tagline: "High-octane workouts for the bold",
    description:
      "CrossFit competitor and obstacle course racer who embraces the grind.",
    philosophy: "Comfortable is the enemy of growth—embrace the grind",
    personality:
      "Intense, competitive, bold. Thinks burpees are gifts from the fitness gods.",
    imageUrl: null,
    accentColor: "bg-red-500/20",
    borderColor: "border-red-500",
    focuses: [
      {
        id: "crossfit_style",
        name: "CrossFit-Style",
        icon: "💯",
        isPrimary: true,
      },
      { id: "hiit", name: "HIIT", icon: "🔥", isPrimary: false },
      {
        id: "circuit_training",
        name: "Circuit Training",
        icon: "🔄",
        isPrimary: false,
      },
      {
        id: "functional_fitness",
        name: "Functional Fitness",
        icon: "🎯",
        isPrimary: false,
      },
    ],
    stats: { workoutsGenerated: 8456, avgRating: 4.7 },
    recommendedFor: ["athletic_performance", "build_endurance"],
    isActive: true,
    displayOrder: 6,
  },
];

/**
 * Get a trainer by ID from static data.
 */
export function getTrainerById(id: TrainerId): TrainerSeedData | undefined {
  return TRAINERS.find((t) => t.id === id);
}

/**
 * Get recommended trainer ID based on user's fitness goals.
 */
export function getRecommendedTrainer(goals: string[]): TrainerId | null {
  for (const goal of goals) {
    const trainerId = GOAL_TO_TRAINER_MAP[goal];
    if (trainerId) {
      return trainerId;
    }
  }
  return null;
}
